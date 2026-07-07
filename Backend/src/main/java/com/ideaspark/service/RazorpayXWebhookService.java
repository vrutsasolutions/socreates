package com.ideaspark.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ideaspark.model.AuditLog;
import com.ideaspark.model.CreatorEarning;
import com.ideaspark.repository.AuditLogRepository;
import com.ideaspark.repository.CreatorEarningRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Processes incoming RazorpayX webhook calls for creator payouts. Mirrors
 * {@link RazorpayWebhookService} on the payments side, with the same rules:
 *
 *   1. Raw body + signature verified with HMAC-SHA256, constant-time compare.
 *   2. Bad signature -> 401, logged to audit_log, nothing else touched.
 *   3. Idempotent: replaying the same event never double-writes — the row
 *      transition from Pending → Paid (or Paid → Pending on reversal) is
 *      driven by the payout status, not by "have we seen this id before".
 *   4. Everything else happens inside one DB transaction.
 *   5. Always returns within the method (no slow work) so RazorpayX doesn't
 *      retry the delivery.
 *
 * Why this exists: {@link CreatorPayoutService#requestPayout} optimistically
 * flips the earning row to "Paid" the moment RazorpayX accepts the create-
 * payout call. But the payout is still asynchronous — it can later be
 * REVERSED (insufficient balance, bad account details, etc.). Without this
 * webhook, the DB would claim "Paid" for money that never actually left.
 * Here we listen for the terminal payout events and reconcile.
 *
 * Events we handle (subscribe to these in the RazorpayX dashboard):
 *   payout.processed  → confirm as Paid (usually a no-op, already Paid)
 *   payout.reversed   → roll row back to Pending, clear payout id + paid_at
 *   payout.failed     → same as reversed — the withdrawal never happened
 *   payout.updated    → informational, no state change unless status is terminal
 */
@Service
public class RazorpayXWebhookService {

    private final CreatorEarningRepository earningRepository;
    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${razorpayx.webhook-secret:}")
    private String webhookSecret;

    public RazorpayXWebhookService(CreatorEarningRepository earningRepository,
                                    AuditLogRepository auditLogRepository) {
        this.earningRepository = earningRepository;
        this.auditLogRepository = auditLogRepository;
    }

    public ResponseEntity<String> process(String rawPayload, String signature) {

        // ── 0. Webhook secret must be configured before we trust anything ──
        if (webhookSecret == null || webhookSecret.isBlank()) {
            // Don't 500 — RazorpayX will just retry forever. Log and 503 so
            // it's obvious in monitoring that config is missing.
            return ResponseEntity.status(503).body("RazorpayX webhook secret not configured");
        }

        // ── 1 & 2. Verify HMAC-SHA256 signature (constant-time compare) ──
        if (signature == null || !isValidSignature(rawPayload, signature)) {
            writeAudit(null, "INVALID_PAYOUT_WEBHOOK_SIGNATURE", "payout_webhook", null,
                    "{\"reason\":\"signature mismatch or missing header\"}");
            return ResponseEntity.status(401).body("Invalid signature");
        }

        // ── 3. Parse the event ──
        JsonNode root;
        try {
            root = objectMapper.readTree(rawPayload);
        } catch (Exception e) {
            writeAudit(null, "PAYOUT_WEBHOOK_PARSE_ERROR", "payout_webhook", null,
                    "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}");
            // Malformed body from a *signed* request shouldn't happen — still
            // 200 it so RazorpayX doesn't hammer retries on something we can't fix.
            return ResponseEntity.ok("Unparseable payload, logged");
        }

        String eventType = root.path("event").asText(null);
        JsonNode payoutEntity = root.path("payload").path("payout").path("entity");

        if (payoutEntity.isMissingNode() || payoutEntity.isNull()) {
            writeAudit(null, "PAYOUT_WEBHOOK_NO_ENTITY", "payout_webhook", eventType,
                    rawPayload.length() > 2000 ? null : rawPayload);
            return ResponseEntity.ok("No payout entity, acknowledged");
        }

        String payoutId     = payoutEntity.path("id").asText(null);
        String payoutStatus = payoutEntity.path("status").asText(null);
        String referenceId  = payoutEntity.path("reference_id").asText(null);

        if (payoutId == null) {
            writeAudit(null, "PAYOUT_WEBHOOK_MISSING_ID", "payout_webhook", eventType, null);
            return ResponseEntity.ok("Missing payout id, acknowledged");
        }

        // ── 4. Process in a transaction ──
        return handlePayoutEvent(eventType, payoutId, payoutStatus, referenceId, rawPayload);
    }

    @Transactional
    protected ResponseEntity<String> handlePayoutEvent(String eventType,
                                                       String payoutId,
                                                       String payoutStatus,
                                                       String referenceId,
                                                       String rawPayload) {

        // Locate the earning row. Prefer reference_id (= earning.id) because
        // we set it at payout-creation time and it's stable across retries;
        // fall back to the payout id we persisted after the create call.
        Optional<CreatorEarning> found = Optional.empty();
        if (referenceId != null && !referenceId.isBlank()) {
            try {
                found = earningRepository.findById(UUID.fromString(referenceId));
            } catch (IllegalArgumentException ignored) {
                // reference_id wasn't a UUID — fall through to payout-id lookup
            }
        }
        if (found.isEmpty()) {
            found = earningRepository.findByRazorpayPayoutId(payoutId);
        }

        if (found.isEmpty()) {
            // No matching row. Could be a payout initiated outside our app, or
            // one for a row that was later deleted. Never crash — audit and 200.
            writeAudit(null, "PAYOUT_WEBHOOK_UNMATCHED", "payout", payoutId,
                    "{\"event\":\"" + escapeJson(eventType) + "\","
                    + "\"reference_id\":\"" + escapeJson(referenceId) + "\"}");
            return ResponseEntity.ok("No matching earning row, logged");
        }

        CreatorEarning earning = found.get();
        String previousStatus  = earning.getStatus();
        String normalisedPayoutStatus = payoutStatus == null ? "" : payoutStatus.toLowerCase();

        // Map RazorpayX terminal statuses onto our internal Pending/Paid model.
        // Non-terminal statuses (queued, processing, pending) are no-ops — the
        // row is already "Paid" from the optimistic flip in CreatorPayoutService,
        // and we only want to move it based on a definitive outcome.
        boolean stateChanged = false;
        switch (normalisedPayoutStatus) {
            case "processed" -> {
                // Money actually left the RazorpayX account. Confirm as Paid.
                if (!"Paid".equalsIgnoreCase(earning.getStatus())) {
                    earning.setStatus("Paid");
                    stateChanged = true;
                }
                if (earning.getPaidAt() == null) {
                    earning.setPaidAt(LocalDateTime.now());
                    stateChanged = true;
                }
            }
            case "reversed", "failed", "cancelled", "rejected" -> {
                // The optimistic "Paid" flip in CreatorPayoutService was wrong —
                // undo it so the creator can withdraw again.
                if (!"Pending".equalsIgnoreCase(earning.getStatus())) {
                    earning.setStatus("Pending");
                    stateChanged = true;
                }
                if (earning.getRazorpayPayoutId() != null) {
                    earning.setRazorpayPayoutId(null);
                    stateChanged = true;
                }
                if (earning.getPaidAt() != null) {
                    earning.setPaidAt(null);
                    stateChanged = true;
                }
            }
            default -> {
                // queued / processing / pending / unknown — no state change
            }
        }

        // For terminal-success we still want the payout id stamped on the row
        // so we can trace back from RazorpayX. Skip on reversal (we just cleared it).
        if ("processed".equals(normalisedPayoutStatus)
                && !payoutId.equals(earning.getRazorpayPayoutId())) {
            earning.setRazorpayPayoutId(payoutId);
            stateChanged = true;
        }

        if (stateChanged) {
            earningRepository.save(earning);
        }

        UUID creatorId = earning.getCreator() != null ? earning.getCreator().getId() : null;
        writeAudit(creatorId,
                "PAYOUT_" + normalisedPayoutStatus.toUpperCase(),
                "payout", payoutId,
                "{\"event\":\"" + escapeJson(eventType) + "\","
                + "\"previous_status\":\"" + escapeJson(previousStatus) + "\","
                + "\"new_status\":\"" + escapeJson(earning.getStatus()) + "\","
                + "\"changed\":" + stateChanged + "}");

        return ResponseEntity.ok(stateChanged ? "OK" : "No-op, already in target state");
    }

    // ── HMAC-SHA256 verification, constant-time compare ──────────────────
    private boolean isValidSignature(String payload, String signature) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String expected = toHex(hash);
            return MessageDigest.isEqual(
                    expected.getBytes(StandardCharsets.UTF_8),
                    signature.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            return false;
        }
    }

    private String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(Character.forDigit((b >> 4) & 0xF, 16));
            sb.append(Character.forDigit(b & 0xF, 16));
        }
        return sb.toString();
    }

    private void writeAudit(UUID userId, String action, String entityType,
                             String entityId, String metadata) {
        try {
            auditLogRepository.save(AuditLog.builder()
                    .userId(userId)
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .metadata(metadata)
                    .build());
        } catch (Exception e) {
            // Audit logging must never break the webhook response itself.
        }
    }

    private String escapeJson(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}

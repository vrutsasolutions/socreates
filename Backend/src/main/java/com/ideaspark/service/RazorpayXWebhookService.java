package com.ideaspark.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ideaspark.model.AuditLog;
import com.ideaspark.repository.AuditLogRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

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
 *
 * NOTE: the DB-writing work (step 4) lives in the separate
 * {@link RazorpayPayoutWebhookHandler} bean, injected below, instead of a
 * private/protected method on this class — see that class's javadoc for why
 * (same @Transactional self-invocation issue as RazorpayWebhookService had).
 */
@Service
public class RazorpayXWebhookService {

    private final AuditLogRepository auditLogRepository;
    private final RazorpayPayoutWebhookHandler payoutWebhookHandler;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${razorpayx.webhook-secret:}")
    private String webhookSecret;

    public RazorpayXWebhookService(AuditLogRepository auditLogRepository,
                                    RazorpayPayoutWebhookHandler payoutWebhookHandler) {
        this.auditLogRepository = auditLogRepository;
        this.payoutWebhookHandler = payoutWebhookHandler;
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

        // ── 4. Process in a transaction — delegated to a separate bean so
        // @Transactional actually applies (see class javadoc). ──
        return payoutWebhookHandler.handlePayoutEvent(eventType, payoutId, payoutStatus, referenceId, rawPayload);
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

    private void writeAudit(java.util.UUID userId, String action, String entityType,
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

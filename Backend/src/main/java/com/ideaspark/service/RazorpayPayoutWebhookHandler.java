package com.ideaspark.service;

import com.ideaspark.model.AuditLog;
import com.ideaspark.model.CreatorEarning;
import com.ideaspark.repository.AuditLogRepository;
import com.ideaspark.repository.CreatorEarningRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Split out of {@link RazorpayXWebhookService} for the same reason
 * {@link RazorpayPaymentWebhookHandler} was split out of RazorpayWebhookService:
 * @Transactional only applies through Spring's proxy, and a same-object call
 * (this.handlePayoutEvent(...)) bypasses that proxy, so it was silently
 * running without a transaction. This is now a separate injected bean so the
 * call comes in from the outside and the transaction is genuinely applied.
 */
@Service
public class RazorpayPayoutWebhookHandler {

    private final CreatorEarningRepository earningRepository;
    private final AuditLogRepository auditLogRepository;

    public RazorpayPayoutWebhookHandler(CreatorEarningRepository earningRepository,
                                         AuditLogRepository auditLogRepository) {
        this.earningRepository = earningRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public ResponseEntity<String> handlePayoutEvent(String eventType,
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

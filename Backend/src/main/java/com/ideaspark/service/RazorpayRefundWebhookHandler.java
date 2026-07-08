package com.ideaspark.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.ideaspark.model.AuditLog;
import com.ideaspark.model.Membership;
import com.ideaspark.model.MembershipPayment;
import com.ideaspark.model.User;
import com.ideaspark.repository.AuditLogRepository;
import com.ideaspark.repository.MembershipPaymentRepository;
import com.ideaspark.repository.MembershipRepository;
import com.ideaspark.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Handles Razorpay refund.* webhook events (refund.created / refund.processed /
 * refund.failed). Split into its own @Transactional bean for the same reason as
 * {@link RazorpayPaymentWebhookHandler}: Spring's transaction advice only fires
 * on cross-bean, proxied calls, so the DB-writing work must live in a separate
 * injected bean rather than a private method on the dispatcher.
 *
 * Division of labour (see also {@link MembershipService#requestRefund}):
 *   - The self-service /api/payment/refund endpoint owns ACCESS revocation
 *     (cancel memberships + premium=false) the instant the user asks, so the UI
 *     updates immediately.
 *   - THIS handler owns the MONEY truth — it flips the MembershipPayment row to
 *     "refunded" only once Razorpay confirms the refund actually processed. That
 *     status is what {@code sumCapturedAmountBetween} excludes from the revenue
 *     pool, so it must reflect real money movement, not just an intent.
 *
 * refund.failed does NOT re-grant access — the user asked to leave; a failed
 * refund is a billing/ops problem, surfaced via the audit log, not a reason to
 * silently resurrect premium.
 */
@Service
public class RazorpayRefundWebhookHandler {

    private final MembershipPaymentRepository paymentRepository;
    private final MembershipRepository membershipRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public RazorpayRefundWebhookHandler(MembershipPaymentRepository paymentRepository,
                                        MembershipRepository membershipRepository,
                                        AuditLogRepository auditLogRepository,
                                        UserRepository userRepository) {
        this.paymentRepository = paymentRepository;
        this.membershipRepository = membershipRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public ResponseEntity<String> handleRefund(String eventType,
                                               JsonNode refundEntity,
                                               String razorpayPaymentId,
                                               String rawPayload) {

        String refundId = refundEntity.path("id").asText(null);
        String refundStatus = refundEntity.path("status").asText(null); // created | processed | failed
        long refundAmountPaise = refundEntity.path("amount").asLong(0);

        // The refund references the ORIGINAL payment id. If we never recorded
        // that payment, we've nothing to refund against — log for manual recon
        // rather than crashing (Membership.user is NOT NULL, so we can't invent
        // a row here anyway).
        Optional<MembershipPayment> paymentOpt =
                paymentRepository.findByGatewayPaymentId(razorpayPaymentId);
        if (paymentOpt.isEmpty()) {
            writeAudit(null, "WEBHOOK_REFUND_UNKNOWN_PAYMENT", "refund", refundId,
                    "{\"reason\":\"no membership_payment for this payment_id\","
                    + "\"payment_id\":\"" + escapeJson(razorpayPaymentId) + "\"}");
            return ResponseEntity.ok("Refund for unknown payment, acknowledged");
        }

        MembershipPayment payment = paymentOpt.get();
        UUID userId = payment.getUser().getId();

        // A refund that FAILED must not touch the payment status or access —
        // the money never moved, so this is still captured revenue.
        if ("refund.failed".equalsIgnoreCase(eventType)
                || "failed".equalsIgnoreCase(refundStatus)) {
            writeAudit(userId, "REFUND_FAILED", "refund", refundId,
                    "{\"payment_id\":\"" + escapeJson(razorpayPaymentId) + "\","
                    + "\"amount_paise\":" + refundAmountPaise + "}");
            return ResponseEntity.ok("Refund failed event logged");
        }

        // Idempotency: refund.created and refund.processed can BOTH arrive for
        // the same refund, and Razorpay retries deliveries. Once we've marked
        // the payment refunded, further refund events for it are no-ops.
        if ("refunded".equalsIgnoreCase(payment.getStatus())) {
            return ResponseEntity.ok("Already refunded");
        }

        payment.setStatus("refunded");
        payment.setWebhookReceived(true);
        paymentRepository.save(payment);

        // Belt-and-braces access revocation. The self-service endpoint usually
        // did this already; a dashboard-initiated refund (no app trigger) needs
        // it done here. Both are idempotent — canceling an already-canceled
        // membership and clearing an already-false premium are harmless.
        revokeAccess(payment.getUser());

        writeAudit(userId, "PAYMENT_REFUNDED", "refund", refundId,
                "{\"payment_id\":\"" + escapeJson(razorpayPaymentId) + "\","
                + "\"amount_paise\":" + refundAmountPaise + "}");

        return ResponseEntity.ok("OK");
    }

    /** Cancel every active membership for the user and drop premium. Idempotent. */
    private void revokeAccess(User user) {
        List<Membership> active =
                membershipRepository.findByUserIdAndStatus(user.getId(), "active");
        active.forEach(m -> m.setStatus("canceled"));
        membershipRepository.saveAll(active);

        user.setPremium(false);
        userRepository.save(user);
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

package com.ideaspark.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.ideaspark.model.AuditLog;
import com.ideaspark.model.Membership;
import com.ideaspark.model.MembershipPayment;
import com.ideaspark.repository.AuditLogRepository;
import com.ideaspark.repository.MembershipPaymentRepository;
import com.ideaspark.repository.MembershipRepository;
import com.ideaspark.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Split out of {@link RazorpayWebhookService} so that @Transactional actually
 * takes effect. Spring's transaction advice is applied via a JDK/CGLIB proxy
 * around the bean — it only intercepts calls that come in THROUGH that proxy.
 * A call from one method to another method on the *same* object (e.g.
 * {@code this.handleNewPayment(...)}) never goes through the proxy, so the
 * annotation is silently ignored and the "transactional" work actually runs
 * with no transaction at all.
 *
 * By moving the transactional work into its own bean and having
 * RazorpayWebhookService call it as an injected dependency (a real,
 * proxied, cross-bean call), @Transactional here is honored for real.
 */
@Service
public class RazorpayPaymentWebhookHandler {

    private final MembershipPaymentRepository paymentRepository;
    private final MembershipRepository membershipRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public RazorpayPaymentWebhookHandler(MembershipPaymentRepository paymentRepository,
                                          MembershipRepository membershipRepository,
                                          AuditLogRepository auditLogRepository,
                                          UserRepository userRepository) {
        this.paymentRepository = paymentRepository;
        this.membershipRepository = membershipRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public ResponseEntity<String> handleNewPayment(String eventType,
                                                    String razorpayPaymentId,
                                                    String razorpayOrderId,
                                                    String status,
                                                    String method,
                                                    long amountPaise,
                                                    JsonNode subscriptionEntity,
                                                    String rawPayload) {

        // Re-check inside the transaction — a second guard against a race
        // where two webhook deliveries land at nearly the same instant.
        if (paymentRepository.existsByGatewayPaymentId(razorpayPaymentId)) {
            return ResponseEntity.ok("Already processed");
        }

        // Try to find the pending payment row created at /create-order time
        // (see MembershipController#createOrder), which is what ties this
        // webhook back to a real user and plan. If it's missing — e.g. the
        // order was created before this row-tracking existed, or this is a
        // pure-subscription webhook with no matching order — we still record
        // the payment so it's never silently dropped, just unattributed.
        Optional<MembershipPayment> pendingOpt = razorpayOrderId != null
                ? paymentRepository.findByGatewayOrderId(razorpayOrderId)
                : Optional.empty();

        MembershipPayment payment = pendingOpt.orElseGet(MembershipPayment::new);
        payment.setGatewayPaymentId(razorpayPaymentId);
        payment.setGatewayOrderId(razorpayOrderId);
        payment.setPaymentGateway("razorpay");
        payment.setStatus(status);
        payment.setSignatureVerified(true);
        payment.setWebhookReceived(true);
        payment.setRawPayload(rawPayload.length() > 8000 ? rawPayload.substring(0, 8000) : rawPayload);
        if (payment.getAmount() == null) {
            payment.setAmount((int) amountPaise);
        }
        if (payment.getCurrency() == null) {
            payment.setCurrency("INR");
        }
        if (payment.getPlanType() == null) {
            payment.setPlanType("unknown");
        }
        if ("captured".equalsIgnoreCase(status)) {
            payment.setPaidAt(LocalDateTime.now());
        }

        // No pending row and no user attached -> we can store the payment for
        // audit purposes, but Membership.user is NOT NULL, so we can't blindly
        // save here without a user. Flag it loudly instead of crashing.
        if (payment.getUser() == null) {
            writeAudit(null, "WEBHOOK_PAYMENT_UNATTRIBUTED", "payment", razorpayPaymentId,
                    "{\"reason\":\"no matching pending order row, payment not linked to a user\","
                    + "\"order_id\":\"" + escapeJson(razorpayOrderId) + "\"}");
            return ResponseEntity.ok("Payment received but unattributed — needs manual reconciliation");
        }

        paymentRepository.save(payment);

        // ── Activate / extend membership on a successful capture ──
        if ("captured".equalsIgnoreCase(status)) {
            activateMembership(payment, subscriptionEntity);
        }

        writeAudit(payment.getUser().getId(), "PAYMENT_" + status.toUpperCase(), "payment",
                razorpayPaymentId, "{\"amount_paise\":" + amountPaise + ",\"method\":\""
                        + escapeJson(method) + "\"}");

        return ResponseEntity.ok("OK");
    }

    /**
     * Flips the user's membership to active and stamps subscription fields
     * when present (real Subscriptions API events carry a subscription
     * entity; one-time Order-based payments currently do not — those fields
     * just stay null until the Subscriptions API migration lands).
     */
    private void activateMembership(MembershipPayment payment, JsonNode subscriptionEntity) {
        Membership membership = membershipRepository
                .findTopByUserIdAndStatusOrderByEndDateDesc(payment.getUser().getId(), "active")
                .orElseGet(() -> Membership.builder()
                        .user(payment.getUser())
                        .plan(payment.getPlanType() != null && payment.getPlanType().contains("creator")
                                ? "creator" : "reader")
                        .gateway("razorpay")
                        .status("active")
                        .build());

        membership.setStatus("active");
        membership.setPaymentId(payment.getGatewayPaymentId());
        boolean yearly = payment.getPlanType() != null && payment.getPlanType().contains("yearly");
        membership.setEndDate(yearly
                ? LocalDateTime.now().plusYears(1)
                : LocalDateTime.now().plusMonths(1));

        if (subscriptionEntity != null && !subscriptionEntity.isMissingNode()) {
            membership.setRazorpaySubscriptionId(subscriptionEntity.path("id").asText(null));
            membership.setRazorpayPlanId(subscriptionEntity.path("plan_id").asText(null));
            membership.setWebhookStatus("subscription.charged");
        } else {
            membership.setWebhookStatus("payment.captured");
        }

        membershipRepository.save(membership);

        payment.getUser().setPremium(true);
        // Explicit save (not just relying on dirty-checking) — User is fetched
        // lazily off payment.getUser(), and we want this write to be obvious
        // and unambiguous in a security-sensitive path like this one.
        userRepository.save(payment.getUser());
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

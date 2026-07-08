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
 * Holds the @Transactional payment-processing logic in its own bean, so that
 * calling it from RazorpayWebhookService goes through Spring's transaction
 * proxy correctly (a same-class call would silently skip @Transactional).
 */
@Service
public class RazorpayPaymentProcessor {

    private final MembershipPaymentRepository paymentRepository;
    private final MembershipRepository membershipRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public RazorpayPaymentProcessor(MembershipPaymentRepository paymentRepository,
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

        if (paymentRepository.existsByGatewayPaymentId(razorpayPaymentId)) {
            return ResponseEntity.ok("Already processed");
        }

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

        if (payment.getUser() == null) {
            writeAudit(null, "WEBHOOK_PAYMENT_UNATTRIBUTED", "payment", razorpayPaymentId,
                    "{\"reason\":\"no matching pending order row, payment not linked to a user\","
                    + "\"order_id\":\"" + escapeJson(razorpayOrderId) + "\"}");
            return ResponseEntity.ok("Payment received but unattributed — needs manual reconciliation");
        }

        paymentRepository.save(payment);

        if ("captured".equalsIgnoreCase(status)) {
            activateMembership(payment, subscriptionEntity);
        }

        writeAudit(payment.getUser().getId(), "PAYMENT_" + status.toUpperCase(), "payment",
                razorpayPaymentId, "{\"amount_paise\":" + amountPaise + ",\"method\":\""
                        + escapeJson(method) + "\"}");

        return ResponseEntity.ok("OK");
    }

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
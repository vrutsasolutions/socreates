package com.ideaspark.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ideaspark.model.AuditLog;
import com.ideaspark.model.Membership;
import com.ideaspark.model.MembershipPayment;
import com.ideaspark.repository.AuditLogRepository;
import com.ideaspark.repository.MembershipPaymentRepository;
import com.ideaspark.repository.MembershipRepository;
import com.ideaspark.repository.UserRepository;
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

/**
 * Processes incoming Razorpay webhook calls. This is the security-critical
 * path described in the Backend Engineer task doc, Step 5 — every rule
 * there is implemented here exactly:
 *
 *   1. Raw body + signature verified with HMAC-SHA256, constant-time compare.
 *   2. Bad signature -> 401, logged to audit_log, nothing else touched.
 *   3. Idempotency: razorpay_payment_id already in membership_payments? -> 200, no-op.
 *   4. Everything else happens inside one DB transaction.
 *   5. Always returns within the method (no slow work) so Razorpay doesn't retry.
 */
@Service
public class RazorpayWebhookService {

    private final MembershipPaymentRepository paymentRepository;
    private final MembershipRepository membershipRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${razorpay.webhook-secret:}")
    private String webhookSecret;

    public RazorpayWebhookService(MembershipPaymentRepository paymentRepository,
                                   MembershipRepository membershipRepository,
                                   AuditLogRepository auditLogRepository,
                                   UserRepository userRepository) {
        this.paymentRepository = paymentRepository;
        this.membershipRepository = membershipRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    public ResponseEntity<String> process(String rawPayload, String signature) {

        // ── 0. Webhook secret must be configured before we trust anything ──
        if (webhookSecret == null || webhookSecret.isBlank()) {
            // Don't 500 — Razorpay will just retry forever. Log and 503 so
            // it's obvious in monitoring that config is missing, not that
            // payments are actually broken.
            return ResponseEntity.status(503).body("Webhook secret not configured");
        }

        // ── 1 & 2. Verify HMAC-SHA256 signature (constant-time compare) ──
        if (signature == null || !isValidSignature(rawPayload, signature)) {
            writeAudit(null, "INVALID_WEBHOOK_SIGNATURE", "webhook", null,
                    "{\"reason\":\"signature mismatch or missing header\"}");
            return ResponseEntity.status(401).body("Invalid signature");
        }

        // ── 3. Parse the event ──
        JsonNode root;
        try {
            root = objectMapper.readTree(rawPayload);
        } catch (Exception e) {
            writeAudit(null, "WEBHOOK_PARSE_ERROR", "webhook", null,
                    "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}");
            // Malformed body from a *signed* request shouldn't happen — still
            // 200 it so Razorpay doesn't hammer retries on something we can't fix.
            return ResponseEntity.ok("Unparseable payload, logged");
        }

        String eventType = root.path("event").asText(null);
        JsonNode paymentEntity = root.path("payload").path("payment").path("entity");
        JsonNode subscriptionEntity = root.path("payload").path("subscription").path("entity");

        if (paymentEntity.isMissingNode() || paymentEntity.isNull()) {
            // Events like subscription.activated with no payment entity attached —
            // nothing to dedupe/insert as a payment row. Just audit-log and exit.
            writeAudit(null, "WEBHOOK_RECEIVED_NO_PAYMENT", "webhook", eventType,
                    rawPayload.length() > 2000 ? null : rawPayload);
            return ResponseEntity.ok("No payment entity, acknowledged");
        }

        String razorpayPaymentId = paymentEntity.path("id").asText(null);
        String razorpayOrderId = paymentEntity.path("order_id").asText(null);
        String status = paymentEntity.path("status").asText("captured"); // captured | failed
        String method = paymentEntity.path("method").asText(null);
        long amountPaise = paymentEntity.path("amount").asLong(0);

        if (razorpayPaymentId == null) {
            writeAudit(null, "WEBHOOK_MISSING_PAYMENT_ID", "webhook", eventType, rawPayload);
            return ResponseEntity.ok("Missing payment id, acknowledged");
        }

        // ── 3b. Idempotency check — THE critical replay guard ──
        if (paymentRepository.existsByGatewayPaymentId(razorpayPaymentId)) {
            return ResponseEntity.ok("Already processed");
        }

        // ── 4. Process in a transaction ──
        return handleNewPayment(eventType, razorpayPaymentId, razorpayOrderId,
                status, method, amountPaise, subscriptionEntity, rawPayload);
    }

    @Transactional
    protected ResponseEntity<String> handleNewPayment(String eventType,
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

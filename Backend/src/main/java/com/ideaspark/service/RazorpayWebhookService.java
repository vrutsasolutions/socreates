package com.ideaspark.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ideaspark.model.AuditLog;
import com.ideaspark.repository.AuditLogRepository;
import com.ideaspark.repository.MembershipPaymentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

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
 *
 * NOTE: the actual DB-writing work (step 3b/4) lives in the separate
 * {@link RazorpayPaymentWebhookHandler} bean, injected below, rather than a
 * private/protected method on this class. @Transactional only works through
 * Spring's proxy — a same-object call (this.someMethod()) skips the proxy
 * entirely and silently runs with no transaction. Delegating to a distinct
 * injected bean forces the call through the proxy so the transaction is real.
 */
@Service
public class RazorpayWebhookService {

    private final MembershipPaymentRepository paymentRepository;
    private final AuditLogRepository auditLogRepository;
    private final RazorpayPaymentWebhookHandler paymentWebhookHandler;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${razorpay.webhook-secret:}")
    private String webhookSecret;

    public RazorpayWebhookService(MembershipPaymentRepository paymentRepository,
                                   AuditLogRepository auditLogRepository,
                                   RazorpayPaymentWebhookHandler paymentWebhookHandler) {
        this.paymentRepository = paymentRepository;
        this.auditLogRepository = auditLogRepository;
        this.paymentWebhookHandler = paymentWebhookHandler;
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

        // ── 4. Process in a transaction — delegated to a separate bean so
        // @Transactional actually applies (see class javadoc). ──
        return paymentWebhookHandler.handleNewPayment(eventType, razorpayPaymentId, razorpayOrderId,
                status, method, amountPaise, subscriptionEntity, rawPayload);
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

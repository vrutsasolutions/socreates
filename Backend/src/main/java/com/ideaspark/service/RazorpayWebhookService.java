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
 *   4. Everything else happens inside one DB transaction, in RazorpayPaymentProcessor
 *      (a separate bean, so @Transactional actually goes through the proxy —
 *      see RazorpayPaymentProcessor's javadoc for why).
 *   5. Always returns within the method (no slow work) so Razorpay doesn't retry.
 */
@Service
public class RazorpayWebhookService {

    private final MembershipPaymentRepository paymentRepository;
    private final AuditLogRepository auditLogRepository;
    private final RazorpayPaymentProcessor paymentProcessor;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${razorpay.webhook-secret:}")
    private String webhookSecret;

    public RazorpayWebhookService(MembershipPaymentRepository paymentRepository,
                                   AuditLogRepository auditLogRepository,
                                   RazorpayPaymentProcessor paymentProcessor) {
        this.paymentRepository = paymentRepository;
        this.auditLogRepository = auditLogRepository;
        this.paymentProcessor = paymentProcessor;
    }

    public ResponseEntity<String> process(String rawPayload, String signature) {

        // ── 0. Webhook secret must be configured before we trust anything ──
        if (webhookSecret == null || webhookSecret.isBlank()) {
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
            return ResponseEntity.ok("Unparseable payload, logged");
        }

        String eventType = root.path("event").asText(null);
        JsonNode paymentEntity = root.path("payload").path("payment").path("entity");
        JsonNode subscriptionEntity = root.path("payload").path("subscription").path("entity");

        if (paymentEntity.isMissingNode() || paymentEntity.isNull()) {
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

        // ── 4. Delegate to the separate transactional bean ──
        return paymentProcessor.handleNewPayment(eventType, razorpayPaymentId, razorpayOrderId,
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
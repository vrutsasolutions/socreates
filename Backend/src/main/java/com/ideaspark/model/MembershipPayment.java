package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Maps to the existing  membership_payments  table in Supabase.
 *
 * Columns (exact match):
 *   id                  uuid  PK
 *   user_id             uuid  FK → users.id
 *   plan_type           text         — e.g. "reader_monthly", "creator_yearly"
 *   amount              int4         — paise, server-authoritative
 *   currency            text         — "INR"
 *   payment_gateway     text         — "razorpay"
 *   gateway_payment_id  text  UNIQUE — Razorpay's pay_XXXXXXXXXX
 *                                      THIS is the idempotency key: the webhook
 *                                      handler checks this exists() before
 *                                      inserting, so a replayed webhook can
 *                                      never double-credit a payment.
 *   gateway_order_id    text  UNIQUE — Razorpay's order_XXXXXXXXXX
 *   status              text         — "captured" | "failed" | "refunded"
 *   paid_at             timestamptz
 *   created_at          timestamptz
 *   raw_payload         jsonb        — full webhook body, for audit/disputes
 *   signature_verified  bool         — true only after HMAC-SHA256 check passes
 *   webhook_received    bool         — true once Razorpay's webhook (not just
 *                                      the client callback) has confirmed this
 *
 * This is the source of truth the monthly distribution job sums:
 *   total_revenue = SUM(amount) WHERE status = 'captured' AND month = X
 */
@Entity
@Table(name = "membership_payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MembershipPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** e.g. "reader_monthly", "creator_yearly" — mirrors plans.plan_code. */
    @Column(name = "plan_type", nullable = false)
    private String planType;

    /** Amount actually charged, in paise. Always read from `plans`, never the client. */
    @Column(nullable = false)
    private Integer amount;

    @Column(nullable = false)
    private String currency = "INR";

    /** "razorpay" (room for another gateway later). */
    @Column(name = "payment_gateway", nullable = false)
    private String paymentGateway = "razorpay";

    /**
     * Razorpay's payment id. UNIQUE — this is the idempotency guard.
     * Webhook handler MUST check existsByGatewayPaymentId() before insert.
     */
    @Column(name = "gateway_payment_id", unique = true)
    private String gatewayPaymentId;

    @Column(name = "gateway_order_id", unique = true)
    private String gatewayOrderId;

    /** "captured" | "failed" | "refunded" */
    @Column(nullable = false)
    private String status;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /** Full webhook JSON body — kept for audit trail / dispute resolution. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_payload", columnDefinition = "jsonb")
    private String rawPayload;

    /** True only once HMAC-SHA256 signature verification has passed. */
    @Column(name = "signature_verified", nullable = false)
    private boolean signatureVerified = false;

    /** True once Razorpay's webhook (not just the client redirect) confirmed this payment. */
    @Column(name = "webhook_received", nullable = false)
    private boolean webhookReceived = false;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}

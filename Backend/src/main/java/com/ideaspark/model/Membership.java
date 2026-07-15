package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

// ── Membership ───────────────────────────────────────────────
@Entity
@Table(name = "membership")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Membership {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 20)
    private String plan; // "reader" | "creator"

    @Column(length = 20)
    private String billing; // "monthly" | "yearly"

    @Column(length = 20)
    private String gateway; // "razorpay" (only supported gateway)

    @Column(name = "plan_label")
    private String planLabel; // display, e.g. "Creators Pro"

    @Column(length = 20)
    private String price; // display, e.g. "₹999"

    @Column(length = 20)
    private String status = "active";

    @Column(name = "payment_id")
    private String paymentId;

    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDateTime endDate;

    // ── Razorpay Subscriptions fields ───────────────────────────
    // This table is the de-facto "subscriptions" table — it gained these
    // columns instead of a separate one, since the rest of the app already
    // reads membership for "is this user currently subscribed". Filled in
    // once the subscribe/webhook flow moves from one-time Orders to real
    // Razorpay Subscriptions.

    /** Razorpay's sub_XXXXXXXXXX. Null until the recurring-subscription flow is wired up. */
    @Column(name = "razorpay_subscription_id")
    private String razorpaySubscriptionId;

    /** Mirrors plans.razorpay_plan_id at the time this subscription was created. */
    @Column(name = "razorpay_plan_id")
    private String razorpayPlanId;

    /** Next charge date as reported by Razorpay (subscription.charged webhook updates this). */
    @Column(name = "next_billing_date")
    private LocalDateTime nextBillingDate;

    /** Set when /cancel is called or a subscription.cancelled webhook arrives. */
    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    /**
     * Last webhook event type processed for this subscription
     * (e.g. "subscription.activated", "subscription.charged"). Useful for
     * debugging out-of-order or duplicate webhook delivery.
     */
    @Column(name = "webhook_status")
    private String webhookStatus;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        startDate = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

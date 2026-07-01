package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Maps to the existing  plans  table in Supabase.
 *
 * Columns (exact match):
 *   id                int4  (serial PK)
 *   plan_code         text  unique  — e.g. "reader_monthly", "creator_yearly"
 *   plan_name         text         — display name, e.g. "Creator Pro Yearly"
 *   billing_cycle     text         — "monthly" | "yearly"
 *   price_paise       int4         — server-authoritative amount in paise
 *   currency          text         — "INR"
 *   razorpay_plan_id  text  unique — Razorpay's plan_XXXXXXXXXX, set once
 *                                    Subscriptions are created in the dashboard
 *   is_active         bool         — false until a real razorpay_plan_id is set
 *   created_at        timestamptz
 *   updated_at        timestamptz
 *
 * This is the single source of truth for pricing + the Razorpay plan_id —
 * RazorpayService should look prices up here instead of hardcoding them.
 */
@Entity
@Table(name = "plans")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Plan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "plan_code", nullable = false, unique = true)
    private String planCode;

    @Column(name = "plan_name", nullable = false)
    private String planName;

    /** "monthly" | "yearly" */
    @Column(name = "billing_cycle", nullable = false)
    private String billingCycle;

    /** Server-authoritative charge amount. Never trust a price from the client. */
    @Column(name = "price_paise", nullable = false)
    private Integer pricePaise;

    @Column(nullable = false)
    private String currency = "INR";

    /**
     * Razorpay's plan_id once created in the dashboard. Placeholder
     * ("PENDING_PLAN_ID") until then — is_active stays false until this
     * is set to a real value, so checkout can't accidentally use it.
     */
    @Column(name = "razorpay_plan_id", unique = true)
    private String razorpayPlanId;

    @Column(name = "is_active", nullable = false)
    private boolean active = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

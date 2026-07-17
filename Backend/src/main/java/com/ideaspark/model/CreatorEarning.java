package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Maps to the existing creator_earnings table in Supabase.
 */
@Entity
@Table(
    name = "creator_earnings",
    uniqueConstraints = @UniqueConstraint(columnNames = {"creator_id", "month"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatorEarning {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    /** The creator who owns this earnings row. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;

    /**
     * Calendar month — always stored as the 1st day of the month.
     */
    @Column(nullable = false)
    private LocalDate month;

    /**
     * FK to revenue_pools.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pool_id")
    private RevenuePool pool;

    @Column(name = "score_percent", precision = 5, scale = 2)
    private java.math.BigDecimal scorePercent;

    @Column(name = "revenue_paise")
    private Long revenuePaise;

    /**
     * Status values:
     * Estimating
     * Scheduled
     * Processing
     * Paid
     * Rolled_Over
     * Setup_Missing
     * Failed
     */
    @Column(nullable = false)
    @Builder.Default
    private String status = "Estimating";

    @Column(name = "razorpay_payout_id")
    private String razorpayPayoutId;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    // ===============================
    // New payout lifecycle fields
    // ===============================

    @Column(name = "scheduled_for")
    private LocalDateTime scheduledFor;

    @Column(name = "rolled_from")
    private LocalDate rolledFrom;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @Builder.Default
    @Column(name = "retry_count")
    private Integer retryCount = 0;

    @Column(name = "next_retry_at")
    private LocalDateTime nextRetryAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payout_account_id")
    private PayoutAccount payoutAccount;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }

        if (retryCount == null) {
            retryCount = 0;
        }
    }
}
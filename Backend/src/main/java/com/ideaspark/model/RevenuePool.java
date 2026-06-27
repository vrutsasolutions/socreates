package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Maps to the existing  revenue_pools  table in Supabase.
 *
 * Columns (exact match):
 *   id                      int4  (serial PK)
 *   month                   date  (unique — one pool per month)
 *   total_revenue_paise     int8
 *   reader_revenue_paise    int8
 *   creator_pro_revenue_paise int8
 *   socreate_share_paise    int8
 *   creator_pool_paise      int8  ← the pot distributed to creators
 *   status                  text  ("open" | "locked" | "distributed")
 *   locked_at               timestamptz
 *   distributed_at          timestamptz
 *   created_at              timestamptz
 *
 * Read-only from the Java side — pools are created/locked by an admin job.
 * The earnings service reads creator_pool_paise to calculate payouts.
 */
@Entity
@Table(name = "revenue_pools")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RevenuePool {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /** One pool per calendar month. */
    @Column(nullable = false, unique = true)
    private LocalDate month;

    @Column(name = "total_revenue_paise")
    private Long totalRevenuePaise;

    @Column(name = "reader_revenue_paise")
    private Long readerRevenuePaise;

    @Column(name = "creator_pro_revenue_paise")
    private Long creatorProRevenuePaise;

    @Column(name = "socreate_share_paise")
    private Long socreatSharePaise;

    /**
     * The portion actually distributed among creators.
     *
     * Revenue-source-aware split (SoCreate Creator Pro Revenue Distribution
     * Proposal): Reader Premium and Creator Pro revenue are split at
     * different rates, then summed —
     *
     *   creator_pool_paise   = (reader_revenue_paise     * 0.50)
     *                        + (creator_pro_revenue_paise * 0.25)
     *
     *   socreate_share_paise = (reader_revenue_paise     * 0.50)
     *                        + (creator_pro_revenue_paise * 0.75)
     *
     * total_revenue_paise = reader_revenue_paise + creator_pro_revenue_paise
     * (creator_pool_paise + socreate_share_paise should equal it, modulo
     * paise-level rounding "dust" that stays with SoCreate).
     *
     * See CreatorService#splitRevenuePool for the implementation.
     */
    @Column(name = "creator_pool_paise")
    private Long creatorPoolPaise;

    /** "open" | "locked" | "distributed" */
    @Column(nullable = false)
    private String status = "open";

    @Column(name = "locked_at")
    private LocalDateTime lockedAt;

    @Column(name = "distributed_at")
    private LocalDateTime distributedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}

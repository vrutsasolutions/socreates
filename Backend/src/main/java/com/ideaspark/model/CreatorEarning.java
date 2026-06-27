package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Maps to the existing  creator_earnings  table in Supabase.
 *
 * Columns (exact match — do NOT rename):
 *   id              uuid  PK
 *   creator_id      uuid  FK → users.id
 *   month           date  (always 1st of month, e.g. 2026-06-01)
 *   pool_id         uuid  FK → revenue_pools.id  (nullable until pool is locked)
 *   score_percent   numeric
 *   revenue_paise   int8  (earnings in paise; divide by 100 for ₹)
 *   status          text  ("Pending" | "Paid")
 *   created_at      timestamptz
 *
 * Hibernate ddl-auto=update will NOT touch this table because the columns
 * already exist — it only adds missing ones.
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
     * Calendar month — always stored as the 1st day of the month
     * so ORDER BY month DESC gives a clean chronological list.
     */
    @Column(nullable = false)
    private LocalDate month;

    /**
     * FK to revenue_pools. Nullable until the pool for this month
     * has been created and locked by an admin/job.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pool_id")
    private RevenuePool pool;

    /**
     * Creator's share percentage of the pool (0–100, up to 2 decimal places).
     * Calculated as: creator_raw_score / sum_of_all_raw_scores_for_month * 100
     */
    @Column(name = "score_percent", precision = 5, scale = 2)
    private java.math.BigDecimal scorePercent;

    /**
     * Actual earning in paise (1 ₹ = 100 paise).
     * Calculated as: score_percent / 100 * pool.creator_pool_paise
     */
    @Column(name = "revenue_paise")
    private Long revenuePaise;

    /** "Pending" | "Paid" */
    @Column(nullable = false)
    private String status = "Pending";

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}

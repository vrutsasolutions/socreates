package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Maps to the existing  creator_monthly_metrics  table in Supabase.
 *
 * Columns (exact match):
 *   id              int4  (serial PK)
 *   creator_id      uuid  FK → users.id
 *   month           date
 *   views           int8
 *   saves           int8
 *   comments        int8  (truncated in UI — full name)
 *   likes           int8
 *   raw_score       numeric
 *   share_percent   numeric
 *   created_at      timestamptz
 *   updated_at      timestamptz
 *
 * One row per creator per month. Written by the dashboard service when
 * the creator loads their dashboard; updated on subsequent loads for the
 * current month until the pool is locked.
 */
@Entity
@Table(
    name = "creator_monthly_metrics",
    uniqueConstraints = @UniqueConstraint(columnNames = {"creator_id", "month"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatorMonthlyMetrics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;

    @Column(nullable = false)
    private LocalDate month;

    @Column(nullable = false)
    private long views = 0;

    @Column(nullable = false)
    private long saves = 0;

    @Column(nullable = false)
    private long comments = 0;

    @Column(nullable = false)
    private long likes = 0;

    /**
     * raw_score = (views*0.25) + (saves*0.40) + (likes*0.20) + (comments*0.15)
     * Weights: Views 25%, Saves 40%, Likes 20%, Comments 15%.
     * Used by the distribution job to calculate each creator's share_percent.
     */
    @Column(name = "raw_score", precision = 12, scale = 2)
    private BigDecimal rawScore;

    /**
     * share_percent = raw_score / SUM(all creators raw_score for month) * 100
     * Filled in when the revenue pool is locked.
     */
    @Column(name = "share_percent", precision = 7, scale = 4)
    private BigDecimal sharePercent;

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

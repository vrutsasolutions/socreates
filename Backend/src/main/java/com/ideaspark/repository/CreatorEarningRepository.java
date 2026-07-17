package com.ideaspark.repository;

import com.ideaspark.model.CreatorEarning;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CreatorEarningRepository
        extends JpaRepository<CreatorEarning, UUID> {

    /**
     * All earnings for a creator, newest month first.
     */
    List<CreatorEarning> findByCreatorIdOrderByMonthDesc(UUID creatorId);

    /**
     * Look up a specific month's earning.
     */
    Optional<CreatorEarning> findByCreatorIdAndMonth(
            UUID creatorId,
            LocalDate month
    );

    /**
     * Lookup by Razorpay payout ID.
     */
    Optional<CreatorEarning> findByRazorpayPayoutId(
            String razorpayPayoutId
    );

    /**
     * Returns all earnings for a month having the specified status.
     */
    List<CreatorEarning> findByMonthAndStatus(
            LocalDate month,
            String status
    );

    /**
     * Returns all earnings having the specified status.
     */
    List<CreatorEarning> findByStatus(String status);

    /**
     * Returns scheduled payouts whose payout time has arrived.
     */
    @Query("""
            SELECT e
            FROM CreatorEarning e
            WHERE e.status = 'Scheduled'
              AND e.scheduledFor IS NOT NULL
              AND e.scheduledFor <= CURRENT_TIMESTAMP
            """)
    List<CreatorEarning> findScheduledPayouts();

    /**
     * Returns processing payouts that are ready for another attempt.
     */
    @Query("""
            SELECT e
            FROM CreatorEarning e
            WHERE e.status = 'Processing'
              AND COALESCE(e.retryCount, 0) < 3
              AND e.nextRetryAt IS NOT NULL
              AND e.nextRetryAt <= CURRENT_TIMESTAMP
            """)
    List<CreatorEarning> findDueForRetry();

    /**
     * Atomically claims a scheduled earning.
     *
     * Only one scheduler instance can change the same earning from
     * Scheduled to Processing.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE CreatorEarning e
            SET e.status = 'Processing'
            WHERE e.id = :id
              AND e.status = 'Scheduled'
            """)
    int claimScheduledForPayout(@Param("id") UUID id);
}
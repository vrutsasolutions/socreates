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
public interface CreatorEarningRepository extends JpaRepository<CreatorEarning, UUID> {

    /**
     * All earnings for a creator, newest month first.
     */
    List<CreatorEarning> findByCreatorIdOrderByMonthDesc(UUID creatorId);

    /**
     * Look up a specific month's earning.
     */
    Optional<CreatorEarning> findByCreatorIdAndMonth(UUID creatorId, LocalDate month);

    /**
     * Lookup by Razorpay payout id.
     */
    Optional<CreatorEarning> findByRazorpayPayoutId(String razorpayPayoutId);

    /**
     * Returns all earnings for a month having the specified status.
     */
    List<CreatorEarning> findByMonthAndStatus(LocalDate month, String status);

    /**
     * Returns all earnings with the given status.
     */
    List<CreatorEarning> findByStatus(String status);

    /**
     * Returns payouts that are scheduled and due to be processed.
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
     * Returns payouts that previously failed processing and
     * are ready for another retry attempt.
     */
    @Query("""
                SELECT e
                FROM CreatorEarning e
                WHERE e.status = 'Processing'
                  AND e.retryCount < 3
                  AND e.nextRetryAt IS NOT NULL
                  AND e.nextRetryAt <= CURRENT_TIMESTAMP
            """)
    List<CreatorEarning> findDueForRetry();

    /**
     * Atomically claim an earning for payout.
     *
     * Only one scheduler/thread can transition the row from
     * Scheduled -> Processing.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
                UPDATE CreatorEarning e
                SET e.status = 'Processing'
                WHERE e.id = :id
                  AND e.status = 'Pending'
            """)
    int claimPendingForPayout(@Param("id") UUID id);
}
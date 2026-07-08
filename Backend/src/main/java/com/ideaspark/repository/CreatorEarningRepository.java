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

    /** All earnings for a creator, newest month first. */
    List<CreatorEarning> findByCreatorIdOrderByMonthDesc(UUID creatorId);

    /** Look up a specific month row for upsert logic. */
    Optional<CreatorEarning> findByCreatorIdAndMonth(UUID creatorId, LocalDate month);

    /**
     * Look up an earning by the RazorpayX payout id set on it when the
     * withdrawal was fired. Used by the payout webhook as a fallback when the
     * event's reference_id (= earning.id) is missing or malformed, so a status
     * update can still be reconciled to the right row.
     */
    Optional<CreatorEarning> findByRazorpayPayoutId(String razorpayPayoutId);

    /**
     * Atomic claim for {@link com.ideaspark.service.CreatorPayoutService#requestPayout}.
     *
     * Fix #14 (payout race condition): the old code did a Java-side
     * "read row -> check status=='Pending' -> ... -> write 'Paid'". Two
     * concurrent requests for the same row (double-click, retry-on-timeout,
     * or a deliberate double-submit) could both pass the check before either
     * one wrote back, so both fired a RazorpayX payout — the creator gets
     * paid twice for one month's earnings.
     *
     * This single UPDATE ... WHERE status = 'Pending' is the fix: Postgres
     * takes a row lock for the UPDATE, so if two transactions race, the
     * second one blocks until the first commits or rolls back, then
     * re-evaluates the WHERE clause and finds status is no longer 'Pending'
     * -> 0 rows affected. Only the request that gets rowsAffected == 1 may
     * proceed to call RazorpayX. Must be called BEFORE the external payout
     * call (not after) — claiming first is what stops the second request
     * from ever reaching RazorpayX at all, not just from double-writing.
     *
     * clearAutomatically = true detaches the persistence context so a
     * later save() on the (still in-memory) entity performs a fresh merge
     * rather than working off a first-level-cache copy that predates this
     * bulk update.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE CreatorEarning e SET e.status = 'Processing' WHERE e.id = :id AND e.status = 'Pending'")
    int claimPendingForPayout(@Param("id") UUID id);
}

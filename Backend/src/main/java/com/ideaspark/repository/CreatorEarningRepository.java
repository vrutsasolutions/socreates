package com.ideaspark.repository;

import com.ideaspark.model.CreatorEarning;
import org.springframework.data.jpa.repository.JpaRepository;
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
}

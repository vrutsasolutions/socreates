package com.ideaspark.repository;

import com.ideaspark.model.CreatorMonthlyMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CreatorMonthlyMetricsRepository extends JpaRepository<CreatorMonthlyMetrics, Integer> {

    /** Fetch this creator's metrics row for a given month (for upsert). */
    Optional<CreatorMonthlyMetrics> findByCreatorIdAndMonth(UUID creatorId, LocalDate month);

    /**
     * Sums raw_score across all ELIGIBLE creators for the given month —
     * the denominator of the live share_percent formula:
     *   share_percent = (this creator's raw_score / total_score) * 100
     *
     * Eligibility mirrors the payout-workflow doc (creator_pro_active +
     * is_verified_creator); policy_violations isn't tracked on User yet, so
     * it's intentionally omitted here rather than guessed.
     */
    @Query("SELECT COALESCE(SUM(m.rawScore), 0) FROM CreatorMonthlyMetrics m " +
           "WHERE m.month = :month " +
           "AND m.creator.creatorPro = true " +
           "AND m.creator.isVerified = true")
    BigDecimal sumRawScoreForEligibleCreators(@Param("month") LocalDate month);
}

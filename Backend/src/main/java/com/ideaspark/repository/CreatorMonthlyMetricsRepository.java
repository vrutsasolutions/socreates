package com.ideaspark.repository;

import com.ideaspark.model.CreatorMonthlyMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
     * Eligibility = verified AND currently has an active "creator" plan
     * Membership row (NOT User.is_creator_pro — that column is never
     * written to by any code path and is always NULL in the DB, even for
     * genuinely subscribed creators; see MembershipRepository#hasActiveCreatorPro
     * for the same check used elsewhere). policy_violations isn't tracked
     * on User yet, so it's intentionally omitted rather than guessed.
     */
    @Query("SELECT COALESCE(SUM(m.rawScore), 0) FROM CreatorMonthlyMetrics m " +
           "WHERE m.month = :month " +
           "AND m.creator.isVerified = true " +
           "AND EXISTS (SELECT 1 FROM Membership mem " +
           "            WHERE mem.user = m.creator " +
           "            AND mem.plan = 'creator' " +
           "            AND mem.status = 'active' " +
           "            AND mem.endDate > :now)")
    BigDecimal sumRawScoreForEligibleCreators(@Param("month") LocalDate month,
                                               @Param("now") LocalDateTime now);
}

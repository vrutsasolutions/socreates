package com.ideaspark.repository;

import com.ideaspark.model.MembershipPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MembershipPaymentRepository extends JpaRepository<MembershipPayment, UUID> {

    /**
     * THE idempotency check. The webhook handler MUST call this before
     * inserting a new row — if true, return 200 OK without writing anything.
     * Backed by the UNIQUE constraint on gateway_payment_id at the DB level
     * as a second line of defense.
     */
    boolean existsByGatewayPaymentId(String gatewayPaymentId);

    Optional<MembershipPayment> findByGatewayPaymentId(String gatewayPaymentId);

    Optional<MembershipPayment> findByGatewayOrderId(String gatewayOrderId);

    /** Sum of captured payments in a date range — feeds the monthly distribution job. */
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM MembershipPayment p " +
           "WHERE p.status = 'captured' AND p.paidAt >= :start AND p.paidAt < :end")
    Long sumCapturedAmountBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Sum of captured Creator Pro payments (plan_type starting "creator_", e.g.
     * "creator_monthly" / "creator_yearly") in a date range. The remainder of
     * {@link #sumCapturedAmountBetween} is Reader Premium revenue — the two
     * are split at different rates (50/50 vs 25/75) per the "SoCreate Creator
     * Pro Revenue Distribution Proposal", so the distribution job needs them
     * separately, not just the combined total.
     */
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM MembershipPayment p " +
           "WHERE p.status = 'captured' AND p.paidAt >= :start AND p.paidAt < :end " +
           "AND p.planType LIKE 'creator%'")
    Long sumCapturedCreatorProAmountBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    List<MembershipPayment> findByUserIdOrderByCreatedAtDesc(UUID userId);

    /**
     * The user's most recent payment in a given status — used by the
     * self-service refund flow to find the "captured" payment to refund
     * (there's exactly one meaningful one to reverse: the latest charge).
     */
    Optional<MembershipPayment> findFirstByUserIdAndStatusOrderByPaidAtDesc(UUID userId, String status);
}

package com.ideaspark.repository;

import com.ideaspark.model.Membership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MembershipRepository extends JpaRepository<Membership, UUID> {
    Optional<Membership> findTopByUserIdAndStatusOrderByEndDateDesc(UUID userId, String status);
    boolean existsByUserIdAndStatus(UUID userId, String status);

    /**
     * True if this user currently holds an active, unexpired Creator Pro
     * membership. This is the real source of truth for "is this person
     * Creator Pro" — User.is_creator_pro is NEVER populated by any code
     * path (the column exists in the schema but nothing writes to it), so
     * checking it directly always returns false/NULL for everyone,
     * including genuinely subscribed creators. The frontend already works
     * around this the same way (see hasCreatorPro() in paymentApi.jsx).
     */
    @Query("SELECT CASE WHEN COUNT(m) > 0 THEN true ELSE false END FROM Membership m " +
           "WHERE m.user.id = :userId AND m.plan = 'creator' " +
           "AND m.status = 'active' AND m.endDate > :now")
    boolean hasActiveCreatorPro(@Param("userId") UUID userId, @Param("now") LocalDateTime now);
}

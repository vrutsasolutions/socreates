package com.ideaspark.repository;

import com.ideaspark.model.FollowRequest;
import com.ideaspark.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
public interface FollowRequestRepository extends JpaRepository<FollowRequest, UUID> {

    // The unique constraint is on (requester, target) regardless of status, so
    // this is the lookup to use before inserting — never a status-scoped one,
    // or a leftover row would blow up with a constraint violation.
    Optional<FollowRequest> findByRequesterAndTarget(User requester, User target);

    // Follow-requests inbox: everything waiting on this user, newest first.
    List<FollowRequest> findByTargetAndStatusOrderByCreatedAtDesc(
            User target, FollowRequest.Status status);

    // Badge count next to the inbox entry point.
    long countByTargetAndStatus(User target, FollowRequest.Status status);

    // Cleanup when an account is deleted — both directions.
    List<FollowRequest> findByRequester(User requester);

    List<FollowRequest> findByTarget(User target);

    /**
     * Every account this user currently has an outstanding request against.
     * Loaded once per feed render so the "Requested" button state doesn't cost
     * one query per profile card.
     */
    // Status is bound as a parameter rather than written as a JPQL enum
    // literal — referencing a *nested* enum inline (FollowRequest.Status.X)
    // is parsed inconsistently across Hibernate versions, and getting it
    // wrong fails at startup rather than at call time.
    @Query("SELECT fr.target.id FROM FollowRequest fr " +
           "WHERE fr.requester = :requester AND fr.status = :status")
    Set<UUID> findTargetIdsByStatus(@Param("requester") User requester,
                                    @Param("status") FollowRequest.Status status);

    /**
     * Every account this user currently has an outstanding request against.
     * Loaded once per profile/feed render so the "Requested" button state
     * doesn't cost one query per profile card.
     */
    default Set<UUID> findPendingTargetIds(User requester) {
        return findTargetIdsByStatus(requester, FollowRequest.Status.PENDING);
    }
}

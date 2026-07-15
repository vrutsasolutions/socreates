package com.ideaspark.repository;

import com.ideaspark.model.IdeaRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface IdeaReadRepository extends JpaRepository<IdeaRead, UUID> {

    // Used by account deletion to clear this user's idea_reads rows before
    // the users row is deleted (user_id FK is NOT NULL, no cascade at the DB
    // level since ddl-auto=validate never wrote one).
    List<IdeaRead> findByUserId(UUID userId);

    // Whether this user has already spent their one-time slot on this exact
    // premium idea. A hit means the idea is locked (blurred) on this and any
    // future visit — see the note on IdeaRead about reopening never granting
    // access again, even with slots left.
    boolean existsByUserIdAndIdeaId(UUID userId, UUID ideaId);

    // Distinct PREMIUM ideas this user has ever been granted a full read on —
    // the count that's compared against IdeaService.PREMIUM_FREE_READ_LIMIT.
    // Written with an explicit JPQL join-property check (rather than a
    // derived countByUserIdAndIdea_IsPremiumTrue) to sidestep Spring Data's
    // ambiguous property resolution for a boolean field named "isPremium".
    @Query("SELECT COUNT(r) FROM IdeaRead r WHERE r.user.id = :userId AND r.idea.isPremium = true")
    long countPremiumReadsByUserId(@Param("userId") UUID userId);
}

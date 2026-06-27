package com.ideaspark.repository;

import com.ideaspark.model.SavedIdea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SavedIdeaRepository extends JpaRepository<SavedIdea, UUID> {
    List<SavedIdea> findByUserIdOrderBySavedAtDesc(UUID userId);
    Optional<SavedIdea> findByUserIdAndIdeaId(UUID userId, UUID ideaId);
    boolean existsByUserIdAndIdeaId(UUID userId, UUID ideaId);

    @Modifying
    @Query("DELETE FROM SavedIdea s WHERE s.user.id = :userId AND s.idea.id = :ideaId")
    void deleteByUserIdAndIdeaId(@Param("userId") UUID userId, @Param("ideaId") UUID ideaId);

    @Modifying
    @Query("DELETE FROM SavedIdea s WHERE s.idea.id = :ideaId")
    void deleteByIdeaId(@Param("ideaId") UUID ideaId);

    // ✅ Added — Count saved ideas by user
    long countByUserId(UUID userId);

    // ── Creator dashboard ─────────────────────────────────────────────────────
    // How many times any of a creator's ideas have been saved by other users
    @Query("SELECT COUNT(s) FROM SavedIdea s WHERE s.idea.creator.id = :creatorId")
    long countByIdeaCreatorId(@Param("creatorId") UUID creatorId);

    // Per-idea save count (used in the content table)
    @Query("SELECT COUNT(s) FROM SavedIdea s WHERE s.idea.id = :ideaId")
    long countByIdeaId(@Param("ideaId") UUID ideaId);
}

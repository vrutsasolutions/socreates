package com.ideaspark.repository;
import com.ideaspark.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CommentRepository extends JpaRepository<Comment, UUID> {

    List<Comment> findByIdeaIdOrderByCreatedAtDesc(UUID ideaId);
    long countByIdeaId(UUID ideaId);

    // ── Creator dashboard ─────────────────────────────────────────────────────
    // Total comments across all ideas owned by a creator
    @org.springframework.data.jpa.repository.Query(
        "SELECT COUNT(c) FROM Comment c WHERE c.idea.creator.id = :creatorId")
    long countByIdeaCreatorId(@org.springframework.data.repository.query.Param("creatorId") java.util.UUID creatorId);

    // Per-idea comment count (used in the content table)
    // countByIdeaId already satisfies per-idea lookup — no extra method needed.

    // ✅ Added for delete account
    void deleteByIdeaId(UUID ideaId);
    void deleteByUserId(UUID userId);
}

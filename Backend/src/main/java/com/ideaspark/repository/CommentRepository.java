package com.ideaspark.repository;
import com.ideaspark.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CommentRepository extends JpaRepository<Comment, UUID> {

    List<Comment> findByIdeaIdOrderByCreatedAtDesc(UUID ideaId);
    long countByIdeaId(UUID ideaId);

    // ✅ Added for delete account
    void deleteByIdeaId(UUID ideaId);
    void deleteByUserId(UUID userId);
}
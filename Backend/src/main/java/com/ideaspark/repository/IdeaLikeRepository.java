package com.ideaspark.repository;

import com.ideaspark.model.Idea;
import com.ideaspark.model.IdeaLike;
import com.ideaspark.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface IdeaLikeRepository extends JpaRepository<IdeaLike, UUID> {

    boolean existsByUserAndIdea(User user, Idea idea);

    Optional<IdeaLike> findByUserAndIdea(User user, Idea idea);

    @Modifying
    @Query("DELETE FROM IdeaLike l WHERE l.idea.id = :ideaId")
    void deleteByIdeaId(@Param("ideaId") UUID ideaId);
}
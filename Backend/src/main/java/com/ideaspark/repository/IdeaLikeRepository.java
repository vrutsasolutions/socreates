package com.ideaspark.repository;

import com.ideaspark.model.Idea;
import com.ideaspark.model.IdeaLike;
import com.ideaspark.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IdeaLikeRepository extends JpaRepository<IdeaLike, UUID> {

    boolean existsByUserAndIdea(User user, Idea idea);

    Optional<IdeaLike> findByUserAndIdea(User user, Idea idea);

    // Scoped to a single user's likes via an indexed lookup — used by the
    // Home feed to know which ideas the viewer has liked. Replaces a prior
    // findAll() + Java-side filter, which pulled every like row in the
    // database into memory on every single feed load.
    List<IdeaLike> findByUserId(UUID userId);

    @Modifying
    @Query("DELETE FROM IdeaLike l WHERE l.idea.id = :ideaId")
    void deleteByIdeaId(@Param("ideaId") UUID ideaId);

    // Used by account deletion — replaces a findAll() + Java-side filter
    // that scanned every like row in the database to find this one user's.
    @Modifying
    @Query("DELETE FROM IdeaLike l WHERE l.user.id = :userId")
    void deleteByUserId(@Param("userId") UUID userId);
}

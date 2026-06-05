package com.ideaspark.repository;

import com.ideaspark.model.Idea;
import com.ideaspark.model.IdeaLike;
import com.ideaspark.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface IdeaLikeRepository extends JpaRepository<IdeaLike, UUID> {

    boolean existsByUserAndIdea(User user, Idea idea);

    Optional<IdeaLike> findByUserAndIdea(User user, Idea idea);
}
package com.ideaspark.repository;

import com.ideaspark.model.Idea;
import com.ideaspark.model.IdeaLike;
import com.ideaspark.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface IdeaLikeRepository extends JpaRepository<IdeaLike, Long> {

    boolean existsByUserAndIdea(User user, Idea idea);

    Optional<IdeaLike> findByUserAndIdea(User user, Idea idea);
}
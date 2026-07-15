package com.ideaspark.repository;

import com.ideaspark.model.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {

    /** This user's single feedback row, if they've submitted one. */
    Optional<Feedback> findByUserId(UUID userId);
}

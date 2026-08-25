package com.ideaspark.repository;

import com.ideaspark.model.PartnerApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PartnerApplicationRepository extends JpaRepository<PartnerApplication, UUID> {

    /** Find by email — prevents duplicate applications. */
    Optional<PartnerApplication> findByEmail(String email);

    /** Find the application for a linked SoCreate user. */
    Optional<PartnerApplication> findByUserId(UUID userId);

    /** Check if an email already has a pending or approved application. */
    boolean existsByEmailAndStatusIn(String email, List<String> statuses);

    /** All pending applications, ordered by queue position. */
    List<PartnerApplication> findByStatusOrderByQueuePositionAsc(String status);

    /** Next queue position (max + 1). */
    @Query("SELECT COALESCE(MAX(p.queuePosition), 0) + 1 FROM PartnerApplication p")
    int nextQueuePosition();

    /** Count applications by status. */
    long countByStatus(String status);

    /** All applications of a given status, most recently reviewed first. */
    List<PartnerApplication> findByStatusOrderByReviewedAtDesc(String status);
}

package com.ideaspark.repository;

import com.ideaspark.model.Membership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MembershipRepository extends JpaRepository<Membership, UUID> {
    Optional<Membership> findTopByUserIdAndStatusOrderByEndDateDesc(UUID userId, String status);
    boolean existsByUserIdAndStatus(UUID userId, String status);
}

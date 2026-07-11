package com.ideaspark.repository;

import com.ideaspark.model.IdeaRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface IdeaReadRepository extends JpaRepository<IdeaRead, UUID> {
    boolean existsByUserIdAndIdeaId(UUID userId, UUID ideaId);

    // Distinct ideas this user has ever been granted full access to — the
    // count that's compared against IdeaService.FREE_READ_LIMIT.
    long countByUserId(UUID userId);
}

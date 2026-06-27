package com.ideaspark.repository;

import com.ideaspark.model.CreatorMonthlyMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CreatorMonthlyMetricsRepository extends JpaRepository<CreatorMonthlyMetrics, Integer> {

    /** Fetch this creator's metrics row for a given month (for upsert). */
    Optional<CreatorMonthlyMetrics> findByCreatorIdAndMonth(UUID creatorId, LocalDate month);
}

package com.ideaspark.repository;

import com.ideaspark.model.RevenuePool;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface RevenuePoolRepository extends JpaRepository<RevenuePool, Integer> {

    /** Find the pool row for a given month. */
    Optional<RevenuePool> findByMonth(LocalDate month);
}

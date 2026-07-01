package com.ideaspark.repository;

import com.ideaspark.model.Plan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PlanRepository extends JpaRepository<Plan, Integer> {

    /** Look up a plan by its code (e.g. "reader_monthly") — server-side price/plan_id lookup. */
    Optional<Plan> findByPlanCodeAndActiveTrue(String planCode);

    Optional<Plan> findByRazorpayPlanId(String razorpayPlanId);
}

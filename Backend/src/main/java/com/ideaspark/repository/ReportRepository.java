package com.ideaspark.repository;

import com.ideaspark.model.Report;
import com.ideaspark.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReportRepository extends JpaRepository<Report, UUID> {

    // reports has two FKs to users.id (reporter_id, reported_user_id) —
    // account deletion needs both directions cleared or either can trip the
    // FK constraint.
    List<Report> findByReporter(User reporter);

    List<Report> findByReportedUser(User reportedUser);
}

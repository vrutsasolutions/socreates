package com.ideaspark.repository;

import com.ideaspark.model.BannedEmail;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BannedEmailRepository extends JpaRepository<BannedEmail, UUID> {

    boolean existsByEmail(String email);
}

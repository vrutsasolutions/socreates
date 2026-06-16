package com.ideaspark.repository;

import com.ideaspark.model.EmailOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;


public interface EmailOtpRepository extends JpaRepository<EmailOtp,UUID>{

    Optional<EmailOtp> findTopByEmailAndPurposeOrderByCreatedAtDesc(
        String email,
        String purpose
    );


    
} 
    


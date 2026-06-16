package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;



@Entity
@Table(name = "email_otps")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class EmailOtp {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false,length =  150)
    private String email;

    @Column(name="otp_code", nullable = false, length = 10)
    private String otpCode;

    @Column(name="otp_expires_at",nullable=false)
    private LocalDateTime otpExpiresAt;

    @Column(nullable = false,length = 50)
    private String purpose;

    @Column(nullable = false)
    private boolean verified=false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate(){
        createdAt=LocalDateTime.now();
    }
    
}

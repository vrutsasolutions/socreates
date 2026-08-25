package com.ideaspark.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartnerApplicationResponse {

    private UUID id;
    private String fullName;
    private String email;
    private String participantType;
    private String subscriptionChoice;
    private String status;           // "pending" | "approved" | "rejected"
    private Integer queuePosition;
    private Integer freeDays;
    private LocalDateTime createdAt;
    private LocalDateTime reviewedAt;
    private String reviewedBy;
    private String rejectionReason;
}

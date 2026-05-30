package com.ideaspark.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class MembershipDTO {
    private UUID id;
    private String plan;
    private String status;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
}

package com.ideaspark.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class LinkDTO {
    private UUID messageId;
    private String url;
    private String senderName;
    private LocalDateTime createdAt;
}
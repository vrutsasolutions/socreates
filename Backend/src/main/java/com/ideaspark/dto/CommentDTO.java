package com.ideaspark.dto;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;
@Data
public class CommentDTO {
    private UUID id;
    private String content;
    private UUID userId;
    private String userName;
    private String userImage;
    private LocalDateTime createdAt;
    
}

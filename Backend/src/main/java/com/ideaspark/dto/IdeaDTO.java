package com.ideaspark.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class IdeaDTO {
    private UUID id;
    private String title;
    private String description;

    private String imageUrl;          
    private List<String> imageUrls;   

    private UUID creatorId;
    private String creatorName;
    private String creatorImage;
    private String category;
    private boolean isPremium;
    private int likeCount;
    private boolean savedByCurrentUser;
    private boolean likedByCurrentUser;
    private LocalDateTime createdAt;
    private long commentCount;
}
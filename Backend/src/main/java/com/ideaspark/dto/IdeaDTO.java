package com.ideaspark.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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
    // Pin the JSON key to "isPremium". For a boolean field "isPremium" Lombok
    // generates the getter isPremium(); Jackson strips the "is" prefix and
    // would serialize it as "premium" instead — but the frontend reads
    // idea.isPremium everywhere (blur/lock UI, Premium page filtering), so
    // without this an idea that is genuinely premium in the DB would render
    // as a normal idea for every viewer. Same gotcha and fix as
    // FollowStatsResponse.isFollowing / UserDTO.isPremium.
    @JsonProperty("isPremium")
    private boolean isPremium;
    private int likeCount;
    private boolean savedByCurrentUser;
    private boolean likedByCurrentUser;
    private LocalDateTime createdAt;
    private long commentCount;
}

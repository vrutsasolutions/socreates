package com.ideaspark.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class CreateIdeaRequest {
    private String title;
    private String description;
    private String category;
    // Pin the JSON key to "isPremium". For a boolean field "isPremium" Lombok
    // generates the getter/setter isPremium()/setPremium(); Jackson derives
    // the JSON property from setPremium() during deserialization, producing
    // "premium" — but the frontend sends { isPremium: true }, so without this
    // the value is silently dropped and the idea always saves as non-premium,
    // regardless of the Premium toggle. Same gotcha and fix as
    // FollowStatsResponse.isFollowing / UserDTO.isPremium.
    @JsonProperty("isPremium")
    private boolean isPremium;
}

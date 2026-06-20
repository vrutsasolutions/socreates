package com.ideaspark.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowStatsResponse {
    private long followersCount;
    private long followingCount;

    // Explicit @JsonProperty pins the serialized JSON key to exactly
    // "isFollowing", regardless of what Lombok names the generated getter.
    //
    // Why this is needed: for a boolean field named "isFollowing", Lombok
    // generates the getter isFollowing() (it doesn't double the "is"
    // prefix). Jackson then derives the JSON property name from that
    // getter by stripping the leading "is" — producing the key
    // "following", NOT "isFollowing". The frontend reads data.isFollowing,
    // so it silently always saw undefined. @JsonProperty bypasses that
    // derivation entirely.
    @JsonProperty("isFollowing")
    private boolean isFollowing;
}

package com.ideaspark.dto;

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
    private boolean isFollowing;
}
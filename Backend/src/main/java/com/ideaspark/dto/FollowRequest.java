package com.ideaspark.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class FollowRequest {
    private UUID targetUserId; // the user to follow/unfollow
}
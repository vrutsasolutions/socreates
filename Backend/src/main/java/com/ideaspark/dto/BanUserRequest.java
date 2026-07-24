package com.ideaspark.dto;

import lombok.Data;

@Data
public class BanUserRequest {
    // Internal moderation note, e.g. "Uploaded restricted content". Never
    // shown to the banned user, stored on BannedEmail for audit purposes.
    private String reason;
}

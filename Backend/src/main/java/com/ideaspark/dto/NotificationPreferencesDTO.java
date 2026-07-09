package com.ideaspark.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

// Shape of Settings → Notifications toggles. Field names mirror the three
// rows on that page (New Idea Alerts / Likes / Comments) rather than the
// User entity's notify_* column names, so the frontend can send/receive
// this DTO with no remapping.
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPreferencesDTO {
    private boolean newIdeas;
    private boolean likes;
    private boolean comments;
}

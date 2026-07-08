package com.ideaspark.dto;

import com.ideaspark.model.Notification;
import lombok.Data;

import java.util.UUID;

@Data
public class NotificationRequest {
    private UUID targetUserId;      // who this notification is for
    private String message;
    private UUID referenceId;       // optional, e.g. idea id
    private Notification.NotificationType type;
    private UUID conversationId;    // optional, only for MESSAGE type
}
package com.ideaspark.dto;

import com.ideaspark.model.Message.MessageType;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class MessageDTO {
    private UUID id;
    private UUID conversationId;
    private UUID senderId;
    private String senderName;
    private String senderAvatar;
    private MessageType type;
    private String content;
    private boolean isRead;
    // The viewing user's own emoji reaction on this message (null if none).
    private String reaction;
    private LocalDateTime createdAt;
}

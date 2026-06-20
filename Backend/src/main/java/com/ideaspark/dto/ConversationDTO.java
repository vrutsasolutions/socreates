package com.ideaspark.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ConversationDTO {
    private UUID id;

    // The other person (not the logged-in user)
    private UUID otherUserId;
    private String otherUserName;
    private String otherUserAvatar;
    private boolean otherUserOnline; // placeholder, always false for now
    private LocalDateTime otherUserLastSeen;

    // True when the other participant has Creator Pro (User.isPremium).
    // Drives the free-tier messaging limit (5 texts + 1 file) on the
    // frontend — see config/messagingLimits.js, Chat.jsx.
    private boolean otherUserVerifiedCreator;

    private String lastMessage;      // text preview or "Sent a photo" / "Voice note"
    private String lastMessageType;  // "TEXT", "IMAGE", "VOICE"
    private LocalDateTime lastMessageAt;
    private long unreadCount;
}

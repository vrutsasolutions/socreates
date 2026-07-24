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
    private boolean otherUserOnline;
    private LocalDateTime otherUserLastSeen;
    // False when the other user has turned Activity Status off in Settings.
    // The frontend must show neither "Online" nor "Offline" in that case —
    // otherUserOnline/otherUserLastSeen are always masked (false/null) when
    // this is false, but the header text still needs to know to render
    // nothing rather than falling back to "Offline". See MessageService.
    private boolean otherUserActivityStatusVisible;

    // True when the other participant has Creator Pro (User.isPremium).
    // Drives the free-tier messaging limit (5 texts + 1 file) on the
    // frontend — see config/messagingLimits.js, Chat.jsx.
    private boolean otherUserVerifiedCreator;

    private String lastMessage;      // text preview or "Sent a photo" / "Voice note"
    private String lastMessageType;  // "TEXT", "IMAGE", "VOICE"
    private LocalDateTime lastMessageAt;
    private long unreadCount;

    // "PENDING" or "ACCEPTED" — drives the message-request UI. PENDING
    // conversations only appear in the initiator's inbox; the other
    // participant only sees them under Message Requests until they accept.
    private String status;

    // True when the logged-in user is the one who started this
    // conversation. Lets the frontend tell "you sent a request, waiting"
    // apart from "you received a request, accept to reply" for the same
    // PENDING status.
    private boolean iInitiated;
}

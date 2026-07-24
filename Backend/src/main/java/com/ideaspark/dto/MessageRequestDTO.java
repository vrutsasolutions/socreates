package com.ideaspark.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * One row on the Message Requests page — a PENDING conversation someone
 * else started with the logged-in user. `id` is the conversation id, so
 * accepting navigates straight into /messages/{id}.
 */
@Data
public class MessageRequestDTO {
    private UUID id;               // conversation id

    private UUID fromUserId;
    private String name;
    private String avatar;         // profile image URL, may be null

    private String preview;        // last message text / type preview
    private LocalDateTime createdAt;
}

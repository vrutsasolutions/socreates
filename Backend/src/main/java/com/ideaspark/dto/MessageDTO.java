package com.ideaspark.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
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

    // createdAt is stored as a plain LocalDateTime (no zone info), taken
    // from the server's JVM clock. Without this annotation, Jackson
    // serializes it with no offset/'Z' suffix, and the frontend's
    // `new Date(value)` then misreads it as the BROWSER's local time
    // instead of the server's time — producing wrong timestamps for
    // anyone not in the server's timezone.
    //
    // This annotation forces the output to end in 'Z' so the frontend
    // correctly treats it as UTC. IMPORTANT: this is only correct if the
    // backend server's clock actually runs in UTC (true for most cloud
    // instances/containers by default). If your server's JVM timezone is
    // NOT UTC, either set `-Duser.timezone=UTC` on the JVM, or change the
    // `timezone` value below to match the server's actual zone.
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", timezone = "UTC")
    private LocalDateTime createdAt;
}
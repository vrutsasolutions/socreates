package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    // "TEXT", "IMAGE", "VOICE", "FILE"
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private MessageType type;

    // For TEXT: the message text. For IMAGE/VOICE/FILE: the R2 file URL.
    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "is_read")
    private boolean isRead = false;

    // Emoji reactions keyed by reacting user's id (one emoji per user per message).
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "message_reactions", joinColumns = @JoinColumn(name = "message_id"))
    @MapKeyColumn(name = "user_id")
    @Column(name = "emoji", length = 16)
    @Builder.Default
    private Map<UUID, String> reactions = new HashMap<>();

    // Ids of users who deleted this message only for themselves ("delete for me").
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "message_deleted_for", joinColumns = @JoinColumn(name = "message_id"))
    @Column(name = "user_id")
    @Builder.Default
    private Set<UUID> deletedFor = new HashSet<>();

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum MessageType {
        TEXT, IMAGE, VOICE, FILE
    }
}

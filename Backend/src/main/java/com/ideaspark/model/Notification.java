package com.ideaspark.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "read_status")
    private boolean readStatus = false;

    // ID of the related entity (e.g. idea) so the frontend can deep-link
    // the notification to the right page (e.g. /ideas/{referenceId}).
    @Column(name = "reference_id")
    private UUID referenceId;

    // Kind of activity this notification represents. The frontend uses this
    // to decide whether the notification belongs in the bell (idea activity:
    // LIKE/FOLLOW/COMMENT/BOOKMARK/SYSTEM) or in the message icon (MESSAGE —
    // any DM, including text/photo/voice/file/shared-idea sent in a chat).
    // Defaults to SYSTEM so older rows / callers that don't set it still work.
    @Enumerated(EnumType.STRING)
    @Column(name = "type", length = 20)
    @Builder.Default
    private NotificationType type = NotificationType.SYSTEM;

    // Set only for MESSAGE-type notifications, so the message icon can take
    // the user straight to the relevant chat (/messages/{conversationId}).
    @Column(name = "conversation_id")
    private UUID conversationId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public enum NotificationType {
        LIKE, FOLLOW, COMMENT, BOOKMARK, MESSAGE, SYSTEM, NEW_IDEA
    }
}

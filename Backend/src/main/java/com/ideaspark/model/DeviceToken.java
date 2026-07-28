package com.ideaspark.model;

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
@Table(name = "device_tokens")
public class DeviceToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // The FCM registration token itself. Can be long (Google doesn't publish
    // a hard cap; observed tokens run 140-250+ chars), so TEXT rather than a
    // capped VARCHAR to avoid truncation errors.
    @Column(name = "device_token", nullable = false, columnDefinition = "TEXT")
    private String deviceToken;

    // "android" today; kept as free text (not an enum) so iOS can be added
    // later without a migration.
    @Column(name = "platform", nullable = false, length = 20)
    private String platform;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
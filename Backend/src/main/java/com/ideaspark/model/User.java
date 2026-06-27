package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    // Stored lowercase, like Instagram handles. Unique across all users.
    // Column left nullable so ddl-auto=update doesn't fail on pre-existing NULL
    // rows.
    @Column(unique = true, length = 30)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(name = "profile_image")
    private String profileImage;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "is_premium")
    private boolean isPremium = false;

    @Column(name = "is_verified")
    private boolean isVerified = false;

    // ── Creator-tier flags ──────────────────────────────────────────────────
    // Boolean (wrapper) so existing NULL rows in DB don't throw on load.
    // Treat null as false everywhere via isCreatorPro() / isPremiumPublishing().
    @Column(name = "is_creator_pro")
    private Boolean creatorPro = false;

    @Column(name = "is_premium_publishing")
    private Boolean premiumPublishing = false;

    @Column(name = "is_online")
    private Boolean online = false;

    @Column(name = "last_seen")
    private LocalDateTime lastSeen;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

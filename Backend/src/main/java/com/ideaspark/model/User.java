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

    
    

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "active_payout_account_id")
    private PayoutAccount activePayoutAccount;

    // ── In-app (bell) notification preferences ──────────────────────────────
    // Controls whether Settings → Notifications toggles let this user receive
    // each activity type in the bell component. Column has a NOT NULL DEFAULT
    // true in the DB (see migration), so both existing rows and new signups
    // start opted-in. @Builder.Default keeps User.builder() consistent with
    // that same default when no value is explicitly set.
    @Column(name = "notify_new_ideas", nullable = false)
    @Builder.Default
    private boolean notifyNewIdeas = true;

    @Column(name = "notify_likes", nullable = false)
    @Builder.Default
    private boolean notifyLikes = true;

    @Column(name = "notify_comments", nullable = false)
    @Builder.Default
    private boolean notifyComments = true;

    // ── Privacy: Activity Status toggle ─────────────────────────────────────
    // When false, this user's online/offline state is never broadcast to
    // other users (they always appear offline/hidden). See PresenceService.
    // Defaults to true (visible), same NOT NULL DEFAULT true pattern as the
    // notify_* columns above.
    @Column(name = "show_activity_status", nullable = false)
    @Builder.Default
    private boolean showActivityStatus = true;

    // ── Privacy: Public Profile toggle ──────────────────────────────────────
    // true  (default) = public account, current behaviour: anyone can follow
    //                   instantly, ideas surface in every feed and on the
    //                   profile page.
    // false           = private account:
    //                     • following requires an approved FollowRequest
    //                     • ideas are hidden from non-followers' feeds and
    //                       from the profile page (see ProfilePrivacyService)
    //
    // Flipping this true → false converts every existing follower into a
    // PENDING FollowRequest the owner can approve or reject, and notifies
    // them. Flipping back false → true auto-accepts anything still pending,
    // so a round-trip is lossless. That conversion lives in
    // ProfilePrivacyService.setPublicProfile() — do NOT set this field
    // directly on a managed User and save it, or the follower graph and the
    // flag will silently disagree.
    //
    // Same NOT NULL DEFAULT true pattern as the notify_* columns above, so
    // existing rows and new signups both start public.
    @Column(name = "is_public_profile", nullable = false)
    @Builder.Default
    private boolean publicProfile = true;

    @Column(name = "is_online")
    private Boolean online = false;

    @Column(name = "last_seen")
    private LocalDateTime lastSeen;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "auth_provider")
    private String authProvider = "local";

    // Embedded in every JWT as the "tv" claim (see JwtUtil). Bumping this
    // (password change, forgot-password reset, explicit logout) makes every
    // token issued before the bump fail JwtFilter's version check, even
    // though it's still within its 24h expiry. @Builder.Default so
    // User.builder() matches the DB's NOT NULL DEFAULT 0 for new signups.
    @Column(name = "token_version", nullable = false)
    @Builder.Default
    private int tokenVersion = 0;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
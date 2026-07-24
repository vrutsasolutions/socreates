package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A permanent registration block on an email address.
 *
 * Created when an admin deletes a user's account for a policy violation
 * (e.g. restricted/prohibited uploaded content). Unlike a normal account
 * deletion — where the user row is gone and the email is free to reuse —
 * a row here survives the user deletion and is checked at registration
 * (and Google sign-in) time so the same person can't just sign back up
 * with the same address.
 *
 * This is intentionally NOT a foreign key to users.id: the whole point is
 * that it outlives the user row it was created from.
 */
@Entity
@Table(name = "banned_emails")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BannedEmail {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Stored lowercase/trimmed, same normalization as User.email, so lookups
    // at registration time are a straight equality check.
    @Column(nullable = false, unique = true, length = 150)
    private String email;

    // Free-text moderation note, e.g. "Uploaded restricted content — CSAM
    // report" or "Repeated harassment reports". Shown to admins only, never
    // surfaced to the user.
    @Column(columnDefinition = "TEXT")
    private String reason;

    // Email of the admin who issued the ban, for an audit trail.
    @Column(name = "banned_by")
    private String bannedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
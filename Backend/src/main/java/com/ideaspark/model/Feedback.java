package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Maps to the  feedback  table in Supabase.
 *
 * One row per user (unique on user_id) — the Settings > Support > Feedback
 * card is a genuine one-time survey: once a row exists for a user,
 * FeedbackController rejects further submissions and Settings.jsx disables
 * the row entirely (shows "Completed", not clickable). The unique
 * constraint on user_id is the DB-level backstop for that rule.
 */
@Entity
@Table(name = "feedback")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    /** 1–5 stars. */
    @Column(nullable = false)
    private int rating;

    /** Free-text experience / requested changes / fixes. Optional. */
    @Column(columnDefinition = "TEXT")
    private String review;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

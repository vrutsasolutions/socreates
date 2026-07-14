package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

// ── IdeaRead ─────────────────────────────────────────────────
// One row per (user, PREMIUM idea) the one and only time a free-plan reader
// is granted full access to that premium idea's detail page. Normal
// (non-premium) ideas are never written here — they're unlimited for every
// signed-in reader, so there's nothing to track.
//
// Used to enforce two rules together (see IdeaService.PREMIUM_FREE_READ_LIMIT
// and IdeaService.getById()):
//   1. A free-plan reader can spend at most PREMIUM_FREE_READ_LIMIT slots
//      (one per distinct premium idea) — countByUserId() against this table.
//   2. Once a slot has been spent on a given premium idea, reopening that
//      SAME idea never grants full access again — existsByUserIdAndIdeaId()
//      is checked BEFORE granting, and a hit locks the idea (blurred) rather
//      than unlocking it, unlike a typical "already unlocked" cache.
// Reader-premium and creator-pro users are exempt and never get rows written
// here.
//
// Deliberately NOT the same thing as Idea.readCount (an anonymous, per-idea
// aggregate counter bumped by CreatorController's public /read endpoint on
// every view). This table is per-user and only ever grows by at most
// PREMIUM_FREE_READ_LIMIT rows per free user, by design.
@Entity
@Table(name = "idea_reads",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "idea_id"}))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class IdeaRead {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "idea_id", nullable = false)
    private Idea idea;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @PrePersist
    protected void onCreate() { readAt = LocalDateTime.now(); }
}

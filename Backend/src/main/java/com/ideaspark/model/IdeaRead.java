package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

// ── IdeaRead ─────────────────────────────────────────────────
// One row per (user, idea) the very first time a free-plan reader is granted
// full access to that idea's detail page. Used only to enforce the free-plan
// lifetime read cap (see IdeaService.FREE_READ_LIMIT) — reader-premium and
// creator-pro users are exempt and never get rows written here.
//
// Deliberately NOT the same thing as Idea.readCount (an anonymous, per-idea
// aggregate counter bumped by CreatorController's public /read endpoint on
// every view). This table is per-user and only ever grows by at most
// FREE_READ_LIMIT rows per free user, by design.
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

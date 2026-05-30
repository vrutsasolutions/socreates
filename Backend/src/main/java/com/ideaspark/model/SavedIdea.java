package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

// ── SavedIdea ────────────────────────────────────────────────
@Entity
@Table(name = "saved_ideas",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "idea_id"}))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SavedIdea {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "idea_id", nullable = false)
    private Idea idea;

    @Column(name = "saved_at")
    private LocalDateTime savedAt;

    @PrePersist
    protected void onCreate() { savedAt = LocalDateTime.now(); }
}

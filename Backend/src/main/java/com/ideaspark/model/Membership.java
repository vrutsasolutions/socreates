package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

// ── Membership ───────────────────────────────────────────────
@Entity
@Table(name = "membership")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Membership {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 20)
    private String plan; // "monthly" | "yearly"

    @Column(length = 20)
    private String status = "active";

    @Column(name = "payment_id")
    private String paymentId;

    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDateTime endDate;

    @PrePersist
    protected void onCreate() { startDate = LocalDateTime.now(); }
}

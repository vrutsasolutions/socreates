package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "conversations",
       uniqueConstraints = @UniqueConstraint(columnNames = {"participant1_id", "participant2_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant1_id", nullable = false)
    private User participant1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant2_id", nullable = false)
    private User participant2;

    // Who sent the first message / opened this conversation. Drives the
    // message-request flow: only the initiator may send while the
    // conversation is PENDING, and only the *other* participant may
    // accept/decline it. Nullable so rows created before this feature
    // (or seed data) don't blow up — treated as already-accepted, see
    // MessageService.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "initiated_by")
    private User initiatedBy;

    // PENDING   -> initiator has messaged but the other participant hasn't
    //              accepted yet; only the initiator can send.
    // ACCEPTED  -> both participants can message freely.
    // Rows with a null status (pre-existing data) are treated as ACCEPTED.
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    @Builder.Default
    private Status status = Status.ACCEPTED;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum Status {
        PENDING,
        ACCEPTED
    }
}

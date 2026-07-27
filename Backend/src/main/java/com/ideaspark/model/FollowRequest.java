package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A pending "can I follow you?" request against a PRIVATE account.
 *
 * <p>Only exists while the request is outstanding. Approving deletes this row
 * and inserts the real {@link Follow}; declining just deletes it, leaving the
 * requester free to ask again later — the same lifecycle the message-request
 * flow uses in {@code MessageService.declineRequest()}.
 *
 * <p>Rows are also created in bulk when a user switches their profile from
 * public to private: every existing follower is converted into a PENDING
 * request here and the corresponding {@link Follow} row is deleted, so the
 * owner gets to approve or reject the people who were already following them.
 * See {@code ProfilePrivacyService.setPublicProfile()}.
 *
 * <p>Public accounts never produce rows here — {@code FollowService.follow()}
 * writes the {@link Follow} straight away for those.
 */
@Entity
@Table(name = "follow_requests",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"requester_id", "target_id"}
        )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FollowRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** The person asking to follow. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    /** The private account being asked. Only this user may accept/decline. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_id", nullable = false)
    private User target;

    /**
     * In practice only ever PENDING, because accept and decline both delete
     * the row. ACCEPTED/DECLINED are defined so that retaining history later
     * is a code change rather than another migration against the live DB.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /** Set when accepted/declined. Null while pending. */
    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public enum Status {
        PENDING,
        ACCEPTED,
        DECLINED
    }
}

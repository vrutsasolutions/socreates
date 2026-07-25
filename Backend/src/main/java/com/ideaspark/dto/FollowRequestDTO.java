package com.ideaspark.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * One row on the Follow Requests page — somebody waiting on approval to
 * follow the logged-in user's private account.
 *
 * <p>{@code id} is the request id (used for accept/decline); {@code userId} is
 * the requester, so tapping the row can deep-link to /users/{userId}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowRequestDTO {

    /** FollowRequest id — pass this to accept/decline. */
    private UUID id;

    /** The requester's user id — for navigating to their profile. */
    private UUID userId;

    private String name;
    private String username;
    private String profileImage;
    private String bio;

    /**
     * When the request was raised. For requests auto-created by a
     * public → private switch this is the moment of the switch, not the
     * original follow date.
     */
    private LocalDateTime createdAt;
}

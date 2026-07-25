package com.ideaspark.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Result of a follow / unfollow tap.
 *
 * <p>Replaces the bare {@code String} the endpoint used to return. Pressing
 * "Follow" no longer has a single outcome — against a private account it
 * creates a pending request instead of a follow — and the frontend has to
 * render a different button state for each, so the outcome needs to come back
 * as a machine-readable code rather than prose.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowActionResponse {

    /**
     * One of:
     * <ul>
     *   <li>{@code FOLLOWING}          — public account, follow took effect now</li>
     *   <li>{@code REQUESTED}          — private account, request created and awaiting approval</li>
     *   <li>{@code ALREADY_FOLLOWING}  — no-op, follow row already existed</li>
     *   <li>{@code ALREADY_REQUESTED}  — no-op, request already pending</li>
     *   <li>{@code UNFOLLOWED}         — follow row deleted</li>
     *   <li>{@code REQUEST_CANCELLED}  — pending request withdrawn</li>
     *   <li>{@code NOT_FOLLOWING}      — no-op, nothing to undo</li>
     * </ul>
     */
    private String status;

    /** Human-readable version of {@link #status}, safe to surface in a toast. */
    private String message;
}

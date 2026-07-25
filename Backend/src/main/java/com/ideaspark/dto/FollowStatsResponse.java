package com.ideaspark.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowStatsResponse {
    private long followersCount;
    private long followingCount;

    // Explicit @JsonProperty pins the serialized JSON key to exactly
    // "isFollowing", regardless of what Lombok names the generated getter.
    //
    // Why this is needed: for a boolean field named "isFollowing", Lombok
    // generates the getter isFollowing() (it doesn't double the "is"
    // prefix). Jackson then derives the JSON property name from that
    // getter by stripping the leading "is" — producing the key
    // "following", NOT "isFollowing". The frontend reads data.isFollowing,
    // so it silently always saw undefined. @JsonProperty bypasses that
    // derivation entirely.
    @JsonProperty("isFollowing")
    private boolean isFollowing;

    // ── Private-profile fields ──────────────────────────────────────────────
    // All four below are pinned with @JsonProperty for the same reason as
    // isFollowing above — never rely on Jackson's is-prefix stripping here.

    // The viewer has an outstanding FollowRequest against this profile that
    // the owner hasn't answered yet. Drives the "Requested" button state,
    // which is distinct from both "Follow" and "Following".
    @JsonProperty("requestPending")
    private boolean requestPending;

    // This profile's privacy setting. false = private account, which is what
    // makes the frontend render the lock panel instead of the idea grid.
    @JsonProperty("isPublicProfile")
    private boolean isPublicProfile;

    // Server-computed answer to "may the viewer see this profile's ideas?".
    // Computed here rather than derived client-side from isPublicProfile +
    // isFollowing so the rule lives in exactly one place
    // (ProfilePrivacyService.canViewProfileIdeas) and the UI can't drift out
    // of sync with what /api/ideas/by-user actually returns.
    //
    // NOTE: this is a UI hint only. The ideas endpoint independently applies
    // the same check server-side, so a tampered client gains nothing.
    @JsonProperty("canViewIdeas")
    private boolean canViewIdeas;
}

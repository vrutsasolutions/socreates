package com.ideaspark.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Settings → Privacy toggles.
 *
 * <p>Both fields are backend-controlled. Public Profile used to be hard-locked
 * ON in the UI with no field here; it is now a real, persisted setting —
 * see {@code ProfilePrivacyService}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PrivacyPreferencesDTO {

    private boolean showActivityStatus;

    /**
     * true = public account (default), false = private.
     *
     * <p>Pinned with @JsonProperty for the same Jackson is-prefix reason
     * documented on {@code FollowStatsResponse.isFollowing} — Lombok names
     * the getter {@code isPublicProfile()} and Jackson would otherwise be
     * free to serialize it under a different key than the frontend reads.
     *
     * <p>Turning this OFF is not a plain field write: it converts every
     * existing follower into a pending follow request and notifies them.
     * The PUT handler delegates to {@code ProfilePrivacyService} for that —
     * don't set {@code User.publicProfile} directly anywhere else.
     */
    @JsonProperty("publicProfile")
    private boolean publicProfile;
}

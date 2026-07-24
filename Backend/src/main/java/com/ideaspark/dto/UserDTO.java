package com.ideaspark.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.UUID;

@Data
public class UserDTO {
    private UUID id;
    private String name;
    private String username;
    private String email;
    private String profileImage;
    private String bio;
    private String authProvider;
    // Pin the JSON key to "isPremium". For a boolean field "isPremium" Lombok
    // generates the getter isPremium(); Jackson then strips the "is" prefix and
    // would serialize it as "premium" — but the frontend reads user.isPremium,
    // so without this the flag is undefined on every UserDTO-sourced response
    // (login/register/google), which silently dropped premium state on re-login.
    // Same gotcha and fix as FollowStatsResponse.isFollowing.
    @JsonProperty("isPremium")
    private boolean isPremium;
    // Same Jackson-boolean-naming gotcha as isPremium above. Purely a UI hint
    // so the frontend can show/hide the admin-only "ban and delete" button —
    // the server still independently checks ROLE_ADMIN on the actual delete
    // call, so this being stale or spoofed client-side changes nothing
    // security-wise.
    @JsonProperty("isAdmin")
    private boolean isAdmin;
    private int ideasCount;
    private int likesCount;
    private int savedCount;
    // Full membership descriptor (plan, billing, planLabel, price, status,
    // startedAt, renewsAt, stats) so re-login restores the same shape that
    // /payment/subscribe persists. Null when the user has no active membership.
    private Object membership;
}
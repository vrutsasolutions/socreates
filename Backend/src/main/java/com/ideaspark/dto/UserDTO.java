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
    // Pin the JSON key to "isPremium". For a boolean field "isPremium" Lombok
    // generates the getter isPremium(); Jackson then strips the "is" prefix and
    // would serialize it as "premium" — but the frontend reads user.isPremium,
    // so without this the flag is undefined on every UserDTO-sourced response
    // (login/register/google), which silently dropped premium state on re-login.
    // Same gotcha and fix as FollowStatsResponse.isFollowing.
    @JsonProperty("isPremium")
    private boolean isPremium;
    private int ideasCount;
    private int likesCount;
    private int savedCount;
    // Full membership descriptor (plan, billing, planLabel, price, status,
    // startedAt, renewsAt, stats) so re-login restores the same shape that
    // /payment/subscribe persists. Null when the user has no active membership.
    private Object membership;
}
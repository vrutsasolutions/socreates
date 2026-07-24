package com.ideaspark.controller;

import com.ideaspark.dto.BanUserRequest;
import com.ideaspark.model.User;
import com.ideaspark.repository.UserRepository;
import com.ideaspark.service.UserAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Moderation actions on user accounts. Same ROLE_ADMIN pattern as
 * AdminRevenueController: SecurityConfig gates the URL prefix AND this
 * class carries @PreAuthorize as defense in depth. ROLE_ADMIN is granted
 * only to app.admin.email (see UserDetailsServiceImpl).
 */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserRepository userRepository;
    private final UserAccountService userAccountService;

    /**
     * Deletes a user's account (all their data — ideas, comments, messages,
     * earnings, etc.) AND permanently blocks their email from registering
     * a new account.
     *
     * Use this — not the self-service DELETE /api/users/me path — for
     * policy-violation removals (e.g. a creator uploaded restricted or
     * prohibited content), since the self-service path only deletes the
     * account and leaves the email free to sign up again.
     *
     * Example: DELETE /api/admin/users/{id}
     * Body: { "reason": "Uploaded restricted content" }
     */
    @Transactional
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> banAndDeleteUser(
            @PathVariable UUID id,
            @RequestBody(required = false) BanUserRequest request,
            @AuthenticationPrincipal UserDetails adminDetails
    ) {
        User user = userRepository.findById(id).orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found"));
        }

        String reason = request != null && request.getReason() != null
                ? request.getReason().trim()
                : null;

        String bannedBy = adminDetails != null
                ? adminDetails.getUsername()
                : "unknown";

        userAccountService.deleteAndBan(user, reason, bannedBy);

        return ResponseEntity.ok(Map.of(
                "message",
                "Account deleted and email permanently blocked from re-registration"
        ));
    }
}
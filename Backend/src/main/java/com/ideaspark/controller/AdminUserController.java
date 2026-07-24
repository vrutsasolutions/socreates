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
 * Moderation actions on user accounts.
 * Deletes a user's account and permanently blocks their email
 * from creating another account.
 */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserRepository userRepository;
    private final UserAccountService userAccountService;

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
                    .body(Map.of(
                            "message",
                            "User not found."
                    ));
        }

        String bannedBy = adminDetails != null
                ? adminDetails.getUsername()
                : "unknown";

        // Prevent admin from banning themselves
        if (user.getEmail().equalsIgnoreCase(bannedBy)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                            "message",
                            "You cannot ban your own account."
                    ));
        }

        String reason = request != null && request.getReason() != null
                ? request.getReason().trim()
                : "";

        if (reason.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                            "message",
                            "Please provide a reason for banning this user."
                    ));
        }

        userAccountService.deleteAndBan(
                user,
                reason,
                bannedBy
        );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "User account has been permanently deleted and the email has been blocked from future registrations."
                )
        );
    }
}
package com.ideaspark.controller;

import com.ideaspark.dto.*;
import com.ideaspark.model.Conversation;
import com.ideaspark.model.User;
import com.ideaspark.repository.*;
import com.ideaspark.service.CloudflareImageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;
    private final com.ideaspark.service.AuthService authService;
    private final CloudflareImageService cloudflareImageService;
    private final IdeaRepository ideaRepository;
    private final SavedIdeaRepository savedIdeaRepository;
    private final FollowRepository followRepository;
    private final com.ideaspark.service.PresenceService presenceService;
    private final com.ideaspark.service.UserAccountService userAccountService;

    @GetMapping("/me")
    public ResponseEntity<UserDTO> getMe(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(toDTO(user));
    }

    @PutMapping(value = "/me", consumes = { "multipart/form-data" })
    public ResponseEntity<UserDTO> updateMe(
            @RequestPart("profile") String profileJson,
            @RequestPart(value = "avatar", required = false) MultipartFile avatar,
            @AuthenticationPrincipal UserDetails userDetails) throws Exception {

        UpdateProfileRequest req = objectMapper.readValue(profileJson, UpdateProfileRequest.class);
        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();

        if (req.getName() != null && !req.getName().isBlank()) {
            user.setName(req.getName());
        }

        if (req.getUsername() != null && !req.getUsername().isBlank()) {
            String newUsername = authService.normalizeUsername(req.getUsername());
            if (!newUsername.equals(user.getUsername())
                    && userRepository.existsByUsername(newUsername)) {
                throw new RuntimeException("Username '" + newUsername + "' is already taken");
            }
            user.setUsername(newUsername);
        }

        if (req.getBio() != null) {
            user.setBio(req.getBio());
        }

        if (avatar != null && !avatar.isEmpty()) {
            String imageUrl = cloudflareImageService.upload(avatar);
            user.setProfileImage(imageUrl);
        }

        User savedUser = userRepository.save(user);
        return ResponseEntity.ok(toDTO(savedUser));
    }

    // PUT /api/users/me/password
    // Powers the "Password" tab on Edit Profile. This endpoint was missing
    // entirely — the frontend called it, got a 404, and every attempt fell
    // through to GlobalExceptionHandler's generic 500 message ("Something
    // went wrong. Please try again later."), which is exactly what was
    // being shown on screen.
    @PutMapping("/me/password")
    public ResponseEntity<Map<String, String>> changePassword(
            @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();

        // Google-auth accounts have no local password to change/verify against.
        if ("google".equalsIgnoreCase(user.getAuthProvider())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Your account signs in with Google and has no password to change"));
        }

        if (request == null
                || request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()
                || request.getNewPassword() == null || request.getNewPassword().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Current and new password are required"));
        }

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            return ResponseEntity.status(401)
                    .body(Map.of("message", "Current password is incorrect"));
        }

        if (request.getNewPassword().length() < 6) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "New password must be at least 6 characters"));
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "New password must be different from the current password"));
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    // GET /api/users/me/privacy-preferences
    // Powers the Settings → Privacy → Activity Status toggle on page load.
    @GetMapping("/me/privacy-preferences")
    public ResponseEntity<PrivacyPreferencesDTO> getPrivacyPreferences(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(new PrivacyPreferencesDTO(user.isShowActivityStatus()));
    }

    // PUT /api/users/me/privacy-preferences
    // Persists the toggle and immediately re-broadcasts presence so any open
    // chat reflects the change right away (see PresenceService.refreshPresence).
    @PutMapping("/me/privacy-preferences")
    public ResponseEntity<PrivacyPreferencesDTO> updatePrivacyPreferences(
            @RequestBody PrivacyPreferencesDTO req,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        user.setShowActivityStatus(req.isShowActivityStatus());
        User saved = userRepository.save(user);
        presenceService.refreshPresence(saved);
        return ResponseEntity.ok(req);
    }

    // GET /api/users/me/notification-preferences
    // Powers the Settings → Notifications toggles on page load.
    @GetMapping("/me/notification-preferences")
    public ResponseEntity<NotificationPreferencesDTO> getNotificationPreferences(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(new NotificationPreferencesDTO(
                user.isNotifyNewIdeas(), user.isNotifyLikes(), user.isNotifyComments()));
    }

    // PUT /api/users/me/notification-preferences
    // Persists a toggle flip. Takes effect immediately for future in-app
    // (bell) notifications — see NotificationService.sendNotification.
    @PutMapping("/me/notification-preferences")
    public ResponseEntity<NotificationPreferencesDTO> updateNotificationPreferences(
            @RequestBody NotificationPreferencesDTO req,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        user.setNotifyNewIdeas(req.isNewIdeas());
        user.setNotifyLikes(req.isLikes());
        user.setNotifyComments(req.isComments());
        userRepository.save(user);
        return ResponseEntity.ok(req);
    }

    @PostMapping("/interests")
    public ResponseEntity<ApiResponse> saveInterests(
            @RequestBody java.util.Map<String, List<String>> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(new ApiResponse(true, "Interests saved"));
    }

    @GetMapping("/suggested-creators")
    public ResponseEntity<List<UserDTO>> getSuggestedCreators(
            @AuthenticationPrincipal UserDetails userDetails) {

        User current = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        UUID currentId = current.getId();

        // IDs the current user already follows — excluded from suggestions.
        Set<UUID> followingIds = followRepository.findByFollower(current).stream()
                .map(f -> f.getFollowing().getId())
                .collect(Collectors.toSet());

        List<User> candidates = userRepository.findAll().stream()
                .filter(u -> !u.getId().equals(currentId)) // never suggest yourself
                .filter(u -> !followingIds.contains(u.getId())) // skip people you already follow
                .collect(Collectors.toCollection(java.util.ArrayList::new));

        // Dynamic: shuffle so the rail differs per user and per load instead of
        // always returning the same first 10 rows.
        Collections.shuffle(candidates);

        List<UserDTO> suggestions = candidates.stream()
                .limit(10)
                .map(this::toDTO)
                .toList();

        return ResponseEntity.ok(suggestions);
    }

    @PostMapping("/follow-bulk")
    public ResponseEntity<ApiResponse> followBulk(
            @RequestBody java.util.Map<String, List<String>> body) {
        return ResponseEntity.ok(new ApiResponse(true, "Following updated"));
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserDTO>> searchUsers(
            @RequestParam String q) {
        List<User> users = userRepository.findAll()
                .stream()
                .filter(u -> (u.getName() != null && u.getName().toLowerCase().contains(q.toLowerCase()))
                        || (u.getUsername() != null && u.getUsername().toLowerCase().contains(q.toLowerCase())))
                .limit(20)
                .toList();
        return ResponseEntity.ok(users.stream().map(this::toDTO).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUserById(@PathVariable UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(toDTO(user));
    }

    @Transactional
    @DeleteMapping("/me")
    public ResponseEntity<Map<String, String>> deleteAccount(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody DeleteAccountRequest request) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(401)
                        .body(Map.of("message", "User not authenticated"));
            }

            User user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            boolean isGoogleUser = "google".equalsIgnoreCase(user.getAuthProvider());

            if (!isGoogleUser) {

                if (request == null || request.getPassword() == null || request.getPassword().isBlank()) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("message", "Password is required"));
                }

                if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                    return ResponseEntity.status(401)
                            .body(Map.of("message", "Incorrect password"));
                }
            }

            // Cleanup order/FK handling lives in UserAccountService now, shared
            // with the admin moderation "ban and delete" endpoint.
            userAccountService.deleteAllUserData(user);

            return ResponseEntity.ok(Map.of("message", "Account deleted successfully"));

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Failed to delete account: " + e.getMessage()));
        }
    }

    private UserDTO toDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setProfileImage(user.getProfileImage());
        dto.setBio(user.getBio());
        dto.setAuthProvider(user.getAuthProvider());
        dto.setPremium(user.isPremium());
        dto.setIdeasCount(ideaRepository.countByCreatorId(user.getId()));
        dto.setLikesCount(ideaRepository.sumLikeCountByCreatorId(user.getId()));
        dto.setSavedCount((int) savedIdeaRepository.countByUserId(user.getId()));
        return dto;
    }
}
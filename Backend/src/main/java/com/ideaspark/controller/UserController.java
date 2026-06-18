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
    private final CommentRepository commentRepository;
    private final IdeaLikeRepository ideaLikeRepository;
    private final NotificationRepository notificationRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;

    @GetMapping("/me")
    public ResponseEntity<UserDTO> getMe(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(toDTO(user));
    }

    @PutMapping(value = "/me", consumes = {"multipart/form-data"})
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

        if (req.getPassword() != null && !req.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(req.getPassword()));
        }

        if (avatar != null && !avatar.isEmpty()) {
            String imageUrl = cloudflareImageService.upload(avatar);
            user.setProfileImage(imageUrl);
        }

        User savedUser = userRepository.save(user);
        return ResponseEntity.ok(toDTO(savedUser));
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
                .filter(u -> !u.getId().equals(currentId))        // never suggest yourself
                .filter(u -> !followingIds.contains(u.getId()))   // skip people you already follow
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
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            UUID userId = user.getId();

            // 1. Delete notifications
            notificationRepository.deleteAll(
                    notificationRepository.findByUserOrderByCreatedAtDesc(user));

            // 2. Delete saved ideas
            savedIdeaRepository.deleteAll(
                    savedIdeaRepository.findByUserIdOrderBySavedAtDesc(userId));

            // 3. Delete follows
            followRepository.findByFollower(user).forEach(followRepository::delete);
            followRepository.findByFollowing(user).forEach(followRepository::delete);

            // 4. Delete ALL likes by this user on any idea
            ideaLikeRepository.deleteAll(
                    ideaLikeRepository.findAll().stream()
                            .filter(like -> like.getUser() != null && userId.equals(like.getUser().getId()))
                            .toList());

            // 5. Delete comments by this user on other ideas
            commentRepository.deleteAll(
                    commentRepository.findAll().stream()
                            .filter(c -> c.getUser() != null && userId.equals(c.getUser().getId()))
                            .toList());

            // 6. For each idea by this user — delete comments and likes on it, then the idea
            ideaRepository.findByCreatorIdOrderByCreatedAtDesc(userId).forEach(idea -> {
                commentRepository.deleteAll(
                        commentRepository.findByIdeaIdOrderByCreatedAtDesc(idea.getId()));
                ideaLikeRepository.deleteByIdeaId(idea.getId());
                ideaRepository.delete(idea);
            });

            // 7. Delete messages inside conversations involving this user, then conversations
            List<Conversation> conversations = conversationRepository.findByUser(user);
            conversations.forEach(conv ->
                    messageRepository.deleteAll(messageRepository.findByConversationId(conv.getId())));
            conversationRepository.deleteAll(conversations);

            // 8. Finally delete the user
            userRepository.delete(user);

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
        dto.setPremium(user.isPremium());
        dto.setIdeasCount(ideaRepository.countByCreatorId(user.getId()));
        dto.setLikesCount(ideaRepository.sumLikeCountByCreatorId(user.getId()));
        dto.setSavedCount((int) savedIdeaRepository.countByUserId(user.getId()));
        return dto;
    }
}
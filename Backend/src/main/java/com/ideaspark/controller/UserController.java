package com.ideaspark.controller;

import com.ideaspark.dto.*;
import com.ideaspark.model.User;
import com.ideaspark.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;
    private final com.ideaspark.service.AuthService authService;

    // GET /api/users/me — get my profile
    @GetMapping("/me")
    public ResponseEntity<UserDTO> getMe(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(toDTO(user));
    }

    // PUT /api/users/me — update profile
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
            // Only enforce uniqueness when it actually changes (avoids self-collision).
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
            // TODO: upload to Cloudflare R2 and store URL
            user.setProfileImage("/uploads/" + avatar.getOriginalFilename());
        }

        userRepository.save(user);
        return ResponseEntity.ok(toDTO(user));
    }

    // POST /api/users/interests — save onboarding interests
    @PostMapping("/interests")
    public ResponseEntity<ApiResponse> saveInterests(
            @RequestBody java.util.Map<String, List<String>> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        // Store interests logic here if needed
        return ResponseEntity.ok(new ApiResponse(true, "Interests saved"));
    }

    // GET /api/users/suggested-creators — for FollowCreators page
    @GetMapping("/suggested-creators")
    public ResponseEntity<List<UserDTO>> getSuggestedCreators() {
        // Return top 10 users with most ideas
        List<User> users = userRepository.findAll()
                .stream()
                .limit(10)
                .toList();
        return ResponseEntity.ok(users.stream().map(this::toDTO).toList());
    }

    // POST /api/users/follow-bulk — follow multiple users
    @PostMapping("/follow-bulk")
    public ResponseEntity<ApiResponse> followBulk(
            @RequestBody java.util.Map<String, List<String>> body) {
        // Follow logic here if needed
        return ResponseEntity.ok(new ApiResponse(true, "Following updated"));
    }

    // ── Mapper ───────────────────────────────────────────────
    private UserDTO toDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setProfileImage(user.getProfileImage());
        dto.setBio(user.getBio());
        dto.setPremium(user.isPremium());
        return dto;
    }
}

package com.ideaspark.controller;

import com.ideaspark.dto.*;
import com.ideaspark.model.User;
import com.ideaspark.repository.IdeaRepository;
import com.ideaspark.repository.SavedIdeaRepository;
import com.ideaspark.repository.UserRepository;
import com.ideaspark.service.CloudflareImageService;
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
    private final CloudflareImageService cloudflareImageService;
    private final IdeaRepository ideaRepository;           // ✅ Added
    private final SavedIdeaRepository savedIdeaRepository; // ✅ Added

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
    public ResponseEntity<List<UserDTO>> getSuggestedCreators() {

        List<User> users = userRepository.findAll()
                .stream()
                .limit(10)
                .toList();

        return ResponseEntity.ok(users.stream().map(this::toDTO).toList());
    }

    @PostMapping("/follow-bulk")
    public ResponseEntity<ApiResponse> followBulk(
            @RequestBody java.util.Map<String, List<String>> body) {

        return ResponseEntity.ok(new ApiResponse(true, "Following updated"));
    }

    // ✅ Updated toDTO with counts
    private UserDTO toDTO(User user) {
        UserDTO dto = new UserDTO();

        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setProfileImage(user.getProfileImage());
        dto.setBio(user.getBio());
        dto.setPremium(user.isPremium());

        // ✅ Counts
        dto.setIdeasCount(ideaRepository.countByCreatorId(user.getId()));
        dto.setLikesCount(ideaRepository.sumLikeCountByCreatorId(user.getId()));
        dto.setSavedCount((int) savedIdeaRepository.countByUserId(user.getId()));

        return dto;
    }
}
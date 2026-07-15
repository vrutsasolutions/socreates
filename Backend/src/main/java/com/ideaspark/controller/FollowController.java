package com.ideaspark.controller;

import com.ideaspark.dto.FollowResponse;
import com.ideaspark.dto.FollowStatsResponse;
import com.ideaspark.model.User;
import com.ideaspark.repository.UserRepository;
import com.ideaspark.service.FollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/follow")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;
    private final UserRepository userRepository; // ✅ Added

    // ✅ Helper — get UUID from JWT token
    private UUID getCurrentUserId(UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }

    // Follow a user
    @PostMapping("/{targetUserId}")
    public ResponseEntity<String> follow(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID targetUserId) {
        UUID currentUserId = getCurrentUserId(userDetails);
        return ResponseEntity.ok(followService.follow(currentUserId, targetUserId));
    }

    // Unfollow a user
    @DeleteMapping("/{targetUserId}")
    public ResponseEntity<String> unfollow(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID targetUserId) {
        UUID currentUserId = getCurrentUserId(userDetails);
        return ResponseEntity.ok(followService.unfollow(currentUserId, targetUserId));
    }

    // Remove someone from YOUR followers list (they stop following you).
    // Distinct from unfollow above: that stops YOU following THEM; this
    // stops THEM following YOU. Kept under its own "/followers/" segment so
    // it can't collide with the single-segment "/{targetUserId}" mapping.
    @DeleteMapping("/followers/{followerUserId}")
    public ResponseEntity<String> removeFollower(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID followerUserId) {
        UUID currentUserId = getCurrentUserId(userDetails);
        return ResponseEntity.ok(followService.removeFollower(currentUserId, followerUserId));
    }

    // Get followers of a user
    @GetMapping("/{userId}/followers")
    public ResponseEntity<List<FollowResponse>> getFollowers(
            @PathVariable UUID userId) {
        return ResponseEntity.ok(followService.getFollowers(userId));
    }

    // Get following list of a user
    @GetMapping("/{userId}/following")
    public ResponseEntity<List<FollowResponse>> getFollowing(
            @PathVariable UUID userId) {
        return ResponseEntity.ok(followService.getFollowing(userId));
    }

    // Get follow stats (counts + isFollowing)
    @GetMapping("/{targetUserId}/stats")
    public ResponseEntity<FollowStatsResponse> getStats(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID targetUserId) {
        UUID currentUserId = getCurrentUserId(userDetails);
        return ResponseEntity.ok(followService.getFollowStats(currentUserId, targetUserId));
    }
}

package com.ideaspark.controller;

import com.ideaspark.dto.FollowResponse;
import com.ideaspark.dto.FollowStatsResponse;
import com.ideaspark.service.FollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/follow")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FollowController {

    private final FollowService followService;

    // Follow a user
    @PostMapping("/{targetUserId}")
    public ResponseEntity<String> follow(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID targetUserId) {
        return ResponseEntity.ok(followService.follow(currentUserId, targetUserId));
    }

    // Unfollow a user
    @DeleteMapping("/{targetUserId}")
    public ResponseEntity<String> unfollow(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID targetUserId) {
        return ResponseEntity.ok(followService.unfollow(currentUserId, targetUserId));
    }

    // Get followers of a user
    @GetMapping("/{userId}/followers")
    public ResponseEntity<List<FollowResponse>> getFollowers(@PathVariable UUID userId) {
        return ResponseEntity.ok(followService.getFollowers(userId));
    }

    // Get following list of a user
    @GetMapping("/{userId}/following")
    public ResponseEntity<List<FollowResponse>> getFollowing(@PathVariable UUID userId) {
        return ResponseEntity.ok(followService.getFollowing(userId));
    }

    // Get follow stats (counts + isFollowing)
    @GetMapping("/{targetUserId}/stats")
    public ResponseEntity<FollowStatsResponse> getStats(
            @RequestHeader("X-User-Id") UUID currentUserId,
            @PathVariable UUID targetUserId) {
        return ResponseEntity.ok(followService.getFollowStats(currentUserId, targetUserId));
    }
}

package com.ideaspark.controller;

import com.ideaspark.dto.FollowActionResponse;
import com.ideaspark.dto.FollowRequestDTO;
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
import java.util.Map;
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

    // Follow a user.
    //
    // Returns FollowActionResponse rather than the previous bare String,
    // because the outcome is no longer single-valued: against a private
    // account this raises a pending request ("REQUESTED") instead of
    // following ("FOLLOWING"), and the frontend renders a different button
    // state for each.
    @PostMapping("/{targetUserId}")
    public ResponseEntity<FollowActionResponse> follow(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID targetUserId) {
        UUID currentUserId = getCurrentUserId(userDetails);
        return ResponseEntity.ok(followService.follow(currentUserId, targetUserId));
    }

    // Unfollow a user — or, if there's no follow but there IS an outstanding
    // request, withdraw that instead. One endpoint covers both so the
    // frontend keeps a single toggle handler.
    @DeleteMapping("/{targetUserId}")
    public ResponseEntity<FollowActionResponse> unfollow(
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

    // ══════════════════════════════════════════════════════════════════════
    //  Follow requests (private accounts)
    //
    //  All mapped under the literal "/requests" segment. No collision with
    //  "/{userId}/followers" etc: Spring prefers literal path segments over
    //  variables, and the segment counts differ anyway.
    // ══════════════════════════════════════════════════════════════════════

    // Requests waiting on MY approval.
    @GetMapping("/requests")
    public ResponseEntity<List<FollowRequestDTO>> getPendingRequests(
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID currentUserId = getCurrentUserId(userDetails);
        return ResponseEntity.ok(followService.getPendingRequests(currentUserId));
    }

    // Badge count for the Follow Requests entry point.
    @GetMapping("/requests/count")
    public ResponseEntity<Map<String, Long>> countPendingRequests(
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID currentUserId = getCurrentUserId(userDetails);
        return ResponseEntity.ok(
                Map.of("count", followService.countPendingRequests(currentUserId)));
    }

    // Approve — creates the real follow row.
    @PostMapping("/requests/{requestId}/accept")
    public ResponseEntity<FollowActionResponse> acceptRequest(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID requestId) {
        UUID currentUserId = getCurrentUserId(userDetails);
        return ResponseEntity.ok(followService.acceptFollowRequest(currentUserId, requestId));
    }

    // Reject — deletes the request. The requester is not notified.
    @PostMapping("/requests/{requestId}/decline")
    public ResponseEntity<FollowActionResponse> declineRequest(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID requestId) {
        UUID currentUserId = getCurrentUserId(userDetails);
        return ResponseEntity.ok(followService.declineFollowRequest(currentUserId, requestId));
    }

    // ══════════════════════════════════════════════════════════════════════
    //  Lists and stats
    // ══════════════════════════════════════════════════════════════════════

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

    // Get follow stats (counts + isFollowing + privacy flags)
    @GetMapping("/{targetUserId}/stats")
    public ResponseEntity<FollowStatsResponse> getStats(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID targetUserId) {
        UUID currentUserId = getCurrentUserId(userDetails);
        return ResponseEntity.ok(followService.getFollowStats(currentUserId, targetUserId));
    }
}

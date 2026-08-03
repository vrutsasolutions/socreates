package com.ideaspark.service;

import com.ideaspark.dto.FollowActionResponse;
import com.ideaspark.dto.FollowRequestDTO;
import com.ideaspark.dto.FollowResponse;
import com.ideaspark.dto.FollowStatsResponse;
import com.ideaspark.model.Follow;
import com.ideaspark.model.FollowRequest;
import com.ideaspark.model.Notification;
import com.ideaspark.model.User;
import com.ideaspark.repository.FollowRepository;
import com.ideaspark.repository.FollowRequestRepository;
import com.ideaspark.repository.NotificationRepository;
import com.ideaspark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FollowService {

    private static final Logger log = LoggerFactory.getLogger(FollowService.class);

    private final FollowRepository followRepository;
    private final FollowRequestRepository followRequestRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository; // ✅ Added for direct save
    private final EmailService emailService;

    // ── Follower milestones: fire at each of these counts ────────────────────
    private static final Set<Long> FOLLOWER_MILESTONES = Set.of(10L, 50L, 100L, 500L, 1000L, 5000L, 10000L);

    private boolean isFollowerMilestone(long count) {
        if (FOLLOWER_MILESTONES.contains(count)) return true;      // early milestones
        if (count > 10000 && count % 10000 == 0) return true;      // every 10k after that
        return false;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  Follow / request
    // ══════════════════════════════════════════════════════════════════════

    /**
     * Tap "Follow".
     *
     * <p>Against a PUBLIC account this behaves exactly as before: the follow
     * row is written immediately and the target is notified.
     *
     * <p>Against a PRIVATE account it instead raises a pending
     * {@link FollowRequest} — no follow row, no follower count change — and
     * notifies the target that someone wants to follow them.
     */
    @Transactional
    public FollowActionResponse follow(UUID currentUserId, UUID targetUserId) {
        if (currentUserId.equals(targetUserId)) {
            throw new RuntimeException("You cannot follow yourself");
        }

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Current user not found"));
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("Target user not found"));

        // ✅ Return gracefully instead of throwing error
        if (followRepository.existsByFollowerAndFollowing(currentUser, targetUser)) {
            return FollowActionResponse.builder()
                    .status("ALREADY_FOLLOWING")
                    .message("Already following")
                    .build();
        }

        // ── Private target: this becomes a request, not a follow ────────────
        if (!targetUser.isPublicProfile()) {
            Optional<FollowRequest> existing =
                    followRequestRepository.findByRequesterAndTarget(currentUser, targetUser);

            if (existing.isPresent() && existing.get().getStatus() == FollowRequest.Status.PENDING) {
                return FollowActionResponse.builder()
                        .status("ALREADY_REQUESTED")
                        .message("Follow request already sent")
                        .build();
            }

            // Reuse any non-pending leftover row rather than inserting a
            // second one — (requester, target) is unique regardless of status.
            FollowRequest request = existing.orElseGet(() -> FollowRequest.builder()
                    .requester(currentUser)
                    .target(targetUser)
                    .build());
            request.setStatus(FollowRequest.Status.PENDING);
            request.setRespondedAt(null);
            followRequestRepository.save(request);

            notifyFollowRequest(currentUser, targetUser);

            return FollowActionResponse.builder()
                    .status("REQUESTED")
                    .message("Follow request sent")
                    .build();
        }

        // ── Public target: straight through ─────────────────────────────────
        createFollow(currentUser, targetUser);

        return FollowActionResponse.builder()
                .status("FOLLOWING")
                .message("Followed successfully")
                .build();
    }

    /**
     * Writes the follow row and fires the follow notification + milestone
     * email. Shared by the public-account path above and by
     * {@link #acceptFollowRequest}, so an approved request produces exactly
     * the same side effects as a direct follow.
     */
    private void createFollow(User follower, User target) {
        Follow follow = Follow.builder()
                .follower(follower)
                .following(target)
                .build();

        followRepository.save(follow);

        // ✅ Fixed notification — save directly + send via websocket
        try {
            String followerName = ProfilePrivacyService.displayNameOf(follower);

            Notification notification = Notification.builder()
                    .message(followerName + " started following you!")
                    .readStatus(false)
                    .type(Notification.NotificationType.FOLLOW)
                    .referenceId(follower.getId()) // ✅ lets the frontend deep-link to the follower's profile
                    .createdAt(LocalDateTime.now())
                    .user(target)
                    .build();

            // Save to DB first
            Notification saved = notificationRepository.save(notification);

            // Send real-time via WebSocket
            notificationService.sendNotification(saved);

            log.info("Follow notification sent to: {}", target.getEmail());

        } catch (Exception e) {
            log.warn("Follow notification failed: {}", e.getMessage(), e);
        }

        // ── Follower milestone email ──────────────────────────────────────────
        try {
            long totalFollowers = followRepository.countByFollowing(target);
            if (isFollowerMilestone(totalFollowers)) {
                String displayName = (target.getName() != null && !target.getName().isBlank())
                        ? target.getName()
                        : (target.getUsername() != null ? target.getUsername() : "Creator");
                emailService.sendFollowerMilestoneEmail(
                        target.getEmail(),
                        displayName,
                        totalFollowers
                );
            }
        } catch (Exception e) {
            log.warn("Follower milestone email failed: {}", e.getMessage(), e);
        }
    }

    private void notifyFollowRequest(User requester, User target) {
        try {
            Notification notification = Notification.builder()
                    .message(ProfilePrivacyService.displayNameOf(requester)
                            + " wants to follow you.")
                    .readStatus(false)
                    .type(Notification.NotificationType.FOLLOW_REQUEST)
                    .referenceId(requester.getId())
                    .createdAt(LocalDateTime.now())
                    .user(target)
                    .build();

            Notification saved = notificationRepository.save(notification);
            notificationService.sendNotification(saved);
        } catch (Exception e) {
            log.warn("Follow-request notification failed: {}", e.getMessage(), e);
        }
    }

    /**
     * Tap "Following" or "Requested" — undoes whichever one applies.
     *
     * <p>Folding both into one call keeps the frontend to a single toggle
     * handler: it doesn't need to know whether it is cancelling a pending
     * request or unfollowing for real.
     */
    @Transactional
    public FollowActionResponse unfollow(UUID currentUserId, UUID targetUserId) {
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Current user not found"));
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("Target user not found"));

        Optional<Follow> follow = followRepository.findByFollowerAndFollowing(currentUser, targetUser);
        if (follow.isPresent()) {
            followRepository.delete(follow.get());
            return FollowActionResponse.builder()
                    .status("UNFOLLOWED")
                    .message("Unfollowed successfully")
                    .build();
        }

        // Not following — maybe there's a pending request to withdraw instead.
        Optional<FollowRequest> pending =
                followRequestRepository.findByRequesterAndTarget(currentUser, targetUser);
        if (pending.isPresent() && pending.get().getStatus() == FollowRequest.Status.PENDING) {
            followRequestRepository.delete(pending.get());
            return FollowActionResponse.builder()
                    .status("REQUEST_CANCELLED")
                    .message("Follow request withdrawn")
                    .build();
        }

        // ✅ Return gracefully instead of throwing error
        return FollowActionResponse.builder()
                .status("NOT_FOLLOWING")
                .message("Not following")
                .build();
    }

    // Remove someone from YOUR followers list. This is the mirror image of
    // unfollow(): unfollow deletes the row where YOU are the follower;
    // this deletes the row where THEY are the follower and you are the one
    // being followed, so they stop following you (and won't reappear after
    // a refresh, since it's now actually persisted rather than removed only
    // from local frontend state).
    @Transactional
    public String removeFollower(UUID currentUserId, UUID followerUserId) {
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Current user not found"));
        User followerUser = userRepository.findById(followerUserId)
                .orElseThrow(() -> new RuntimeException("Follower not found"));

        Optional<Follow> follow = followRepository.findByFollowerAndFollowing(followerUser, currentUser);
        if (follow.isEmpty()) {
            return "Not a follower";
        }

        followRepository.delete(follow.get());

        // Also clear any stale request row for this pair, so the removed
        // follower's profile button falls back to a clean "Follow" rather
        // than showing "Requested" against a request nobody will ever see.
        followRequestRepository.findByRequesterAndTarget(followerUser, currentUser)
                .ifPresent(followRequestRepository::delete);

        return "Follower removed successfully";
    }

    // ══════════════════════════════════════════════════════════════════════
    //  Follow requests inbox
    // ══════════════════════════════════════════════════════════════════════

    /** Requests waiting on the given user's approval, newest first. */
    public List<FollowRequestDTO> getPendingRequests(UUID currentUserId) {
        User me = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Current user not found"));

        return followRequestRepository
                .findByTargetAndStatusOrderByCreatedAtDesc(me, FollowRequest.Status.PENDING)
                .stream()
                .filter(fr -> fr.getRequester() != null)
                .map(fr -> FollowRequestDTO.builder()
                        .id(fr.getId())
                        .userId(fr.getRequester().getId())
                        .name(fr.getRequester().getName())
                        .username(fr.getRequester().getUsername())
                        .profileImage(fr.getRequester().getProfileImage())
                        .bio(fr.getRequester().getBio())
                        .createdAt(fr.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    /** Badge count for the Follow Requests entry point. */
    public long countPendingRequests(UUID currentUserId) {
        User me = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Current user not found"));
        return followRequestRepository.countByTargetAndStatus(me, FollowRequest.Status.PENDING);
    }

    /**
     * Approve a request: the follow row is created (with the same
     * notification + milestone side effects as a direct follow) and the
     * request row is deleted.
     */
    @Transactional
    public FollowActionResponse acceptFollowRequest(UUID currentUserId, UUID requestId) {
        FollowRequest request = followRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Follow request not found"));

        assertIsTarget(request, currentUserId);

        if (request.getStatus() != FollowRequest.Status.PENDING) {
            throw new RuntimeException("This request has already been handled");
        }

        User requester = request.getRequester();
        User target = request.getTarget();

        if (!followRepository.existsByFollowerAndFollowing(requester, target)) {
            createFollow(requester, target);
        }

        // Row is deleted rather than kept as ACCEPTED: the `follows` table is
        // now the source of truth for this pair, and leaving a row behind
        // would block a future re-request after an unfollow (the unique
        // constraint spans both columns irrespective of status).
        followRequestRepository.delete(request);

        return FollowActionResponse.builder()
                .status("FOLLOWING")
                .message("Follow request accepted")
                .build();
    }

    /**
     * Reject a request. The row is deleted outright rather than kept as a
     * DECLINED husk — mirroring {@code MessageService.declineRequest()} — so
     * the requester may ask again later, and the account owner isn't
     * accumulating dead rows.
     */
    @Transactional
    public FollowActionResponse declineFollowRequest(UUID currentUserId, UUID requestId) {
        FollowRequest request = followRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Follow request not found"));

        assertIsTarget(request, currentUserId);

        if (request.getStatus() != FollowRequest.Status.PENDING) {
            throw new RuntimeException("This request has already been handled");
        }

        followRequestRepository.delete(request);

        // Deliberately silent — the requester is not told they were rejected.
        return FollowActionResponse.builder()
                .status("NOT_FOLLOWING")
                .message("Follow request declined")
                .build();
    }

    private void assertIsTarget(FollowRequest request, UUID currentUserId) {
        if (request.getTarget() == null
                || !request.getTarget().getId().equals(currentUserId)) {
            throw new RuntimeException("Access denied");
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    //  Lists and stats
    // ══════════════════════════════════════════════════════════════════════

    // Get followers list of a user
    public List<FollowResponse> getFollowers(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return followRepository.findByFollowing(user)
                .stream()
                .map(f -> FollowResponse.builder()
                        .userId(f.getFollower().getId())
                        .name(f.getFollower().getName())
                        .username(f.getFollower().getUsername())
                        .profileImage(f.getFollower().getProfileImage())
                        .build())
                .collect(Collectors.toList());
    }

    // Get following list of a user
    public List<FollowResponse> getFollowing(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return followRepository.findByFollower(user)
                .stream()
                .map(f -> FollowResponse.builder()
                        .userId(f.getFollowing().getId())
                        .name(f.getFollowing().getName())
                        .username(f.getFollowing().getUsername())
                        .profileImage(f.getFollowing().getProfileImage())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Follow stats for a profile page.
     *
     * <p>Per the agreed spec, follower/following COUNTS stay visible on a
     * private profile — only the idea grid is hidden. The extra privacy flags
     * here tell the frontend which button state to render and whether to draw
     * the lock panel in place of the grid.
     */
    public FollowStatsResponse getFollowStats(UUID currentUserId, UUID targetUserId) {
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Current user not found"));
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("Target user not found"));

        boolean isFollowing = followRepository.existsByFollowerAndFollowing(currentUser, targetUser);

        boolean requestPending = !isFollowing
                && followRequestRepository.findByRequesterAndTarget(currentUser, targetUser)
                        .filter(fr -> fr.getStatus() == FollowRequest.Status.PENDING)
                        .isPresent();

        return FollowStatsResponse.builder()
                .followersCount(followRepository.countByFollowing(targetUser))
                .followingCount(followRepository.countByFollower(targetUser))
                .isFollowing(isFollowing)
                .requestPending(requestPending)
                .isPublicProfile(targetUser.isPublicProfile())
                .canViewIdeas(ProfilePrivacyService.canViewProfileIdeas(
                        targetUser, currentUser, isFollowing))
                .build();
    }
}
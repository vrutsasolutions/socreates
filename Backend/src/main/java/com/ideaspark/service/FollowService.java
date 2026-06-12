package com.ideaspark.service;

import com.ideaspark.dto.FollowResponse;
import com.ideaspark.dto.FollowStatsResponse;
import com.ideaspark.model.Follow;
import com.ideaspark.model.Notification;
import com.ideaspark.model.User;
import com.ideaspark.repository.FollowRepository;
import com.ideaspark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService; // ✅ Added

    // Follow a user
    public String follow(UUID currentUserId, UUID targetUserId) {
        if (currentUserId.equals(targetUserId)) {
            throw new RuntimeException("You cannot follow yourself");
        }

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Current user not found"));
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("Target user not found"));

        if (followRepository.existsByFollowerAndFollowing(currentUser, targetUser)) {
            throw new RuntimeException("Already following this user");
        }

        Follow follow = Follow.builder()
                .follower(currentUser)
                .following(targetUser)
                .build();

        followRepository.save(follow);

        // ✅ Send notification to the person being followed
        try {
            Notification notification = Notification.builder()
                    .message((currentUser.getUsername() != null && !currentUser.getUsername().isBlank()
                            ? "@" + currentUser.getUsername()
                            : currentUser.getName()) + " started following you!")
                    .readStatus(false)
                    .createdAt(LocalDateTime.now())
                    .user(targetUser)
                    .build();

            notificationService.sendNotification(notification);
        } catch (Exception e) {
            System.out.println("Follow notification failed: " + e.getMessage());
        }

        return "Followed successfully";
    }

    // Unfollow a user
    public String unfollow(UUID currentUserId, UUID targetUserId) {
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Current user not found"));
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("Target user not found"));

        Follow follow = followRepository.findByFollowerAndFollowing(currentUser, targetUser)
                .orElseThrow(() -> new RuntimeException("You are not following this user"));

        followRepository.delete(follow);
        return "Unfollowed successfully";
    }

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

    // Get follow stats for a profile
    public FollowStatsResponse getFollowStats(UUID currentUserId, UUID targetUserId) {
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Current user not found"));
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("Target user not found"));

        return FollowStatsResponse.builder()
                .followersCount(followRepository.countByFollowing(targetUser))
                .followingCount(followRepository.countByFollower(targetUser))
                .isFollowing(followRepository.existsByFollowerAndFollowing(currentUser, targetUser))
                .build();
    }
}
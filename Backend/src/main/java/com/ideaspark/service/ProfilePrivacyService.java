package com.ideaspark.service;

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
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Single owner of the Public ⇄ Private profile switch and of the "who may see
 * whose ideas" rules.
 *
 * <p>The visibility helpers are {@code static} on purpose: {@code IdeaService}
 * and {@code FollowService} both need them, and making them static keeps the
 * rule in one place without introducing a circular bean dependency between
 * those services.
 */
@Service
@RequiredArgsConstructor
public class ProfilePrivacyService {

    private static final Logger log = LoggerFactory.getLogger(ProfilePrivacyService.class);

    private final UserRepository userRepository;
    private final FollowRepository followRepository;
    private final FollowRequestRepository followRequestRepository;
    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // ══════════════════════════════════════════════════════════════════════
    //  Visibility rules
    // ══════════════════════════════════════════════════════════════════════

    /**
     * Whether an approved follower sees a private creator's idea grid on
     * that creator's PROFILE PAGE (in addition to their Home feed, which
     * always shows it — see {@link #canViewFeedIdeas}).
     *
     * <p>{@code true}: Instagram-style. An approved follow unlocks the grid
     * everywhere — profile page and feed alike. Non-followers still see
     * nothing but the header and follower/following counts.
     *
     * <p>Flip to {@code false} to go back to the stricter original spec,
     * where a private account's profile page shows ideas to nobody but the
     * owner and approved followers see the ideas only in their feed. Nothing
     * else needs to change on either flip — both
     * {@code IdeaService.getIdeasByUser()} and the {@code canViewIdeas} hint
     * on {@code FollowStatsResponse} read this same constant, so they cannot
     * drift out of sync with each other.
     */
    public static final boolean PRIVATE_PROFILE_SHOWS_IDEAS_TO_FOLLOWERS = true;

    /**
     * May {@code viewer} see {@code owner}'s ideas <em>on the owner's profile
     * page</em>?
     *
     * @param viewerFollowsOwner caller-supplied so this stays static and the
     *                           caller can batch the follow lookup
     */
    public static boolean canViewProfileIdeas(User owner, User viewer, boolean viewerFollowsOwner) {
        if (owner == null) {
            return false;
        }
        // You can always see your own ideas, private or not.
        if (viewer != null && viewer.getId().equals(owner.getId())) {
            return true;
        }
        if (owner.isPublicProfile()) {
            return true;
        }
        return PRIVATE_PROFILE_SHOWS_IDEAS_TO_FOLLOWERS && viewerFollowsOwner;
    }

    /**
     * May {@code viewer} see {@code owner}'s ideas <em>in a feed</em> — Home,
     * Explore, search results, Ideas of the Day, saved list?
     *
     * <p>Unlike the profile page, approved followers DO see a private
     * creator's ideas here. That is the whole point of the spec line "it
     * should be shown only in the homepage of the user who follow them".
     */
    public static boolean canViewFeedIdeas(User owner, User viewer, boolean viewerFollowsOwner) {
        // Orphaned idea with no creator — nothing to gate on, leave visible
        // rather than silently vanishing it from every feed.
        if (owner == null) {
            return true;
        }
        if (viewer != null && viewer.getId().equals(owner.getId())) {
            return true;
        }
        if (owner.isPublicProfile()) {
            return true;
        }
        // Private creator: signed-out viewers never qualify, followers do.
        return viewer != null && viewerFollowsOwner;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  The switch
    // ══════════════════════════════════════════════════════════════════════

    /**
     * Message sent to each existing follower when an account goes private.
     *
     * <p>Deliberately worded as "now pending approval" rather than "put a
     * request if you still want to follow": followers do NOT have to do
     * anything: their follow is auto-converted into a pending request on
     * their behalf, and the account owner approves or rejects it. Telling
     * them to re-request would send them to a profile whose button already
     * reads "Requested".
     *
     * <p>Single constant so the copy can be changed in one place.
     */
    public static final String PRIVACY_ON_FOLLOWER_NOTICE =
            "%s has turned on Private Profile. Your follow is now pending their approval.";

    /**
     * Applies a Public ⇄ Private switch, including the follower-graph
     * conversion in both directions.
     *
     * <p><b>public → private:</b> every existing follower is converted into a
     * PENDING {@link FollowRequest} and their {@link Follow} row is deleted,
     * so the owner gets to approve or reject people who were already
     * following. Each of them is notified.
     *
     * <p><b>private → public:</b> everything still pending is auto-accepted
     * into real follows, since anyone may follow a public account anyway and
     * leaving requests queued against a public profile makes no sense. This
     * makes a private → public → private round trip lossless.
     *
     * @return the saved user
     */
    @Transactional
    public User setPublicProfile(User user, boolean makePublic) {
        if (user.isPublicProfile() == makePublic) {
            return user; // no-op; don't fire notifications for a non-change
        }

        user.setPublicProfile(makePublic);
        User saved = userRepository.save(user);

        if (makePublic) {
            autoAcceptPendingRequests(saved);
        } else {
            convertFollowersToPendingRequests(saved);
        }

        return saved;
    }

    /** public → private. */
    private void convertFollowersToPendingRequests(User owner) {
        List<Follow> followers = followRepository.findByFollowing(owner);
        if (followers.isEmpty()) {
            return;
        }

        String displayName = displayNameOf(owner);
        LocalDateTime now = LocalDateTime.now();

        List<FollowRequest> newRequests = new ArrayList<>();
        List<Notification> notices = new ArrayList<>();

        for (Follow f : followers) {
            User follower = f.getFollower();
            if (follower == null) {
                continue;
            }

            // Don't insert over a row that already exists for this pair — the
            // unique constraint is on (requester, target) irrespective of
            // status, so a leftover would throw. Reuse it and reset to PENDING.
            followRequestRepository.findByRequesterAndTarget(follower, owner)
                    .ifPresentOrElse(existing -> {
                        existing.setStatus(FollowRequest.Status.PENDING);
                        existing.setRespondedAt(null);
                        newRequests.add(existing);
                    }, () -> newRequests.add(FollowRequest.builder()
                            .requester(follower)
                            .target(owner)
                            .status(FollowRequest.Status.PENDING)
                            .createdAt(now)
                            .build()));

            notices.add(Notification.builder()
                    .user(follower)
                    .message(String.format(PRIVACY_ON_FOLLOWER_NOTICE, displayName))
                    .type(Notification.NotificationType.PRIVACY_CHANGE)
                    .referenceId(owner.getId())
                    .readStatus(false)
                    .createdAt(now)
                    .build());
        }

        // Requests first, follows second: if anything fails mid-way the
        // transaction rolls back, but ordering it this way means the graph is
        // never momentarily in a state where the follower has been dropped
        // with no request to show for it.
        followRequestRepository.saveAll(newRequests);
        followRepository.deleteAll(followers);

        List<Notification> savedNotices = notificationRepository.saveAll(notices);
        pushBestEffort(savedNotices);
    }

    /** private → public. */
    private void autoAcceptPendingRequests(User owner) {
        List<FollowRequest> pending = followRequestRepository
                .findByTargetAndStatusOrderByCreatedAtDesc(owner, FollowRequest.Status.PENDING);
        if (pending.isEmpty()) {
            return;
        }

        List<Follow> follows = new ArrayList<>();
        for (FollowRequest fr : pending) {
            User requester = fr.getRequester();
            if (requester == null) {
                continue;
            }
            // Guard against a duplicate slipping through and tripping the
            // unique constraint on `follows`.
            if (followRepository.existsByFollowerAndFollowing(requester, owner)) {
                continue;
            }
            follows.add(Follow.builder()
                    .follower(requester)
                    .following(owner)
                    .build());
        }

        followRepository.saveAll(follows);
        followRequestRepository.deleteAll(pending);
    }

    /**
     * WebSocket delivery is best-effort and must never fail the switch — the
     * notification rows are already committed, so a dropped push just means
     * the recipient sees it on their next bell fetch instead of instantly.
     *
     * <p>SCALING NOTE: this is a synchronous loop, one send per follower. Fine
     * at current follower counts; an account with tens of thousands of
     * followers would make the toggle request slow enough to matter. If that
     * becomes real, move the notify half of
     * {@link #convertFollowersToPendingRequests} behind {@code @Async} (the DB
     * work should stay synchronous so the API response reflects committed
     * state). Note the same single-instance constraint called out for the
     * in-memory STOMP broker applies here.
     */
    private void pushBestEffort(List<Notification> notifications) {
        for (Notification n : notifications) {
            try {
                if (n.getUser() != null && n.getUser().getEmail() != null) {
                    messagingTemplate.convertAndSendToUser(
                            n.getUser().getEmail(), "/queue/notifications", n);
                }
            } catch (Exception e) {
                // Best-effort push over STOMP — the notification row is already
                // persisted by the caller, so a failed live push just means the
                // user sees it on next poll/reconnect instead of instantly.
                log.warn("Privacy-change notification push failed for user {}: {}",
                        n.getUser() != null ? n.getUser().getEmail() : "unknown", e.getMessage(), e);
            }
        }
    }

    static String displayNameOf(User u) {
        if (u == null) {
            return "Someone";
        }
        if (u.getUsername() != null && !u.getUsername().isBlank()) {
            return "@" + u.getUsername();
        }
        if (u.getName() != null && !u.getName().isBlank()) {
            return u.getName();
        }
        return "Someone";
    }
}
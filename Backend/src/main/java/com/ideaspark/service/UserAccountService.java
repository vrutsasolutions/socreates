package com.ideaspark.service;

import com.ideaspark.model.BannedEmail;
import com.ideaspark.model.Conversation;
import com.ideaspark.model.User;
import com.ideaspark.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Single source of truth for "delete everything belonging to this user".
 *
 * Extracted out of UserController.deleteAccount so the same, already-tested
 * cleanup order (dictated by FK dependencies — see the comments below) is
 * shared by:
 *   - the self-service "delete my account" endpoint (UserController /me), and
 *   - the admin moderation "ban and delete" endpoint (AdminUserController),
 * instead of drifting apart as two copies of the same 13-repository cleanup.
 */
@Service
@RequiredArgsConstructor
public class UserAccountService {

    private final UserRepository userRepository;
    private final BannedEmailRepository bannedEmailRepository;
    private final IdeaRepository ideaRepository;
    private final SavedIdeaRepository savedIdeaRepository;
    private final FollowRepository followRepository;
    private final CommentRepository commentRepository;
    private final IdeaLikeRepository ideaLikeRepository;
    private final NotificationRepository notificationRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final CreatorMonthlyMetricsRepository creatorMonthlyMetricsRepository;
    private final BlockedUserRepository blockedUserRepository;
    private final IdeaReadRepository ideaReadRepository;
    private final ReportRepository reportRepository;
    private final MembershipRepository membershipRepository;
    private final MembershipPaymentRepository membershipPaymentRepository;
    private final CreatorEarningRepository creatorEarningRepository;
    private final FeedbackRepository feedbackRepository;

    /**
     * Deletes every row belonging to {@code user} across the app, then the
     * user row itself. Does NOT ban the email — callers that want the email
     * blocked from re-registering should call {@link #banEmail} as well (see
     * {@link #deleteAndBan}).
     */
    @Transactional
    public void deleteAllUserData(User user) {
        UUID userId = user.getId();

        notificationRepository.deleteAll(
                notificationRepository.findByUserOrderByCreatedAtDesc(user));

        savedIdeaRepository.deleteAll(
                savedIdeaRepository.findByUserIdOrderBySavedAtDesc(userId));

        followRepository.findByFollower(user).forEach(followRepository::delete);
        followRepository.findByFollowing(user).forEach(followRepository::delete);

        ideaLikeRepository.deleteAll(
                ideaLikeRepository.findAll().stream()
                        .filter(like -> like.getUser() != null && userId.equals(like.getUser().getId()))
                        .toList());

        commentRepository.deleteAll(
                commentRepository.findAll().stream()
                        .filter(c -> c.getUser() != null && userId.equals(c.getUser().getId()))
                        .toList());

        ideaRepository.findByCreatorIdOrderByCreatedAtDesc(userId).forEach(idea -> {
            commentRepository.deleteAll(
                    commentRepository.findByIdeaIdOrderByCreatedAtDesc(idea.getId()));
            ideaLikeRepository.deleteByIdeaId(idea.getId());
            ideaRepository.delete(idea);
        });

        List<Conversation> conversations = conversationRepository.findByUser(user);
        conversations
                .forEach(conv -> messageRepository.deleteAll(messageRepository.findByConversationId(conv.getId())));
        conversationRepository.deleteAll(conversations);

        // ── Tables with a NOT NULL FK to users.id and no DB-level cascade
        // (ddl-auto=validate never wrote one) — each must be cleared or
        // userRepository.delete() trips a "violates foreign key constraint"
        // error.

        creatorMonthlyMetricsRepository.deleteAll(
                creatorMonthlyMetricsRepository.findByCreatorId(userId));

        ideaReadRepository.deleteAll(
                ideaReadRepository.findByUserId(userId));

        // blocked_users has two FKs (blocker_id, blocked_id) — clear both
        // directions, since a row where someone else blocked this user
        // still references users.id.
        blockedUserRepository.deleteAll(blockedUserRepository.findByBlocker(user));
        blockedUserRepository.deleteAll(blockedUserRepository.findByBlocked(user));

        // reports has two FKs (reporter_id, reported_user_id) — same reasoning.
        reportRepository.deleteAll(reportRepository.findByReporter(user));
        reportRepository.deleteAll(reportRepository.findByReportedUser(user));

        membershipRepository.deleteAll(membershipRepository.findByUserId(userId));

        // Financial history — hard-deleted per product decision (no
        // anonymize/retain requirement for this app).
        membershipPaymentRepository.deleteAll(
                membershipPaymentRepository.findByUserIdOrderByCreatedAtDesc(userId));
        creatorEarningRepository.deleteAll(
                creatorEarningRepository.findByCreatorIdOrderByMonthDesc(userId));

        // feedback — same FK shape as the rest: NOT NULL user_id, no DB cascade.
        feedbackRepository.findByUserId(userId).ifPresent(feedbackRepository::delete);

        userRepository.delete(user);
    }

    /**
     * Moderation path: deletes all of the user's data AND permanently blocks
     * their email from ever registering again.
     *
     * @param user       the user to delete
     * @param reason     internal moderation note (e.g. "restricted content
     *                   upload"), not shown to the user
     * @param bannedBy   email of the admin performing the action, for the
     *                   audit trail
     */
    @Transactional
    public void deleteAndBan(User user, String reason, String bannedBy) {
        // Record the ban BEFORE deleting the user row. If the ban write
        // fails (e.g. email already banned from a prior action), we want
        // that exception to abort the whole transaction rather than delete
        // the account without actually blocking re-registration.
        banEmail(user.getEmail(), reason, bannedBy);
        deleteAllUserData(user);
    }

    private void banEmail(String email, String reason, String bannedBy) {
        String normalizedEmail = email.trim().toLowerCase();

        if (bannedEmailRepository.existsByEmail(normalizedEmail)) {
            return;
        }

        bannedEmailRepository.save(
                BannedEmail.builder()
                        .email(normalizedEmail)
                        .reason(reason)
                        .bannedBy(bannedBy)
                        .build());
    }

    public boolean isEmailBanned(String email) {
        if (email == null) {
            return false;
        }

        return bannedEmailRepository.existsByEmail(email.trim().toLowerCase());
    }
}
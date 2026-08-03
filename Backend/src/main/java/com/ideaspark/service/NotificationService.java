package com.ideaspark.service;

import com.ideaspark.dto.NotificationRequest;
import com.ideaspark.model.Notification;
import com.ideaspark.model.User;
import com.ideaspark.repository.NotificationRepository;
import com.ideaspark.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final PushNotificationService pushNotificationService;

    public NotificationService(NotificationRepository notificationRepository,
            UserRepository userRepository,
            SimpMessagingTemplate messagingTemplate,
            PushNotificationService pushNotificationService) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
        this.pushNotificationService = pushNotificationService;
    }

    // Gate for the three toggles on Settings → Notifications. LIKE/COMMENT/
    // NEW_IDEA are opt-out per recipient; every other type (FOLLOW, BOOKMARK,
    // MESSAGE, SYSTEM) has no toggle yet, so it always goes through.
    private boolean isAllowedByPreferences(Notification notification) {
        User recipient = notification.getUser();
        if (recipient == null || notification.getType() == null) {
            return true;
        }
        return switch (notification.getType()) {
            case LIKE -> recipient.isNotifyLikes();
            case COMMENT -> recipient.isNotifyComments();
            case NEW_IDEA -> recipient.isNotifyNewIdeas();
            default -> true;
        };
    }

    // Original — used internally by trusted code (IdeaService, FollowService, etc.)
    // where the Notification is built directly in Java, not from user input.
    // Returns null (no-op) if the recipient has turned this notification type
    // off in Settings — the notification is neither persisted nor pushed to
    // the bell, so it silently never appears there.
    public Notification sendNotification(Notification notification) {
        if (!isAllowedByPreferences(notification)) {
            return null;
        }
        if (notification.getCreatedAt() == null) {
            notification.setCreatedAt(java.time.LocalDateTime.now());
        }
        Notification saved = notificationRepository.save(notification);

        if (saved.getUser() != null && saved.getUser().getEmail() != null) {
            messagingTemplate.convertAndSendToUser(
                    saved.getUser().getEmail(),
                    "/queue/notifications",
                    saved);
        }

        // Background/closed-app delivery — additive to the WebSocket push
        // above, not a replacement. No-ops safely if Firebase isn't
        // configured yet or the recipient has no registered devices.
        pushNotificationService.sendPush(saved);

        return saved;
    }

    // New — used only by the admin-only /send endpoint, built from a
    // caller-supplied DTO with restricted, validated fields.
    public Notification sendNotificationFromRequest(NotificationRequest request) {
        User targetUser = userRepository.findById(request.getTargetUserId())
                .orElseThrow(() -> new RuntimeException("Target user not found"));

        Notification notification = Notification.builder()
                .user(targetUser)
                .message(request.getMessage())
                .referenceId(request.getReferenceId())
                .type(request.getType() != null ? request.getType() : Notification.NotificationType.SYSTEM)
                .conversationId(request.getConversationId())
                .readStatus(false)
                .build();

        return sendNotification(notification);
    }

    public List<Notification> listFor(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        return notificationRepository.findByUserOrderByCreatedAtDesc(user);
    }

    public long countUnread(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        return notificationRepository.countByUserAndReadStatusFalse(user);
    }

    public long unreadCountFor(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        return notificationRepository.countByUserAndReadStatusFalse(user);
    }

    public void markRead(UUID id, String email) {
        User user = userRepository.findByEmail(email).orElseThrow();

        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        if (!notification.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You do not have permission to modify this notification");
        }

        notification.setReadStatus(true);
        notificationRepository.save(notification);
    }

    // ✅ Added @Transactional to persist markAllRead properly
    @Transactional
    public void markAllRead(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();

        // ✅ Use a direct update query for reliability
        List<Notification> notifications = notificationRepository
                .findByUserOrderByCreatedAtDesc(user);
        notifications.forEach(n -> n.setReadStatus(true));
        notificationRepository.saveAll(notifications);
    }

    // Idea-scoped notification types whose referenceId points at an IDEA id
    // (LIKE/COMMENT/BOOKMARK/NEW_IDEA) — as opposed to FOLLOW/FOLLOW_REQUEST/
    // PRIVACY_CHANGE, whose referenceId points at a USER id instead. Only
    // these four are safe to clear when an idea is deleted.
    private static final List<Notification.NotificationType> IDEA_REFERENCED_TYPES = List.of(
            Notification.NotificationType.LIKE,
            Notification.NotificationType.COMMENT,
            Notification.NotificationType.BOOKMARK,
            Notification.NotificationType.NEW_IDEA);

    // Called when an idea is deleted. Without this, a "New comment"/"New
    // like"/"New bookmark"/"New idea" bell entry outlives the idea it points
    // at, and 404s the instant the recipient taps it.
    @Transactional
    public void deleteIdeaReferences(UUID ideaId) {
        notificationRepository.deleteByReferenceIdAndTypeIn(ideaId, IDEA_REFERENCED_TYPES);
    }
}

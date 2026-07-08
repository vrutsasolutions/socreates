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

    public NotificationService(NotificationRepository notificationRepository,
            UserRepository userRepository,
            SimpMessagingTemplate messagingTemplate) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    // Original — used internally by trusted code (IdeaService, FollowService, etc.)
    // where the Notification is built directly in Java, not from user input.
    public Notification sendNotification(Notification notification) {
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
}

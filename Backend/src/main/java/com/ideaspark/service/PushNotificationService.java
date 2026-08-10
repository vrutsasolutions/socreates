package com.ideaspark.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.*;
import com.ideaspark.model.DeviceToken;
import com.ideaspark.model.Notification;
import com.ideaspark.repository.DeviceTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

// Sends a Notification out over FCM to every device the recipient has
// registered (see DeviceToken). This is the background/closed-app delivery
// path — NotificationService still sends the same event over WebSocket for
// the open-app case; this is purely additive, not a replacement.
//
// The `link` this builds MUST stay in sync with the frontend's
// normalizeNotification() defaultLink logic (src/api/notificationApi.jsx) —
// that's what lets a tapped push notification land on the exact same
// screen a tapped in-app bell item would.
@Slf4j
@Service
@RequiredArgsConstructor
public class PushNotificationService {

    private final DeviceTokenRepository deviceTokenRepository;

    private static final Map<Notification.NotificationType, String> TITLES = Map.of(
            Notification.NotificationType.LIKE, "New like",
            Notification.NotificationType.FOLLOW, "New follower",
            Notification.NotificationType.COMMENT, "New comment",
            Notification.NotificationType.BOOKMARK, "New bookmark",
            Notification.NotificationType.MESSAGE, "New message",
            Notification.NotificationType.NEW_IDEA, "New idea posted",
            Notification.NotificationType.FOLLOW_REQUEST, "Follow request",
            Notification.NotificationType.PRIVACY_CHANGE, "Privacy update"
    );

    private static final java.util.Set<Notification.NotificationType> IDEA_LINK_TYPES = java.util.Set.of(
            Notification.NotificationType.LIKE,
            Notification.NotificationType.BOOKMARK,
            Notification.NotificationType.COMMENT,
            Notification.NotificationType.NEW_IDEA
    );

    // Mirrors src/api/notificationApi.jsx's defaultLink logic exactly.
    private String buildLink(Notification n) {
        Notification.NotificationType type = n.getType();

        if (type == Notification.NotificationType.MESSAGE) {
            return n.getConversationId() != null
                    ? "/messages/" + n.getConversationId()
                    : "/messages";
        }
        if (IDEA_LINK_TYPES.contains(type) && n.getReferenceId() != null) {
            return "/ideas/" + n.getReferenceId();
        }
        if (type == Notification.NotificationType.FOLLOW_REQUEST) {
            return "/follow-requests";
        }
        if ((type == Notification.NotificationType.FOLLOW || type == Notification.NotificationType.PRIVACY_CHANGE)
                && n.getReferenceId() != null) {
            return "/users/" + n.getReferenceId();
        }
        return "/home";
    }

    // Fire-and-forget from NotificationService — a push failure should never
    // break the (already-persisted, already-WebSocket-pushed) in-app
    // notification, so every failure path here only logs, never throws.
    //
    // @Async so the calling request thread (e.g. someone liking an idea)
    // doesn't block on FCM's HTTP round-trip(s) — this now runs on a
    // separate thread via Spring's @EnableAsync (IdeasparkApplication).
    // Safe to detach from the caller's transaction: `notification` was
    // already saved before this is called, and its `user` association is
    // already initialized (not a lazy proxy), so no further DB access is
    // needed from the original transaction.
    @Async
    public void sendPush(Notification notification) {
        if (FirebaseApp.getApps().isEmpty()) {
            return; // not configured yet — see FirebaseConfig
        }
        if (notification == null || notification.getUser() == null) {
            return;
        }

        List<DeviceToken> tokens = deviceTokenRepository.findByUser(notification.getUser());
        if (tokens.isEmpty()) {
            return; // user has no registered devices (e.g. never opened the app on a real device)
        }

        String title = TITLES.getOrDefault(notification.getType(), "Notification");
        String link = buildLink(notification);

        for (DeviceToken deviceToken : tokens) {
            // Build the visible notification — attach the image only when we
            // actually have a publicly reachable HTTPS URL; FCM silently
            // ignores a null/blank image and falls back to text-only.
            var notifBuilder = com.google.firebase.messaging.Notification.builder()
                    .setTitle(title)
                    .setBody(notification.getMessage());

            String imageUrl = notification.getImageUrl();
            if (imageUrl != null && !imageUrl.isBlank()) {
                notifBuilder.setImage(imageUrl);
            }

            Message message = Message.builder()
                    .setToken(deviceToken.getDeviceToken())
                    .setNotification(notifBuilder.build())
                    // Sent alongside the visible notification — this is what
                    // usePushNotifications.js reads on tap
                    // (action.notification.data.link) to navigate.
                    .putData("link", link)
                    .putData("type", notification.getType() != null ? notification.getType().name() : "")
                    .build();

            try {
                FirebaseMessaging.getInstance().send(message);
            } catch (FirebaseMessagingException e) {
                if (e.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED) {
                    // App was uninstalled or the token rotated — this token
                    // will never succeed again, so stop trying.
                    log.info("Removing stale FCM token for user {}", notification.getUser().getId());
                    deviceTokenRepository.deleteByDeviceToken(deviceToken.getDeviceToken());
                } else {
                    log.error("FCM send failed for user {}: {}", notification.getUser().getId(), e.getMessage());
                }
            }
        }
    }
}

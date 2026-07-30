package com.ideaspark.service;

import com.ideaspark.model.User;
import com.ideaspark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
public class PresenceService {

    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // Tracks the number of active WebSocket sessions per user email.
    // A user with two open tabs (or phone + browser) has count = 2.
    // They only go offline when the last session disconnects (count → 0).
    // Without this, disconnecting ONE device set the user offline even
    // though another device was still connected.
    //
    // This is an in-memory map — suitable for a single-instance deployment
    // (Elastic Beanstalk). If SoCreate scales to multiple backend instances
    // behind a load balancer, this would need to move to Redis.
    private final ConcurrentHashMap<String, AtomicInteger> sessionCounts = new ConcurrentHashMap<>();

    public void markOnline(String email) {
        if (email == null || email.isBlank()) return;

        int count = sessionCounts
                .computeIfAbsent(email, k -> new AtomicInteger(0))
                .incrementAndGet();

        // Only broadcast on the FIRST session (0 → 1). Subsequent
        // connections from the same user don't change the visible state.
        if (count == 1) {
            userRepository.findByEmail(email).ifPresent(user -> {
                user.setOnline(true);
                userRepository.save(user);
                broadcastPresence(user);
            });
        }
    }

    public void markOffline(String email) {
        if (email == null || email.isBlank()) return;

        AtomicInteger counter = sessionCounts.get(email);
        int remaining = (counter != null) ? counter.decrementAndGet() : 0;

        // Guard against underflow (shouldn't happen, but be safe).
        if (remaining < 0 && counter != null) {
            counter.set(0);
            remaining = 0;
        }

        // Only broadcast offline when the LAST session disconnects.
        if (remaining <= 0) {
            sessionCounts.remove(email);
            userRepository.findByEmail(email).ifPresent(user -> {
                user.setOnline(false);
                user.setLastSeen(LocalDateTime.now());
                userRepository.save(user);
                broadcastPresence(user);
            });
        }
    }

    private void broadcastPresence(User user) {
        java.util.Map<String, Object> payload = new java.util.HashMap<>();

        // Activity Status OFF → always broadcast as offline/no last-seen,
        // regardless of the user's real connection state, so no one can tell
        // whether they're actually online. This masking happens here (the one
        // place presence goes out over the wire) rather than on the frontend,
        // so the real state never even reaches other clients.
        boolean visible = user.isShowActivityStatus();

        payload.put("userId", user.getId());
        payload.put("online", visible && Boolean.TRUE.equals(user.getOnline()));
        payload.put("lastSeen", visible ? user.getLastSeen() : null);
        payload.put("visible", visible);

        messagingTemplate.convertAndSend("/topic/presence", payload);
    }

    // Called right after the Activity Status toggle is saved (see
    // UserController) so any chat window already open updates immediately —
    // turning it off makes the user look instantly offline to others, turning
    // it back on immediately reveals their real current state.
    public void refreshPresence(User user) {
        broadcastPresence(user);
    }
}

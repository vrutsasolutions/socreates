package com.ideaspark.service;

import com.ideaspark.model.User;
import com.ideaspark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PresenceService {

    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public void markOnline(String email) {
    System.out.println("ONLINE: " + email);

    if (email == null || email.isBlank()) return;

    userRepository.findByEmail(email).ifPresent(user -> {
        user.setOnline(true);
        userRepository.save(user);
        broadcastPresence(user);
    });
}

public void markOffline(String email) {
    System.out.println("OFFLINE: " + email);

    if (email == null || email.isBlank()) return;

    userRepository.findByEmail(email).ifPresent(user -> {
        user.setOnline(false);
        user.setLastSeen(LocalDateTime.now());
        userRepository.save(user);
        broadcastPresence(user);
    });
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

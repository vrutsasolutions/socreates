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

    payload.put("userId", user.getId());
    payload.put("online", Boolean.TRUE.equals(user.getOnline()));
    payload.put("lastSeen", user.getLastSeen());

    messagingTemplate.convertAndSend("/topic/presence", payload);
}
}
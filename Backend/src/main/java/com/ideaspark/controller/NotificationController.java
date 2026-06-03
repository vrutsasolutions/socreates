package com.ideaspark.controller;

import com.ideaspark.model.Notification;
import com.ideaspark.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    // Optional test endpoint
    @PostMapping("/send")
    public Notification create(@RequestBody Notification notification) {
        return notificationService.sendNotification(notification);
    }

    // GET /api/notifications
    @GetMapping
    public List<Notification> list(Authentication auth) {
        return notificationService.listFor(auth.getName());
    }

    // GET /api/notifications/unread-count
    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(Authentication auth) {
        return Map.of("count", notificationService.unreadCountFor(auth.getName()));
    }

    @PostMapping("/read-all")
@ResponseStatus(HttpStatus.NO_CONTENT)
public void markAllRead(Authentication auth) {
    notificationService.markAllRead(auth.getName());
}

@PostMapping("/{id}/read")
@ResponseStatus(HttpStatus.NO_CONTENT)
public void markRead(@PathVariable UUID id) {
    notificationService.markRead(id);
}
}
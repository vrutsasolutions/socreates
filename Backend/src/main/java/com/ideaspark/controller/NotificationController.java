package com.ideaspark.controller;

import com.ideaspark.dto.NotificationRequest;
import com.ideaspark.model.Notification;
import com.ideaspark.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.ideaspark.dto.NotificationRequest;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    // Optional test endpoint
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/send")
    public Notification create(@RequestBody NotificationRequest request) {
    return notificationService.sendNotificationFromRequest(request);
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
    public void markRead(@PathVariable UUID id, Authentication auth) {
        notificationService.markRead(id, auth.getName());
    }
}
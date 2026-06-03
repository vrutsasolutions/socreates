package com.ideaspark.controller;

import com.ideaspark.model.Notification;
import com.ideaspark.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @PostMapping("/send")
    public Notification create(
            @RequestBody Notification notification) {
        return notificationService.sendNotification(notification);
    }

}

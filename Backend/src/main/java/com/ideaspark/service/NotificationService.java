package com.ideaspark.service;

import com.ideaspark.model.Notification;
import com.ideaspark.repository.NotificationRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public NotificationService(NotificationRepository notificationRepository,
                               SimpMessagingTemplate messagingTemplate) {
        this.notificationRepository = notificationRepository;
        this.messagingTemplate = messagingTemplate;
    }

    public Notification sendNotification(Notification notification){
        if(notification.getCreatedAt()==null){
            notification.setCreatedAt(java.time.LocalDateTime.now());
        }
        Notification saved = notificationRepository.save(notification);

        messagingTemplate.convertAndSend("/topic/notifications", saved);

        return saved;

    }
    
}



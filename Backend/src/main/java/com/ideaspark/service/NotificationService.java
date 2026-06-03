package com.ideaspark.service;

import com.ideaspark.model.Notification;
import com.ideaspark.model.User;
import com.ideaspark.repository.NotificationRepository;
import com.ideaspark.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

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

    public Notification sendNotification(Notification notification){
        if(notification.getCreatedAt()==null){
            notification.setCreatedAt(java.time.LocalDateTime.now());
        }
        Notification saved = notificationRepository.save(notification);
        
       if (saved.getUser() != null && saved.getUser().getEmail() != null) {
    messagingTemplate.convertAndSendToUser(
            saved.getUser().getEmail(),
            "/queue/notifications",
            saved
    );
}

        return saved;

    }
    public List<Notification> listFor(String email){
        User user=userRepository.findByEmail(email).orElseThrow();
        return notificationRepository.findByUserOrderByCreatedAtDesc(user);
    }
    public long countUnread(String email){
        User user=userRepository.findByEmail(email).orElseThrow();
        return notificationRepository.countByUserAndReadStatusFalse(user);
    }
    public long unreadCountFor(String email) {
    User user = userRepository.findByEmail(email).orElseThrow();
    return notificationRepository.countByUserAndReadStatusFalse(user);
    }
    public void markRead(UUID id) {
    Notification notification = notificationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Notification not found"));

    notification.setReadStatus(true);
    notificationRepository.save(notification);
}

    public void markAllRead(String email){
        User user=userRepository.findByEmail(email).orElseThrow();
        List<Notification> notifications=notificationRepository.findByUserOrderByCreatedAtDesc(user);
        notifications.forEach(n->n.setReadStatus(true));
        notificationRepository.saveAll(notifications);
    }
    
}



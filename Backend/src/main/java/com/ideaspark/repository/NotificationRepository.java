package com.ideaspark.repository;



import com.ideaspark.model.Notification;
import com.ideaspark.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findByUserOrderByCreatedAtDesc(User user);
    long countByUserAndReadStatusFalse(User user);

    
}

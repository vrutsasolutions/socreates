package com.ideaspark.repository;

import com.ideaspark.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    
}

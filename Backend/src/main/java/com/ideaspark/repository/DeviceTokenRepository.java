package com.ideaspark.repository;

import com.ideaspark.model.DeviceToken;
import com.ideaspark.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, UUID> {

    // All of a user's registered devices — a push goes out to every one of
    // these (e.g. phone + tablet both get notified).
    List<DeviceToken> findByUser(User user);

    // Used by the register endpoint to upsert: update the existing row's
    // updatedAt instead of inserting a duplicate if this exact device
    // already registered this exact token.
    Optional<DeviceToken> findByUserAndDeviceToken(User user, String deviceToken);

    // Used when FCM reports a token as invalid/unregistered (app uninstalled,
    // token rotated, etc.) — see PushNotificationService.
    void deleteByDeviceToken(String deviceToken);
}
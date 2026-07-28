package com.ideaspark.service;

import com.ideaspark.model.DeviceToken;
import com.ideaspark.model.User;
import com.ideaspark.repository.DeviceTokenRepository;
import com.ideaspark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DeviceTokenService {

    private final DeviceTokenRepository deviceTokenRepository;
    private final UserRepository userRepository;

    // Upsert — if this exact (user, token) pair already exists, just bump
    // updatedAt via save() (JPA's @PreUpdate handles that); otherwise insert
    // a new row. Called from the frontend every time PushNotifications
    // registration succeeds (e.g. every login), so this needs to be safe
    // to call repeatedly without creating duplicate rows per device.
    public void registerToken(String email, String deviceToken, String platform) {
        User user = userRepository.findByEmail(email).orElseThrow();

        DeviceToken existing = deviceTokenRepository
                .findByUserAndDeviceToken(user, deviceToken)
                .orElse(null);

        if (existing != null) {
            deviceTokenRepository.save(existing); // no field changes needed — @PreUpdate bumps updatedAt
            return;
        }

        DeviceToken token = DeviceToken.builder()
                .user(user)
                .deviceToken(deviceToken)
                .platform(platform != null ? platform : "android")
                .build();
        deviceTokenRepository.save(token);
    }

    // Best-effort cleanup — called on logout (frontend) so a signed-out
    // device stops receiving pushes meant for the account that just logged
    // out of it.
    public void unregisterToken(String deviceToken) {
        deviceTokenRepository.deleteByDeviceToken(deviceToken);
    }
}
package com.ideaspark.controller;

import com.ideaspark.dto.DeviceTokenRequest;
import com.ideaspark.service.DeviceTokenService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/device-token")
@RequiredArgsConstructor
public class DeviceTokenController {

    private final DeviceTokenService deviceTokenService;

    // POST /api/device-token — registers/updates this device's FCM token
    // for the logged-in user. Called by the frontend's usePushNotifications
    // hook right after PushNotifications.register() succeeds.
    @PostMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void register(@Valid @RequestBody DeviceTokenRequest request, Authentication auth) {
        deviceTokenService.registerToken(auth.getName(), request.getDeviceToken(), request.getPlatform());
    }

    // DELETE /api/device-token — best-effort cleanup, meant to be called on
    // logout so a signed-out device stops getting pushes for that account.
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unregister(@RequestBody DeviceTokenRequest request) {
        deviceTokenService.unregisterToken(request.getDeviceToken());
    }
}
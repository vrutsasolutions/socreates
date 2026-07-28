package com.ideaspark.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.FileInputStream;
import java.io.IOException;

// Initializes the Firebase Admin SDK once at startup, using the service
// account JSON key from Firebase Console → Project Settings → Service
// Accounts (see application.properties: firebase.service-account-path).
//
// Deliberately non-fatal if the key isn't configured yet — mirrors the
// android/app/build.gradle pattern that only applies the google-services
// plugin if google-services.json exists. Lets the rest of the app (and
// existing WebSocket-only notifications) keep working normally while
// push notifications are still being set up.
@Slf4j
@Component
public class FirebaseConfig {

    @Value("${firebase.service-account-path:}")
    private String serviceAccountPath;

    @PostConstruct
    public void init() {
        if (serviceAccountPath == null || serviceAccountPath.isBlank()) {
            log.warn("firebase.service-account-path not set — Firebase Cloud Messaging is disabled. "
                    + "Push notifications will not be sent (WebSocket-only notifications still work).");
            return;
        }

        if (!FirebaseApp.getApps().isEmpty()) {
            return; // already initialized (e.g. test context re-runs @PostConstruct)
        }

        try (FileInputStream serviceAccount = new FileInputStream(serviceAccountPath)) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();
            FirebaseApp.initializeApp(options);
            log.info("Firebase Admin SDK initialized — push notifications enabled.");
        } catch (IOException e) {
            log.error("Failed to initialize Firebase Admin SDK from '{}' — push notifications disabled. "
                    + "Check the file exists and is a valid service account key.", serviceAccountPath, e);
        }
    }
}
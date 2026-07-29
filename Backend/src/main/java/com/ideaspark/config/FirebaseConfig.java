package com.ideaspark.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

// Initializes the Firebase Admin SDK once at startup so the backend can
// SEND push notifications via FCM.
//
// Two ways to supply the service-account credentials (in priority order):
//
//   1. FIREBASE_SERVICE_ACCOUNT_JSON  — the raw JSON content pasted
//      directly into an environment variable. Best for Elastic Beanstalk
//      where instances are ephemeral and files outside the deployment
//      bundle get lost on replacement.
//
//   2. FIREBASE_SERVICE_ACCOUNT_PATH  — a file-system path to the JSON
//      key file. Works for local development or fixed-instance servers
//      where you can place the file yourself.
//
// If neither is set, FCM is silently disabled. The rest of the app
// (including WebSocket-only notifications) keeps working normally.
//
// IMPORTANT: This is NOT google-services.json (that one goes in the
// Android app and lets the app RECEIVE messages). This key lets the
// SERVER SEND messages — keep it out of git.
@Slf4j
@Component
public class FirebaseConfig {

    // Priority 1 — raw JSON content (ideal for Elastic Beanstalk env vars).
    @Value("${firebase.service-account-json:}")
    private String serviceAccountJson;

    // Priority 2 — file path (ideal for local dev / fixed servers).
    @Value("${firebase.service-account-path:}")
    private String serviceAccountPath;

    @PostConstruct
    public void init() {
        boolean hasJson = serviceAccountJson != null && !serviceAccountJson.isBlank();
        boolean hasPath = serviceAccountPath != null && !serviceAccountPath.isBlank();

        if (!hasJson && !hasPath) {
            log.warn("Neither firebase.service-account-json nor firebase.service-account-path is set "
                    + "— Firebase Cloud Messaging is disabled. Push notifications will not be sent "
                    + "(WebSocket-only notifications still work).");
            return;
        }

        if (!FirebaseApp.getApps().isEmpty()) {
            return; // already initialized (e.g. test context re-runs @PostConstruct)
        }

        try {
            GoogleCredentials credentials;

            if (hasJson) {
                // Read credentials directly from the env-var JSON string.
                log.info("Initializing Firebase from FIREBASE_SERVICE_ACCOUNT_JSON env var.");
                try (InputStream stream = new ByteArrayInputStream(
                        serviceAccountJson.getBytes(StandardCharsets.UTF_8))) {
                    credentials = GoogleCredentials.fromStream(stream);
                }
            } else {
                // Fall back to reading from a file on disk.
                log.info("Initializing Firebase from file: {}", serviceAccountPath);
                try (FileInputStream stream = new FileInputStream(serviceAccountPath)) {
                    credentials = GoogleCredentials.fromStream(stream);
                }
            }

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(credentials)
                    .build();
            FirebaseApp.initializeApp(options);
            log.info("Firebase Admin SDK initialized — push notifications enabled.");

        } catch (IOException e) {
            log.error("Failed to initialize Firebase Admin SDK — push notifications disabled. "
                    + "Check the service account JSON is valid.", e);
        }
    }
}

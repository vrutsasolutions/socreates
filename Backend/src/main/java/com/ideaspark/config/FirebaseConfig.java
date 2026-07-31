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
import java.io.InputStream;

// Initializes the Firebase Admin SDK once at startup so the backend can
// SEND push notifications via FCM.
//
// Credentials are read from a JSON key file on disk:
//
//   FIREBASE_SERVICE_ACCOUNT_PATH — path to the service-account JSON file.
//
// On Elastic Beanstalk, the file is bundled into the deployment zip
// (Backend/secrets/firebase-service-account.json, gitignored) and extracted
// to /var/app/current/secrets/firebase-service-account.json — see
// deploy-package.sh. Set FIREBASE_SERVICE_ACCOUNT_PATH to that path as an
// EB environment variable. Using a file instead of pasting the raw JSON
// into an env var avoids two problems: EB's combined environment-variables
// size limit (4096 chars across ALL vars, easily blown by one ~2-3k char
// key), and corruption from `eb setenv`'s comma-splitting or console
// copy/paste mangling quotes.
//
// If the path isn't set, FCM is silently disabled. The rest of the app
// (including WebSocket-only notifications) keeps working normally.
//
// IMPORTANT: This is NOT google-services.json (that one goes in the
// Android app and lets the app RECEIVE messages). This key lets the
// SERVER SEND messages — keep it out of git.
@Slf4j
@Component
public class FirebaseConfig {

    @Value("${firebase.service-account-path:}")
    private String serviceAccountPath;

    @PostConstruct
    public void init() {
        if (serviceAccountPath == null || serviceAccountPath.isBlank()) {
            log.warn("firebase.service-account-path not set — Firebase Cloud Messaging is "
                    + "disabled. Push notifications will not be sent (WebSocket-only "
                    + "notifications still work).");
            return;
        }

        if (!FirebaseApp.getApps().isEmpty()) {
            return; // already initialized (e.g. test context re-runs @PostConstruct)
        }

        log.info("Initializing Firebase from file: {}", serviceAccountPath);

        try (InputStream stream = new FileInputStream(serviceAccountPath)) {
            GoogleCredentials credentials = GoogleCredentials.fromStream(stream);

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(credentials)
                    .build();
            FirebaseApp.initializeApp(options);
            log.info("Firebase Admin SDK initialized — push notifications enabled.");

        } catch (IOException e) {
            log.error("Failed to initialize Firebase Admin SDK — push notifications disabled. "
                    + "Could not read or parse the service account file at '{}'. Check that "
                    + "deploy-package.sh included secrets/firebase-service-account.json in the "
                    + "deployment zip, and that FIREBASE_SERVICE_ACCOUNT_PATH matches its "
                    + "extracted location on the instance.", serviceAccountPath, e);
        }
    }
}

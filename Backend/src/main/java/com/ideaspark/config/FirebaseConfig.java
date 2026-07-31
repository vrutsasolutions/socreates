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
import java.util.Base64;

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
                log.info("Initializing Firebase from FIREBASE_SERVICE_ACCOUNT_JSON env var.");

                // Elastic Beanstalk env vars are fragile for raw JSON: `eb setenv`
                // splits on commas, and console copy/paste often adds stray
                // wrapping quotes — both corrupt the value before it even gets
                // here. To sidestep that entirely, we accept the value as
                // base64-encoded JSON and only fall back to treating it as raw
                // JSON if it doesn't look like base64.
                String rawJson = decodeIfBase64(serviceAccountJson.trim());

                try (InputStream stream = new ByteArrayInputStream(
                        rawJson.getBytes(StandardCharsets.UTF_8))) {
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
                    + "The value in FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON (or valid "
                    + "base64-encoded JSON). Common causes on Elastic Beanstalk: the value was "
                    + "set with `eb setenv KEY=val1,val2` and got split on the commas inside the "
                    + "JSON, or it was pasted with extra wrapping quotes. Re-encode the key file "
                    + "as base64 (e.g. `base64 -w0 service-account.json`) and set that as the env "
                    + "var value instead — see FirebaseConfig class comment for details.", e);
        }
    }

    // Returns the base64-decoded string if `value` looks like base64-encoded
    // JSON (i.e. it does NOT already start with '{', the first char of any
    // valid service-account JSON document). Otherwise returns `value` as-is
    // so existing raw-JSON env vars keep working unchanged.
    private String decodeIfBase64(String value) {
        if (value.isEmpty() || value.charAt(0) == '{') {
            return value;
        }
        try {
            byte[] decoded = Base64.getDecoder().decode(value);
            return new String(decoded, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            // Not valid base64 either — let it fall through and fail parsing
            // as raw JSON, which will produce a clear error above.
            return value;
        }
    }
}

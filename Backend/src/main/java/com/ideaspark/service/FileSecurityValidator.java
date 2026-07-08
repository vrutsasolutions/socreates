package com.ideaspark.service;

import org.apache.tika.Tika;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Set;

/**
 * Verifies uploaded files by their actual content (magic bytes), not just the
 * client-supplied filename extension or Content-Type header — both of which
 * are trivially spoofable. Uses Apache Tika to sniff the real MIME type from
 * the file bytes themselves.
 */
@Component
public class FileSecurityValidator {

    private final Tika tika = new Tika();

    private static final Set<String> ALLOWED_IMAGE_MIME_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );
    private static final Set<String> ALLOWED_IMAGE_EXTENSIONS = Set.of(
            ".jpg", ".jpeg", ".png", ".webp", ".gif"
    );

    // NOTE: browsers record audio into a WebM/Ogg container. Tika's magic-byte
    // sniffing sometimes classifies audio-only WebM as "video/webm" because the
    // container format itself doesn't distinguish without deeper parsing — so
    // both are accepted here. Test this specifically after wiring it in.
    private static final Set<String> ALLOWED_VOICE_MIME_TYPES = Set.of(
            "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav",
            "audio/ogg", "audio/webm", "audio/x-m4a", "video/webm"
    );
    private static final Set<String> ALLOWED_VOICE_EXTENSIONS = Set.of(
            ".mp3", ".mp4", ".wav", ".m4a", ".ogg", ".webm"
    );

    // Documents — a real whitelist, not "anything goes" like uploadFile() had before.
    private static final Set<String> ALLOWED_DOCUMENT_MIME_TYPES = Set.of(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain", "text/csv",
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );
    private static final Set<String> ALLOWED_DOCUMENT_EXTENSIONS = Set.of(
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
            ".txt", ".csv", ".jpg", ".jpeg", ".png", ".webp", ".gif"
    );

    public void validateImage(MultipartFile file) {
        validate(file, ALLOWED_IMAGE_MIME_TYPES, ALLOWED_IMAGE_EXTENSIONS, "Image");
    }

    public void validateVoice(MultipartFile file) {
        validate(file, ALLOWED_VOICE_MIME_TYPES, ALLOWED_VOICE_EXTENSIONS, "Voice");
    }

    public void validateDocument(MultipartFile file) {
        validate(file, ALLOWED_DOCUMENT_MIME_TYPES, ALLOWED_DOCUMENT_EXTENSIONS, "Document");
    }

    private void validate(MultipartFile file, Set<String> allowedMimeTypes,
                           Set<String> allowedExtensions, String label) {

        if (file == null || file.isEmpty()) {
            throw new RuntimeException(label + " file is empty");
        }

        // 1. Extension whitelist — cheap first filter.
        String extension = extractExtension(file.getOriginalFilename());
        if (extension.isEmpty() || !allowedExtensions.contains(extension)) {
            throw new RuntimeException(
                    "Unsupported " + label.toLowerCase() + " file extension: "
                            + (extension.isEmpty() ? "(none)" : extension));
        }

        // 2. Magic-byte check — the REAL type from file content, ignoring
        //    whatever the client claims in Content-Type or the filename.
        String detectedMimeType;
        try {
            detectedMimeType = tika.detect(file.getInputStream());
        } catch (IOException e) {
            throw new RuntimeException(label + " file could not be read for validation", e);
        }

        if (!allowedMimeTypes.contains(detectedMimeType)) {
            throw new RuntimeException(
                    "Unsupported " + label.toLowerCase() + " content detected: " + detectedMimeType
                            + " — the file's actual content does not match an allowed type.");
        }
    }

    private String extractExtension(String filename) {
        if (filename == null) return "";
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == filename.length() - 1) return "";
        return filename.substring(dotIndex).toLowerCase();
    }
}
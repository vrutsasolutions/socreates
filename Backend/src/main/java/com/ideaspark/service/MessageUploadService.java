package com.ideaspark.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MessageUploadService {

    private final S3Client s3Client;

    @Value("${cloudflare.r2.bucket-name}")
    private String bucketName;

    @Value("${cloudflare.r2.public-url}")
    private String publicUrl;

    // Allowed image types
    private static final java.util.Set<String> ALLOWED_IMAGE_TYPES = java.util.Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );

    // FIX (Bug 1): Browser MediaRecorder sends codec-qualified MIME types like
    // "audio/webm;codecs=opus" — the bare "audio/webm" check was rejecting them.
    // Added all common codec-qualified variants to prevent false rejections.
    private static final java.util.Set<String> ALLOWED_VOICE_TYPES = java.util.Set.of(
            "audio/mpeg",
            "audio/mp3",
            "audio/mp4",
            "audio/wav",
            "audio/x-m4a",
            "audio/ogg",
            "audio/ogg;codecs=opus",          // ✅ FIX: Firefox MediaRecorder default
            "audio/webm",
            "audio/webm;codecs=opus",          // ✅ FIX: Chrome/Edge MediaRecorder default
            "audio/webm;codecs=vorbis"         // ✅ FIX: Chrome fallback
    );

    public String uploadImage(MultipartFile file) {
        validateFile(file, ALLOWED_IMAGE_TYPES, 10 * 1024 * 1024, "Image"); // 10 MB limit
        return upload(file, "messages/images");
    }

    public String uploadVoice(MultipartFile file) {
        validateFile(file, ALLOWED_VOICE_TYPES, 5 * 1024 * 1024, "Voice"); // 5 MB limit
        return upload(file, "messages/voice");
    }

    private String upload(MultipartFile file, String folder) {
        try {
            String originalName = file.getOriginalFilename() != null
                    ? file.getOriginalFilename().replaceAll("\\s+", "-")
                    : "file";

            String key = folder + "/" + UUID.randomUUID() + "-" + originalName;

            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(request, RequestBody.fromBytes(file.getBytes()));

            return publicUrl + "/" + key;

        } catch (Exception e) {
            throw new RuntimeException("R2 upload failed: " + e.getMessage(), e);
        }
    }

    private void validateFile(MultipartFile file, java.util.Set<String> allowedTypes,
                               long maxBytes, String label) {
        if (file == null || file.isEmpty())
            throw new RuntimeException(label + " file is empty");

        if (!allowedTypes.contains(file.getContentType()))
            throw new RuntimeException("Unsupported " + label + " type: " + file.getContentType());

        if (file.getSize() > maxBytes)
            throw new RuntimeException(label + " file too large (max "
                    + (maxBytes / 1024 / 1024) + " MB)");
    }
}

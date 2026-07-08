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
    private final FileSecurityValidator fileSecurityValidator;

    @Value("${cloudflare.r2.bucket-name}")
    private String bucketName;

    @Value("${cloudflare.r2.public-url}")
    private String publicUrl;

    public String uploadImage(MultipartFile file) {
        validateSize(file, 10 * 1024 * 1024, "Image");
        fileSecurityValidator.validateImage(file);
        return upload(file, "messages/images");
    }

    public String uploadVoice(MultipartFile file) {
        validateSize(file, 5 * 1024 * 1024, "Voice");
        fileSecurityValidator.validateVoice(file);
        return upload(file, "messages/voice");
    }

    // Documents — now a real whitelist (pdf/office/text/images), not
    // "any content type" like before.
    public String uploadFile(MultipartFile file) {
        validateSize(file, 20 * 1024 * 1024, "File");
        fileSecurityValidator.validateDocument(file);
        return upload(file, "messages/files");
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

    private void validateSize(MultipartFile file, long maxBytes, String label) {
        if (file == null || file.isEmpty())
            throw new RuntimeException(label + " file is empty");

        if (file.getSize() > maxBytes)
            throw new RuntimeException(label + " file too large (max "
                    + (maxBytes / 1024 / 1024) + " MB)");
    }
}
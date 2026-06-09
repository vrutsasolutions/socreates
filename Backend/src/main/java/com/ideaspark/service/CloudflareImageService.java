package com.ideaspark.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CloudflareImageService {

    private final S3Client s3Client;

    @Value("${cloudflare.r2.bucket-name}")
    private String bucketName;

    @Value("${cloudflare.r2.public-url}")
    private String publicUrl;

    public String upload(MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) {
                return null;
            }

            String originalName = file.getOriginalFilename() != null
                    ? file.getOriginalFilename().replaceAll("\\s+", "-")
                    : "image";

            String fileName = "ideas/" + UUID.randomUUID() + "-" + originalName;

            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileName)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(
                    request,
                    RequestBody.fromBytes(file.getBytes())
            );

            return publicUrl + "/" + fileName;

        } catch (Exception e) {
            throw new RuntimeException("Cloudflare R2 upload failed: " + e.getMessage(), e);
        }
    }

    public void deleteImage(String imageUrl) {
        try {
            if (imageUrl == null || imageUrl.isBlank()) {
                System.out.println("R2 delete skipped: imageUrl is empty");
                return;
            }

            String normalizedPublicUrl = publicUrl.endsWith("/")
                    ? publicUrl.substring(0, publicUrl.length() - 1)
                    : publicUrl;

            String key;

            if (imageUrl.startsWith(normalizedPublicUrl + "/")) {
                key = imageUrl.substring((normalizedPublicUrl + "/").length());
            } else if (imageUrl.contains("/ideas/")) {
                key = imageUrl.substring(imageUrl.indexOf("ideas/"));
            } else {
                key = imageUrl;
            }

            key = key.trim();

            System.out.println("Public URL = " + normalizedPublicUrl);
            System.out.println("Incoming URL = " + imageUrl);
            System.out.println("Deleting R2 object key = [" + key + "]");

            DeleteObjectRequest request = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();

            s3Client.deleteObject(request);

            System.out.println("Deleted from R2 successfully");

        } catch (Exception e) {
            System.out.println("Cloudflare R2 delete failed: " + e.getMessage());
        }
    }
}
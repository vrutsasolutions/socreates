package com.ideaspark.controller;

import com.ideaspark.model.Message.MessageType;
import com.ideaspark.service.MessageService;
import com.ideaspark.service.MessageUploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageUploadController {

    private final MessageUploadService messageUploadService;
    private final MessageService messageService;

    /**
     * POST /api/messages/upload/image
     * Form-data: file = <image file>, conversationId = <uuid> (optional but
     * required to enforce the free-tier file-share limit before upload)
     * Returns: { "url": "https://..." }
     */
    @PostMapping("/upload/image")
    public ResponseEntity<Map<String, String>> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "conversationId", required = false) UUID conversationId,
            Authentication auth) {
        if (conversationId != null) {
            messageService.assertWithinFreeLimit(conversationId, auth.getName(), MessageType.IMAGE);
        }
        String url = messageUploadService.uploadImage(file);
        return ResponseEntity.ok(Map.of("url", url));
    }

    /**
     * POST /api/messages/upload/voice
     * Form-data: file = <audio file>, conversationId = <uuid> (optional but
     * required to enforce the free-tier file-share limit before upload)
     * Returns: { "url": "https://..." }
     */
    @PostMapping("/upload/voice")
    public ResponseEntity<Map<String, String>> uploadVoice(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "conversationId", required = false) UUID conversationId,
            Authentication auth) {
        if (conversationId != null) {
            messageService.assertWithinFreeLimit(conversationId, auth.getName(), MessageType.VOICE);
        }
        String url = messageUploadService.uploadVoice(file);
        return ResponseEntity.ok(Map.of("url", url));
    }

    /**
     * POST /api/messages/upload/file
     * Form-data: file = <document / any file>, conversationId = <uuid> (optional
     * but required to enforce the free-tier file-share limit before upload)
     * Returns: { "url": "https://..." }
     */
    @PostMapping("/upload/file")
    public ResponseEntity<Map<String, String>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "conversationId", required = false) UUID conversationId,
            Authentication auth) {
        if (conversationId != null) {
            messageService.assertWithinFreeLimit(conversationId, auth.getName(), MessageType.FILE);
        }
        String url = messageUploadService.uploadFile(file);
        return ResponseEntity.ok(Map.of("url", url));
    }
}

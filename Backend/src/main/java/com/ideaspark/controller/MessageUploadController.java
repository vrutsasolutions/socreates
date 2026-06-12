package com.ideaspark.controller;

import com.ideaspark.service.MessageUploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageUploadController {

    private final MessageUploadService messageUploadService;

    /**
     * POST /api/messages/upload/image
     * Form-data: file = <image file>
     * Returns: { "url": "https://..." }
     */
    @PostMapping("/upload/image")
    public ResponseEntity<Map<String, String>> uploadImage(
            @RequestParam("file") MultipartFile file) {
        String url = messageUploadService.uploadImage(file);
        return ResponseEntity.ok(Map.of("url", url));
    }

    /**
     * POST /api/messages/upload/voice
     * Form-data: file = <audio file>
     * Returns: { "url": "https://..." }
     */
    @PostMapping("/upload/voice")
    public ResponseEntity<Map<String, String>> uploadVoice(
            @RequestParam("file") MultipartFile file) {
        String url = messageUploadService.uploadVoice(file);
        return ResponseEntity.ok(Map.of("url", url));
    }
}

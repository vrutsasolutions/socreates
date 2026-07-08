package com.ideaspark.controller;

import com.ideaspark.dto.ApiResponse;
import com.ideaspark.service.AiService;
import com.ideaspark.service.RateLimiterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;
    private final RateLimiterService rateLimiterService;

    /**
     * POST /api/ai/enhance   (also /api/ai/refine as alias)
     *
     * Request body:
     *   { "title": "...", "description": "...", "mode": "enhance" | "grammar" }
     *
     * mode is optional — defaults to "enhance" if omitted.
     *
     * Response body:
     *   { "title": "...", "description": "..." }
     */
    @PostMapping({"/refine", "/enhance"})
    public ResponseEntity<?> refine(@RequestBody Map<String, String> request) {

        String userKey = currentUserKey();
        if (!rateLimiterService.allowAiRefine(userKey)) {
            return ResponseEntity.status(429)
                .body(new ApiResponse(false,
                    "You've reached today's limit for AI refine/enhance requests. Please try again tomorrow."));
        }

        String title       = request.get("title");
        String description = request.get("description");
        String mode         = request.getOrDefault("mode", "enhance"); // "enhance" | "grammar"

        if ((title == null || title.isBlank()) &&
            (description == null || description.isBlank())) {
            return ResponseEntity.badRequest()
                .body(new ApiResponse(false,
                    "Please write a title or description before using AI."));
        }

        try {
            Map<String, String> refined = aiService.refineIdea(title, description, mode);
            return ResponseEntity.ok(refined);

        } catch (Exception e) {
            System.err.println("[AiController] Groq error: " + e.getMessage());
            return ResponseEntity.status(503)
                .body(new ApiResponse(false,
                    "AI service is temporarily unavailable. Please try again."));
        }
    }

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody Map<String, String> request) {

        String userKey = currentUserKey();
        if (!rateLimiterService.allowAiChat(userKey)) {
            return ResponseEntity.status(429)
                    .body(new ApiResponse(false,
                        "You've reached today's limit for AI chat messages. Please try again tomorrow."));
        }

        String message = request.get("message");
        String mode = request.getOrDefault("mode", "chat");

        if (message == null || message.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, "Message is required"));
        }

        try {
            Map<String, String> response = aiService.chat(message, mode);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("[AiController] Chat error: " + e.getMessage());
            return ResponseEntity.status(503)
                    .body(new ApiResponse(false, "AI chatbot is temporarily unavailable."));
        }
    }

    // Identifies the caller for rate-limiting purposes. Since /api/ai/** is
    // .authenticated() in SecurityConfig, Spring Security always has a
    // principal here — its name is the user's email (JwtUtil.generateToken
    // uses email as the JWT subject, see AuthService#buildResponse).
    private String currentUserKey() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication.getName();
    }
}
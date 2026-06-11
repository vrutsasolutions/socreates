package com.ideaspark.controller;

import com.ideaspark.dto.ApiResponse;
import com.ideaspark.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

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

        String title       = request.get("title");
        String description = request.get("description");
        String mode        = request.getOrDefault("mode", "enhance"); // "enhance" | "grammar"

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
}

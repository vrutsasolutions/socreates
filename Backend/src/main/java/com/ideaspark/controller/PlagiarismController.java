package com.ideaspark.controller;

import com.ideaspark.dto.ApiResponse;
import com.ideaspark.dto.PlagiarismResult;
import com.ideaspark.service.PlagiarismService;
import com.ideaspark.service.RateLimiterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/plagiarism")
@RequiredArgsConstructor
public class PlagiarismController {

    private final PlagiarismService plagiarismService;
    private final RateLimiterService rateLimiterService;

    // /api/plagiarism/** is now .authenticated() in SecurityConfig (it used
    // to be permitAll(), letting anyone run the full-DB cosine-similarity
    // scan for free, with no login and no limit). Rate-limited per user on
    // top of that, same pattern as AiController#currentUserKey — Spring
    // Security always has a principal here since the endpoint requires auth.
    @PostMapping("/check")
    public ResponseEntity<?> check(@RequestBody Map<String, String> request) {
        String userKey = currentUserKey();

        if (!rateLimiterService.allowPlagiarismCheck(userKey)) {
            return ResponseEntity.status(429)
                    .body(new ApiResponse(false,
                            "You've reached today's limit for plagiarism checks. Please try again tomorrow."));
        }

        String description = request.get("description");
        PlagiarismResult result = plagiarismService.check(description);
        return ResponseEntity.ok(result);
    }

    private String currentUserKey() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication.getName();
    }
}
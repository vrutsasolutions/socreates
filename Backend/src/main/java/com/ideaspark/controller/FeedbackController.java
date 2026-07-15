package com.ideaspark.controller;

import com.ideaspark.dto.FeedbackRequest;
import com.ideaspark.dto.FeedbackResponse;
import com.ideaspark.model.Feedback;
import com.ideaspark.model.User;
import com.ideaspark.repository.FeedbackRepository;
import com.ideaspark.repository.UserRepository;
import com.ideaspark.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    /**
     * GET /api/feedback/me → this user's feedback if they've already
     * submitted one (204 No Content otherwise). Settings.jsx calls this on
     * load to decide whether to show the "Completed" badge next to the
     * Feedback row.
     */
    @GetMapping("/me")
    public ResponseEntity<FeedbackResponse> getMyFeedback(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return feedbackRepository.findByUserId(user.getId())
                .map(f -> ResponseEntity.ok(toDTO(f)))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /**
     * POST /api/feedback → create this user's one-and-only feedback row,
     * then email the rating + review to vrutsasolutions@gmail.com.
     *
     * Genuinely one-time: if a row already exists for this user, this
     * returns 409 Conflict rather than overwriting it. Settings.jsx already
     * disables the row client-side once submitted, but the server enforces
     * the same rule so a direct API call can't bypass it — the unique
     * constraint on feedback.user_id is the last line of defense if two
     * requests ever raced past this check.
     */
    @PostMapping
    public ResponseEntity<?> submitFeedback(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody FeedbackRequest request) {

        if (request.getRating() < 1 || request.getRating() > 5) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Rating must be between 1 and 5"));
        }

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (feedbackRepository.findByUserId(user.getId()).isPresent()) {
            return ResponseEntity.status(409)
                    .body(Map.of("message", "Feedback has already been submitted for this account"));
        }

        Feedback feedback = Feedback.builder()
                .user(user)
                .rating(request.getRating())
                .review(request.getReview())
                .build();

        try {
            feedback = feedbackRepository.save(feedback);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Two racing submits both passed the findByUserId check above —
            // the unique constraint on user_id caught the second insert.
            return ResponseEntity.status(409)
                    .body(Map.of("message", "Feedback has already been submitted for this account"));
        }

        emailService.sendFeedbackEmail(
                user.getName(), user.getEmail(), feedback.getRating(), feedback.getReview());

        return ResponseEntity.ok(toDTO(feedback));
    }

    private FeedbackResponse toDTO(Feedback f) {
        return new FeedbackResponse(f.getRating(), f.getReview(), f.getUpdatedAt());
    }
}

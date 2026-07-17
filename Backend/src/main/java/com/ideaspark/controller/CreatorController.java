package com.ideaspark.controller;

import com.ideaspark.dto.ApiResponse;
import com.ideaspark.dto.CreatorDashboardDTO;
import com.ideaspark.dto.CreatorEarningDTO;
import com.ideaspark.dto.PayoutDetailsRequest;
import com.ideaspark.repository.IdeaRepository;
import com.ideaspark.service.CreatorPayoutService;
import com.ideaspark.service.CreatorService;
import com.ideaspark.service.RazorpayXService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Creator-specific endpoints.
 *
 * GET /api/creator/dashboard
 * GET /api/creator/earnings
 * POST /api/creator/ideas/{id}/read
 * GET /api/creator/payout-details
 * PUT /api/creator/payout-details
 *
 * Creator self-withdrawal has been removed. Payouts are processed
 * automatically by ScheduledPayoutRunner.
 */
@RestController
@RequestMapping("/api/creator")
@RequiredArgsConstructor
public class CreatorController {

    private final CreatorService creatorService;
    private final CreatorPayoutService payoutService;
    private final IdeaRepository ideaRepository;

    private ResponseEntity<ApiResponse> unauthenticated() {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(new ApiResponse(
                        false,
                        "User not authenticated"
                ));
    }

    // ── Dashboard ────────────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        if (userDetails == null) {
            return unauthenticated();
        }

        CreatorDashboardDTO dashboard =
                creatorService.getDashboard(
                        userDetails.getUsername()
                );

        return ResponseEntity.ok(dashboard);
    }

    // ── Earnings ─────────────────────────────────────────────────────────────

    @GetMapping("/earnings")
    public ResponseEntity<?> getEarnings(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        if (userDetails == null) {
            return unauthenticated();
        }

        List<CreatorEarningDTO> earnings =
                creatorService.getEarnings(
                        userDetails.getUsername()
                );

        return ResponseEntity.ok(earnings);
    }

    // ── Idea read tracking ───────────────────────────────────────────────────

    @PostMapping("/ideas/{id}/read")
    @Transactional
    public ResponseEntity<ApiResponse> trackRead(
            @PathVariable UUID id
    ) {
        if (!ideaRepository.existsById(id)) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse(
                            false,
                            "Idea not found"
                    ));
        }

        ideaRepository.incrementReadCount(id);

        return ResponseEntity.ok(
                new ApiResponse(
                        true,
                        "Read tracked"
                )
        );
    }

    // ── Payout setup ─────────────────────────────────────────────────────────

    /**
     * Returns the creator's active payout destination.
     */
    @GetMapping("/payout-details")
    public ResponseEntity<?> getPayoutDetails(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        if (userDetails == null) {
            return unauthenticated();
        }

        return ResponseEntity.ok(
                payoutService.getPayoutDetails(
                        userDetails.getUsername()
                )
        );
    }

    /**
     * Creates or replaces the creator's payout destination.
     *
     * Payouts themselves are processed automatically. This endpoint only
     * manages the destination used by the scheduled payout system.
     */
    @PutMapping("/payout-details")
    public ResponseEntity<?> savePayoutDetails(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PayoutDetailsRequest request
    ) {
        if (userDetails == null) {
            return unauthenticated();
        }

        try {
            return ResponseEntity.ok(
                    payoutService.savePayoutDetails(
                            userDetails.getUsername(),
                            request
                    )
            );

        } catch (IllegalArgumentException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            safeMessage(
                                    exception,
                                    "Invalid payout details"
                            )
                    ));

        } catch (IllegalStateException exception) {
            return ResponseEntity
                    .status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of(
                            "message",
                            safeMessage(
                                    exception,
                                    "Payout service is unavailable"
                            )
                    ));

        } catch (RazorpayXService.RazorpayXException exception) {
            return ResponseEntity
                    .status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of(
                            "message",
                            safeMessage(
                                    exception,
                                    "Razorpay rejected the payout details"
                            )
                    ));

        } catch (Exception exception) {
            return ResponseEntity
                    .internalServerError()
                    .body(Map.of(
                            "message",
                            "Could not save payout details: "
                                    + safeMessage(
                                            exception,
                                            "Unexpected error"
                                    )
                    ));
        }
    }

    private static String safeMessage(
            Exception exception,
            String fallback
    ) {
        return exception.getMessage() != null
                && !exception.getMessage().isBlank()
                ? exception.getMessage()
                : fallback;
    }
}
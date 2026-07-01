package com.ideaspark.controller;

import com.ideaspark.dto.ApiResponse;
import com.ideaspark.dto.CreatorDashboardDTO;
import com.ideaspark.dto.CreatorEarningDTO;
import com.ideaspark.dto.PayoutDetailsRequest;
import com.ideaspark.dto.PayoutRequest;
import com.ideaspark.dto.SeedEarningRequest;
import com.ideaspark.repository.IdeaRepository;
import com.ideaspark.repository.UserRepository;
import com.ideaspark.service.CreatorPayoutService;
import com.ideaspark.service.CreatorService;
import com.ideaspark.service.RazorpayXService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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
 *   GET  /api/creator/dashboard  → CreatorDashboardDTO  (JWT required)
 *   GET  /api/creator/earnings   → List<CreatorEarningDTO>  (JWT required)
 *   POST /api/creator/ideas/{id}/read  → 200 OK  (increments read count; public)
 */
@RestController
@RequestMapping("/api/creator")
@RequiredArgsConstructor
public class CreatorController {

    private final CreatorService       creatorService;
    private final CreatorPayoutService payoutService;
    private final IdeaRepository       ideaRepository;
    private final UserRepository       userRepository;

    /** DEV ONLY — gates the seed-earning helper. False in production. */
    @Value("${app.dev-seed-enabled:false}")
    private boolean devSeedEnabled;

    // ── Unauthenticated helper ───────────────────────────────────────────────
    private ResponseEntity<ApiResponse> unauthenticated() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiResponse(false, "User not authenticated"));
    }

    // ────────────────────────────────────────────────────────────────────────
    //  GET /api/creator/dashboard
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Returns the full creator dashboard payload for the authenticated user.
     *
     * Response shape:
     * {
     *   "status":      { "creatorPro": true, "verified": true, "premiumPublishing": true },
     *   "performance": { "ideasPublished": 25, "totalReads": 4280, "totalLikes": 72,
     *                    "totalSaves": 328, "totalComments": 72 },
     *   "content":     [ { "idea": "AI Farming Platform", "reads": 1200, "likes": 1200,
     *                      "comments": 1200, "saves": 80, "score": 25 } ],
     *   "premium":     { "premiumIdeas": 8, "freeIdeas": 17, "premiumReads": 2150 },
     *   "monthlyScore": 85,
     *   "earnings":    { "estimated": 18420 }
     * }
     */
    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard(
            @AuthenticationPrincipal UserDetails userDetails) {

        if (userDetails == null) {
            return unauthenticated();
        }

        CreatorDashboardDTO dashboard = creatorService.getDashboard(userDetails.getUsername());
        return ResponseEntity.ok(dashboard);
    }

    // ────────────────────────────────────────────────────────────────────────
    //  GET /api/creator/earnings
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Returns the revenue history table (one row per calendar month, newest first).
     *
     * Response shape (array):
     * [
     *   { "month": "2026-06-01", "score": 70, "earning": 15000, "status": "Pending" },
     *   { "month": "2026-05-01", "score": 90, "earning": 25000, "status": "Paid" }
     * ]
     *
     * The current month row is seeded / refreshed automatically on each call
     * so the live score is always up to date.
     */
    @GetMapping("/earnings")
    public ResponseEntity<?> getEarnings(
            @AuthenticationPrincipal UserDetails userDetails) {

        if (userDetails == null) {
            return unauthenticated();
        }

        List<CreatorEarningDTO> earnings = creatorService.getEarnings(userDetails.getUsername());
        return ResponseEntity.ok(earnings);
    }

    // ────────────────────────────────────────────────────────────────────────
    //  POST /api/creator/ideas/{id}/read
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Increments the read counter for an idea.
     * Call this from the frontend when the idea detail page is opened.
     * No authentication required — anonymous readers count too.
     *
     * Returns 200 OK on success, 404 if the idea doesn't exist.
     */
    @PostMapping("/ideas/{id}/read")
    @Transactional
    public ResponseEntity<ApiResponse> trackRead(@PathVariable UUID id) {

        if (!ideaRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse(false, "Idea not found"));
        }

        ideaRepository.incrementReadCount(id);
        return ResponseEntity.ok(new ApiResponse(true, "Read tracked"));
    }

    // ────────────────────────────────────────────────────────────────────────
    //  Payouts (RazorpayX, test mode)
    // ────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/creator/payout-details — the creator's saved payout destination.
     *
     * { "configured": false }  when nothing is saved yet, otherwise
     * { "configured": true, "method": "bank_account",
     *   "destination": "HDFC ****4321", "accountName": "Alex Johnson" }
     */
    @GetMapping("/payout-details")
    public ResponseEntity<?> getPayoutDetails(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return unauthenticated();
        return ResponseEntity.ok(payoutService.getPayoutDetails(userDetails.getUsername()));
    }

    /**
     * PUT /api/creator/payout-details — save/update the payout destination.
     * Creates the RazorpayX contact + fund account and persists their ids.
     * Body: { method: "vpa"|"bank_account", vpa | accountName+accountNumber+ifsc }
     */
    @PutMapping("/payout-details")
    public ResponseEntity<?> savePayoutDetails(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody PayoutDetailsRequest req) {
        if (userDetails == null) return unauthenticated();
        try {
            return ResponseEntity.ok(payoutService.savePayoutDetails(userDetails.getUsername(), req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", e.getMessage()));
        } catch (RazorpayXService.RazorpayXException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Could not save payout details: " + e.getMessage()));
        }
    }

    /**
     * POST /api/creator/payouts — withdraw one Pending earnings row via RazorpayX.
     * Body: { month: "2026-05-01" }. Flips the row to "Paid" on success.
     */
    @PostMapping("/payouts")
    public ResponseEntity<?> requestPayout(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody PayoutRequest req) {
        if (userDetails == null) return unauthenticated();
        try {
            return ResponseEntity.ok(payoutService.requestPayout(userDetails.getUsername(), req.getMonth()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        } catch (RazorpayXService.RazorpayXException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Payout failed: " + e.getMessage()));
        }
    }

    /**
     * DEV ONLY — POST /api/creator/dev/seed-earning
     * Fabricates a Pending earnings row so the payout flow can be tested.
     * Returns 403 unless app.dev-seed-enabled=true. Body: { month?, amount? }.
     */
    @PostMapping("/dev/seed-earning")
    public ResponseEntity<?> seedEarning(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody(required = false) SeedEarningRequest req) {
        if (userDetails == null) return unauthenticated();
        if (!devSeedEnabled) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ApiResponse(false, "Dev seeding is disabled."));
        }
        SeedEarningRequest body = req != null ? req : new SeedEarningRequest();
        try {
            return ResponseEntity.ok(
                    payoutService.seedEarning(userDetails.getUsername(), body.getMonth(), body.getAmount()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}

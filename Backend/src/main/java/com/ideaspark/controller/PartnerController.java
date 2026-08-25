package com.ideaspark.controller;

import com.ideaspark.dto.ApiResponse;
import com.ideaspark.dto.PartnerApplicationRequest;
import com.ideaspark.dto.PartnerApplicationResponse;
import com.ideaspark.service.PartnerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Partners Program endpoints.
 *
 * Public:
 *   POST /api/partners/apply          — submit an application (auth optional)
 *
 * Authenticated:
 *   GET  /api/partners/my-application — get current user's application status
 *
 * Admin:
 *   GET    /api/admin/partners/pending            — list pending applications
 *   POST   /api/admin/partners/{id}/approve       — approve an application
 *   POST   /api/admin/partners/{id}/reject        — reject an application
 */
@RestController
@RequiredArgsConstructor
public class PartnerController {

    private final PartnerService partnerService;

    // ── Public / Auth-optional ──────────────────────────────────────────

    /**
     * Submit a partner application. Works for both logged-in and anonymous
     * users — anonymous users will have their application linked to their
     * SoCreate account later when they register with the same email.
     */
    @PostMapping("/api/partners/apply")
    public ResponseEntity<?> apply(
            @RequestBody PartnerApplicationRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            String email = userDetails != null ? userDetails.getUsername() : null;
            PartnerApplicationResponse response = partnerService.submit(req, email);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Could not submit application: " + e.getMessage()));
        }
    }

    // ── Authenticated ───────────────────────────────────────────────────

    @GetMapping("/api/partners/my-application")
    public ResponseEntity<?> getMyApplication(
            @AuthenticationPrincipal UserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Not authenticated"));
        }

        PartnerApplicationResponse app =
                partnerService.getMyApplication(userDetails.getUsername());

        if (app == null) {
            return ResponseEntity.ok(Map.of("applied", false));
        }
        return ResponseEntity.ok(app);
    }

    // ── Admin ───────────────────────────────────────────────────────────

    @GetMapping("/api/admin/partners/pending")
    public ResponseEntity<List<PartnerApplicationResponse>> listPending() {
        return ResponseEntity.ok(partnerService.listPending());
    }

    /**
     * List applications by status: pending, approved, or rejected.
     * GET /api/admin/partners/list?status=approved
     */
    @GetMapping("/api/admin/partners/list")
    public ResponseEntity<?> listByStatus(@RequestParam(defaultValue = "pending") String status) {
        if (!List.of("pending", "approved", "rejected").contains(status)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid status: " + status));
        }
        return ResponseEntity.ok(partnerService.listByStatus(status));
    }

    /** Counts per status — used for tab badges. */
    @GetMapping("/api/admin/partners/counts")
    public ResponseEntity<Map<String, Long>> counts() {
        return ResponseEntity.ok(partnerService.statusCounts());
    }

    @PostMapping("/api/admin/partners/approve-all")
    public ResponseEntity<?> approveAll(
            @AuthenticationPrincipal UserDetails adminDetails) {
        try {
            int count = partnerService.approveAll(adminDetails.getUsername());
            return ResponseEntity.ok(Map.of(
                    "approved", count,
                    "message", count + " application(s) approved"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Bulk approve failed: " + e.getMessage()));
        }
    }

    @PostMapping("/api/admin/partners/{id}/approve")
    public ResponseEntity<?> approve(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails adminDetails) {

        try {
            return ResponseEntity.ok(
                    partnerService.approve(id, adminDetails.getUsername()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/api/admin/partners/{id}/reject")
    public ResponseEntity<?> reject(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserDetails adminDetails) {

        String reason = body != null ? body.get("reason") : null;
        try {
            return ResponseEntity.ok(
                    partnerService.reject(id, adminDetails.getUsername(), reason));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }
}

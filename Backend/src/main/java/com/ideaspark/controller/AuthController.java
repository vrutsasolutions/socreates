package com.ideaspark.controller;

import com.ideaspark.dto.*;
import com.ideaspark.service.AuthService;
import com.ideaspark.service.RateLimiterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final RateLimiterService rateLimiterService;

    public AuthController(AuthService authService, RateLimiterService rateLimiterService) {
        this.authService = authService;
        this.rateLimiterService = rateLimiterService;
    }

    // POST /api/auth/register
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req));
    }

    // POST /api/auth/login
    //
    // Rate-limited per email (5 attempts / 15 min) — unlike the OTP-based
    // register/forgot-password flows, this plain password check previously
    // had no brute-force protection at all. Checked here, before
    // AuthService touches the DB, same pattern as AiController's refine/chat
    // endpoints.
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        String email = req.getEmail() == null ? "" : req.getEmail().trim().toLowerCase();

        if (!rateLimiterService.allowLogin(email)) {
            return ResponseEntity.status(429)
                    .body(new ApiResponse(false,
                            "Too many login attempts. Please wait a few minutes and try again."));
        }

        return ResponseEntity.ok(authService.login(req));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@RequestBody GoogleAuthRequest request) {
        return ResponseEntity.ok(authService.googleLogin(request.getToken()));
    }

    // GET /api/auth/check-username?username=mayank
    // success=true → available; success=false → taken or invalid.
    @GetMapping("/check-username")
    public ResponseEntity<ApiResponse> checkUsername(@RequestParam String username) {
        boolean available = authService.isUsernameAvailable(username);
        return ResponseEntity.ok(new ApiResponse(
                available,
                available ? "Username is available" : "Username is not available"));
    }
}
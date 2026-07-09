package com.ideaspark.controller;

import com.ideaspark.service.EmailService;
import com.ideaspark.service.OtpService;
import com.ideaspark.service.RateLimiterService;
import com.ideaspark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor

public class OtpController {

    private final OtpService otpService;
    private final EmailService emailService;
    private final UserRepository userRepository;
    private final RateLimiterService rateLimiterService;

    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, String>> sendOtp(
            @RequestBody Map<String, String> body) {

        String email = body.get("email");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Email is required"));
        }

        email = email.trim().toLowerCase();

        if (!rateLimiterService.allowSend(email)) {
        return ResponseEntity.status(429)
                .body(Map.of("message", "Too many OTP requests. Please try again later."));
    }

        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Email already registered"));
        }

        String otp = otpService.generateOtp(email, "REGISTER");
        emailService.sendOtpEmail(email, otp);

        return ResponseEntity.ok(Map.of("message", "OTP sent to " + email));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, String>> verifyOtp(
            @RequestBody Map<String, String> body) {

        String email = body.get("email");
        String otp = body.get("otp");

        if (email == null || otp == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Email and OTP are required"));
        }

        email = email.trim().toLowerCase();
        if (!rateLimiterService.allowVerify(email)) {
        return ResponseEntity.status(429)
                .body(Map.of("message", "Too many attempts. Please try again later."));
    }

       boolean valid = otpService.validateOtp(email, otp, "REGISTER");

        if (!valid) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid or expired OTP"));
        }

        return ResponseEntity.ok(Map.of("message", "OTP verified successfully"));
    }

    @PostMapping("/forgot-password/send-otp")
    public ResponseEntity<Map<String, String>> sendForgotPasswordOtp(
            @RequestBody Map<String, String> body) {

        String email = body.get("email");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Email is required"));
        }

        email = email.trim().toLowerCase();

        if (!rateLimiterService.allowForgotPasswordSend(email)) {
            return ResponseEntity.status(429)
                    .body(Map.of("message", "Too many OTP requests. Please try again later."));
        }

        if (!userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "No account found with this email"));
        }

        String otp = otpService.generateOtp(email, "FORGOT_PASSWORD");
        emailService.sendPasswordResetEmail(email, otp);

        return ResponseEntity.ok(Map.of("message", "OTP sent to " + email));
    }

    @PostMapping("/forgot-password/verify-otp")
    public ResponseEntity<Map<String, String>> verifyForgotPasswordOtp(
            @RequestBody Map<String, String> body) {

        String email = body.get("email");
        String otp = body.get("otp");

        if (email == null || otp == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Email and OTP are required"));
        }

        email = email.trim().toLowerCase();

        if (!rateLimiterService.allowForgotPasswordVerify(email)) {
            return ResponseEntity.status(429)
                    .body(Map.of("message", "Too many attempts. Please try again later."));
        }

        boolean valid = otpService.validateOtp(email, otp, "FORGOT_PASSWORD");

        if (!valid) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid or expired OTP"));
        }

        // Issue a single-use reset token the client must present at /reset.
        String resetToken = otpService.generateResetToken(email);
        return ResponseEntity.ok(Map.of(
                "message", "OTP verified successfully",
                "resetToken", resetToken));
    }

    // Reset password after OTP verified — requires a valid reset token.
    @PostMapping("/forgot-password/reset")
    public ResponseEntity<Map<String, String>> resetPassword(
            @RequestBody Map<String, String> body) {

        String email = body.get("email");
        String newPassword = body.get("newPassword");
        String resetToken = body.get("resetToken");

        if (email == null || newPassword == null || resetToken == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Email, reset token and new password are required"));
        }

        // SECURITY: a verified-OTP reset token is mandatory, so the reset
        // endpoint cannot be called without proving OTP ownership.
        if (!otpService.validateResetToken(email, resetToken)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid or expired reset session. Please verify the OTP again."));
        }

        email = email.trim().toLowerCase();

        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPassword(new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder()
                .encode(newPassword));

        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }
}
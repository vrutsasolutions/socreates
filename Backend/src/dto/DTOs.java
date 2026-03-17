package com.ideaspark.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

// ── Auth ─────────────────────────────────────────────────────

@Data
public class RegisterRequest {
    private String name;
    private String email;
    private String password;
}

@Data
public class LoginRequest {
    private String email;
    private String password;
}

@Data
public class AuthResponse {
    private String token;
    private UserDTO user;
}

// ── User ─────────────────────────────────────────────────────

@Data
public class UserDTO {
    private UUID id;
    private String name;
    private String email;
    private String profileImage;
    private String bio;
    private boolean isPremium;
}

@Data
public class UpdateProfileRequest {
    private String name;
    private String bio;
    private String password; // optional new password
}

// ── Idea ─────────────────────────────────────────────────────

@Data
public class IdeaDTO {
    private UUID id;
    private String title;
    private String description;
    private String imageUrl;
    private UUID creatorId;
    private String creatorName;
    private String creatorImage;
    private String category;
    private boolean isPremium;
    private int likeCount;
    private boolean savedByCurrentUser;
    private boolean likedByCurrentUser;
    private LocalDateTime createdAt;
}

@Data
public class CreateIdeaRequest {
    private String title;
    private String description;
    private String category;
    private boolean isPremium;
}

// ── Membership ───────────────────────────────────────────────

@Data
public class SubscribeRequest {
    private String plan;       // "monthly" | "yearly"
    private String paymentId;  // from Stripe/Razorpay
}

@Data
public class MembershipDTO {
    private UUID id;
    private String plan;
    private String status;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
}

// ── Plagiarism ───────────────────────────────────────────────

@Data
public class PlagiarismResult {
    private boolean isPlagiarized;
    private double similarityScore;
    private String message;
}

// ── API Response wrapper ─────────────────────────────────────

@Data
public class ApiResponse {
    private boolean success;
    private String message;

    public ApiResponse(boolean success, String message) {
        this.success = success;
        this.message = message;
    }
}

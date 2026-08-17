package com.ideaspark.dto;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Admin-only response for GET /api/admin/payout-accounts.
 *
 * One row per verified Creator Pro subscriber. If the creator has
 * set up payout details, the payout fields are populated; if not,
 * payoutConfigured = false and payout fields are null.
 */
@Data
@Builder
public class AdminPayoutDetailsDTO {

    // ── Creator identity ────────────────────────────────────────────
    private UUID userId;
    private String creatorName;
    private String creatorEmail;
    private String creatorUsername;
    private String profileImage;

    // ── Payout status ───────────────────────────────────────────────
    private boolean payoutConfigured;

    /**
     * Whether the payout account is currently locked for edits.
     * True from the 13th 8 PM IST until the 20th 12:00 AM IST.
     * Admin can unlock individual accounts via
     * POST /api/admin/payout-accounts/{userId}/unlock.
     */
    private boolean payoutLocked;

    // ── Payout account (null when payoutConfigured = false) ─────────
    private UUID payoutAccountId;

    // KYC
    private String legalName;
    private String panNumber;          // full, decrypted
    private String mobileNumber;       // full

    // Bank details
    private String bankName;
    private String accountHolderName;
    private String accountNumber;      // full, decrypted (null for legacy rows)
    private String accountNumberLast4; // always present when configured
    private String ifscCode;
    private String payoutMethod;       // "bank_account"

    // RazorpayX linkage
    private String razorpayContactId;
    private String razorpayFundAccountId;

    // Status
    private boolean active;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}

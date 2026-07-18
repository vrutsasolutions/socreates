package com.ideaspark.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Request body for:
 * PUT /api/creator/payout-details
 *
 * Used when a Creator Pro user completes or updates their payout setup.
 * Only bank_account is supported; UPI/VPA payouts are not available.
 *
 * Cross-field checks (accountNumber == confirmAccountNumber) are enforced
 * manually in CreatorPayoutService#savePayoutDetails() rather than here.
 * The @NotBlank annotations below guard against completely empty identity
 * fields (legalName, mobileNumber, panNumber) that are always required.
 */
@Data
public class PayoutDetailsRequest {

    // -----------------------------
    // Personal / identity details (always required)
    // -----------------------------

    @NotBlank
    private String legalName;

    @NotBlank
    private String mobileNumber;

    @NotBlank
    private String panNumber;

    // -----------------------------
    // Bank details (all required)
    // -----------------------------

    @NotBlank
    private String accountHolderName;

    private String accountNumber;

    private String confirmAccountNumber;

    private String ifscCode;

    private String bankName;

    @AssertTrue(message = "You must confirm that the bank account belongs to you.")
    private boolean ownershipConfirmed;
}

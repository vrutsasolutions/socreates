package com.ideaspark.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Request body for:
 * PUT /api/creator/payout-details
 *
 * Used when a Creator Pro user completes or updates their payout setup.
 *
 * Field requirements depend on {@code method}:
 *   method = "vpa"          → vpa required; bank fields not required
 *   method = "bank_account" → accountHolderName, accountNumber,
 *                             confirmAccountNumber, ifscCode, bankName
 *                             required; vpa not required
 *
 * Cross-field checks (method-conditional requiredness, accountNumber ==
 * confirmAccountNumber) are NOT expressible with simple field-level
 * @NotBlank alone, so they are enforced manually in
 * CreatorPayoutService#savePayoutDetails() rather than here. The @NotBlank
 * annotations below only guard against completely empty legal identity
 * fields (legalName, mobileNumber, panNumber) that are always required
 * regardless of method.
 */
@Data
public class PayoutDetailsRequest {

    // -----------------------------
    // Method selector
    // -----------------------------

    /** "vpa" | "bank_account" */
    @NotBlank
    private String method;

    // -----------------------------
    // VPA (required only when method = "vpa")
    // -----------------------------

    private String vpa;

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
    // Bank details (required only when method = "bank_account")
    // -----------------------------

    private String accountHolderName;

    private String accountNumber;

    private String confirmAccountNumber;

    private String ifscCode;

    private String bankName;

    @AssertTrue(message = "You must confirm that the bank account belongs to you.")
    private boolean ownershipConfirmed;
}
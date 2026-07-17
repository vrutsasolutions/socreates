package com.ideaspark.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Request body for:
 * PUT /api/creator/payout-details
 *
 * Used when a Creator Pro user completes or updates
 * their payout setup.
 */
@Data
public class PayoutDetailsRequest {

    // -----------------------------
    // Personal Details
    // -----------------------------

    @NotBlank
    private String method;

    private String vpa;

    @NotBlank
    private String legalName;

    @NotBlank
    private String mobileNumber;

    @NotBlank
    private String panNumber;

    @NotBlank
    private String accountHolderName;

    @NotBlank
    private String accountNumber;

    @NotBlank
    private String confirmAccountNumber;

    @NotBlank
    private String ifscCode;

    @NotBlank
    private String bankName;

    @AssertTrue(message = "You must confirm that the bank account belongs to you.")
    private boolean ownershipConfirmed;
}
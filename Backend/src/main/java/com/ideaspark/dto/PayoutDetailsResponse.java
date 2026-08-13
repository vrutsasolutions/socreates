package com.ideaspark.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Response for:
 * GET /api/creator/payout-details
 *
 * Used to display the creator's currently active payout account.
 */
@Data
@Builder
public class PayoutDetailsResponse {

    /**
     * Whether the creator has completed payout setup.
     */
    private boolean configured;

    /**
     * bank_account
     */
    private String method;

    /**
     * Account holder / beneficiary name.
     */
    private String accountHolderName;

    /**
     * Bank name (ICICI Bank, HDFC Bank, etc.)
     */
    private String bankName;

    /**
     * Masked destination.
     *
     * Examples:
     * XXXX XXXX 4589
     * creator@okhdfcbank
     */
    private String destination;

    /**
     * Masked PAN, e.g. "ABCDE****F". Never the full PAN.
     */
    private String maskedPan;

    /**
     * Masked mobile number, e.g. "******7890". Never the full number.
     */
    private String maskedMobile;

    /**
     * Whether this payout account is currently active.
     */
    private boolean active;

    /**
     * Whether the payout account has been verified.
     * (Currently always true after successful Razorpay setup.)
     */
    private boolean verified;

    /**
     * Whether the payout account is currently locked for edits.
     * True from the 13th 8 PM IST until the 20th 12:00 AM IST
     * each month during the payout processing window.
     *
     * Frontend should disable the "Edit" / "Update" button and
     * show a message explaining the lock period.
     */
    private boolean locked;
}

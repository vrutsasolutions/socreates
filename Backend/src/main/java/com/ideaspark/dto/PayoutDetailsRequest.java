package com.ideaspark.dto;

import lombok.Data;

/**
 * Body for PUT /api/creator/payout-details — the creator's RazorpayX payout
 * destination. Only the fields for the chosen {@code method} are required:
 *   method = "vpa"          → vpa
 *   method = "bank_account" → accountName, accountNumber, ifsc
 */
@Data
public class PayoutDetailsRequest {
    private String method;         // "vpa" | "bank_account"
    private String vpa;            // e.g. "creator@okhdfcbank"
    private String accountName;    // beneficiary name (bank_account)
    private String accountNumber;  // bank account number
    private String ifsc;           // IFSC code
}

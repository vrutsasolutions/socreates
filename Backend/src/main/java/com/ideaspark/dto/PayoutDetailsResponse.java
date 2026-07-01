package com.ideaspark.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Response for GET /api/creator/payout-details.
 *
 * {
 *   "configured": true,
 *   "method": "bank_account",
 *   "destination": "HDFC ****4321",   // masked, human-readable
 *   "accountName": "Alex Johnson"
 * }
 *
 * `configured` is false (and the rest null) when the creator hasn't saved any
 * payout details yet — the frontend shows the "add details" form in that case.
 */
@Data
@Builder
public class PayoutDetailsResponse {
    private boolean configured;
    private String  method;        // "vpa" | "bank_account" | null
    private String  destination;   // masked VPA or "BANK ****1234"
    private String  accountName;   // beneficiary name (bank_account only)
}

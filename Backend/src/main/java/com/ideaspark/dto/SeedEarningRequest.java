package com.ideaspark.dto;

import lombok.Data;

/**
 * Body for the DEV-ONLY POST /api/creator/dev/seed-earning.
 * Fabricates a Pending earnings row so the RazorpayX payout flow can be tested
 * without a real revenue-pool distribution.
 *
 * Both fields optional: month defaults to the current month, amount to 100 (₹).
 */
@Data
public class SeedEarningRequest {
    private String  month;   // ISO date, 1st of month — e.g. "2026-06-01" (optional)
    private Integer amount;  // rupees (optional; default 100)
}

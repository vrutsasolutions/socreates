package com.ideaspark.dto;

import lombok.Data;

/**
 * Body for POST /api/creator/payouts — withdraw one Pending earnings row.
 * The month identifies the row (matches the "month" string returned by
 * GET /api/creator/earnings, always the 1st of the month, e.g. "2026-06-01").
 */
@Data
public class PayoutRequest {
    private String month;   // ISO date, 1st of the month — e.g. "2026-06-01"
}

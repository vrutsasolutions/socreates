package com.ideaspark.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Response for POST /api/creator/payouts — the outcome of a withdrawal.
 *
 * {
 *   "month": "2026-05-01",
 *   "status": "Paid",              // the earnings-row status after payout
 *   "earning": 25000,              // ₹ paid out
 *   "payoutId": "pout_XXXXXXXX",   // RazorpayX payout id
 *   "payoutStatus": "processing"   // RazorpayX payout status (queued/processing/processed)
 * }
 */
@Data
@Builder
public class PayoutResultResponse {
    private String month;
    private String status;
    private int    earning;
    private String payoutId;
    private String payoutStatus;
}

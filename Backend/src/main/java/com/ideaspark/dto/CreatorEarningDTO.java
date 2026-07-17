package com.ideaspark.dto;

import lombok.Builder;
import lombok.Data;

/**
 * One element in the GET /api/creator/earnings response array.
 *
 * {
 *   "month": "2026-06-01",
 *   "score": 70,
 *   "earning": 15000,
 *   "status": "Scheduled",
 *   "scheduledFor": "2026-07-15T00:00:00",
 *   "paidAt": null,
 *   "destination": "HDFC ****4321",
 *   "failureReason": null,
 *   "retryCount": 0
 * }
 */
@Data
@Builder
public class CreatorEarningDTO {
    /** ISO-8601 date string, always the 1st of the month (e.g. "2026-06-01"). */
    private String month;
    private int    score;
    private int    earning;

    /** Estimating | Pending | Scheduled | Processing | Paid | Rolled_Over | Setup_Missing | Failed */
    private String status;

    /** When this payout is/was scheduled to run (ISO-8601 date-time, null until scheduled). */
    private String scheduledFor;

    /** When the payout actually completed (ISO-8601 date-time, null until paid). */
    private String paidAt;

    /** Masked payout destination shown at time of payout, e.g. "HDFC ****4321" or a UPI VPA. Null if none. */
    private String destination;

    /** Reason the last attempt failed, if status is Failed or Setup_Missing. */
    private String failureReason;

    /** How many retry attempts have been made so far. */
    private int retryCount;
}
package com.ideaspark.dto;

import lombok.Builder;
import lombok.Data;

/**
 * One element in the GET /api/creator/earnings response array.
 *
 * { "month": "2026-06-01", "score": 70, "earning": 15000, "status": "Pending" }
 */
@Data
@Builder
public class CreatorEarningDTO {
    /** ISO-8601 date string, always the 1st of the month (e.g. "2026-06-01"). */
    private String month;
    private int    score;
    private int    earning;
    /** "Pending" | "Paid" */
    private String status;
}

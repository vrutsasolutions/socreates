package com.ideaspark.dto;

import lombok.Builder;
import lombok.Data;


import java.util.List;

/**
 * Response shape for GET /api/creator/dashboard
 *
 * {
 *   "status":      { creatorPro, verified, premiumPublishing },
 *   "performance": { ideasPublished, totalReads, totalLikes, totalSaves, totalComments },
 *   "content":     [ { idea, reads, likes, comments, saves, score } ],
 *   "premium":     { premiumIdeas, freeIdeas, premiumReads },
 *   "monthlyScore": 85,
 *   "earnings":    { estimated: 18420 }
 * }
 */
@Data
@Builder
public class CreatorDashboardDTO {

    private StatusBlock   status;
    private PerformanceBlock performance;
    private List<ContentRow> content;
    private PremiumBlock  premium;
    private int           monthlyScore;
    private EarningsBlock earnings;

    // ── Nested blocks ──────────────────────────────────────────────────────

    @Data
    @Builder
    public static class StatusBlock {
        private boolean creatorPro;
        private boolean verified;
        private boolean premiumPublishing;
    }

    @Data
    @Builder
    public static class PerformanceBlock {
        private int ideasPublished;
        private int totalReads;
        private int totalLikes;
        private long totalSaves;
        private long totalComments;
    }

    /** One row per idea in the content performance table, ordered by reads desc. */
    @Data
    @Builder
    public static class ContentRow {
        private String idea;      // idea title
        private int    reads;
        private int    likes;
        private long   comments;
        private long   saves;
        private int    score;     // per-idea score = (reads*1 + likes*5 + comments*3 + saves*4) / 10
    }

    @Data
    @Builder
    public static class PremiumBlock {
        private int premiumIdeas;
        private int freeIdeas;
        private int premiumReads;
    }

    @Data
    @Builder
    public static class EarningsBlock {
        private int estimated;   // in ₹, derived from monthlyScore
    }
}

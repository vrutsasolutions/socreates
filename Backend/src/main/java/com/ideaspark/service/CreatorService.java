package com.ideaspark.service;

import com.ideaspark.dto.CreatorDashboardDTO;
import com.ideaspark.dto.CreatorEarningDTO;
import com.ideaspark.model.*;
import com.ideaspark.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CreatorService {

    // ── Repositories ────────────────────────────────────────────────────────
    private final UserRepository                  userRepository;
    private final IdeaRepository                  ideaRepository;
    private final SavedIdeaRepository             savedIdeaRepository;
    private final CommentRepository               commentRepository;
    private final CreatorEarningRepository        earningRepository;
    private final CreatorMonthlyMetricsRepository metricsRepository;
    private final RevenuePoolRepository           poolRepository;

    // ── Score weights — must mirror the distribution cron job ────────────────
    // Formula: raw_score = (views*0.25) + (saves*0.40) + (likes*0.20) + (comments*0.15)
    // Stored as scaled longs (*100) to avoid floating-point drift:
    //   views*25 + saves*40 + likes*20 + comments*15  (divide by 100 for the true decimal score)
    private static final long VIEWS_WEIGHT    = 25L;
    private static final long SAVES_WEIGHT    = 40L;
    private static final long LIKES_WEIGHT    = 20L;
    private static final long COMMENTS_WEIGHT = 15L;

    // ── Revenue pool split — per "SoCreate Creator Pro Revenue Distribution
    // Proposal". Reader Premium and Creator Pro revenue are split at
    // *different* rates before being summed into the creator pool:
    //   Reader Premium  → 50% Creator Pool / 50% SoCreate
    //   Creator Pro     → 25% Creator Pool / 75% SoCreate
    // Do NOT change these without business sign-off (same rule as the score
    // weights above) — it directly changes how much creators get paid.
    private static final BigDecimal READER_POOL_SHARE       = new BigDecimal("0.50");
    private static final BigDecimal CREATOR_PRO_POOL_SHARE  = new BigDecimal("0.25");

    // ────────────────────────────────────────────────────────────────────────
    //  GET /api/creator/dashboard
    // ────────────────────────────────────────────────────────────────────────

    @Transactional
    public CreatorDashboardDTO getDashboard(String email) {

        User creator = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UUID creatorId    = creator.getId();
        LocalDate thisMonth = LocalDate.now().withDayOfMonth(1);

        // ── Upsert creator_monthly_metrics for the current month ─────────────
        CreatorMonthlyMetrics metrics = upsertMetrics(creator, thisMonth);

        // ── Pull all-time performance from ideas table directly ──────────────
        int ideasPublished = ideaRepository.countByCreatorId(creatorId);
        int totalReads     = ideaRepository.sumReadCountByCreatorId(creatorId);
        int totalLikes     = ideaRepository.sumLikeCountByCreatorId(creatorId);
        long totalSaves    = savedIdeaRepository.countByIdeaCreatorId(creatorId);
        long totalComments = commentRepository.countByIdeaCreatorId(creatorId);

        // ── Estimated earning from revenue pool (if pool exists for month) ───
        long estimatedPaise = estimateEarning(metrics, thisMonth);

        // ── Content table: top ideas by read count ───────────────────────────
        List<Idea> ideas = ideaRepository.findByCreatorIdOrderByReadCountDesc(creatorId);

        // ── Build content rows ───────────────────────────────────────────────
        // IMPORTANT: Do NOT divide the weighted sum per-idea — integer truncation
        // on each row causes cumulative rounding loss that makes the per-idea total
        // disagree with the DB aggregate raw_score (which divides once on the total).
        // Instead: keep the scaled long (×100) per idea and divide by 100 only when
        // converting to the display integer, so each row is as precise as possible.
        List<CreatorDashboardDTO.ContentRow> contentRows = ideas.stream()
                .map(idea -> {
                    long ideaSaves    = savedIdeaRepository.countByIdeaId(idea.getId());
                    long ideaComments = commentRepository.countByIdeaId(idea.getId());

                    // Scaled weighted sum (×100). No early /100 — avoids truncation loss.
                    // Formula: views×0.25 + saves×0.40 + likes×0.20 + comments×0.15
                    long scaledSum = (idea.getReadCount() * VIEWS_WEIGHT)
                                   + (ideaSaves           * SAVES_WEIGHT)
                                   + (idea.getLikeCount() * LIKES_WEIGHT)
                                   + (ideaComments        * COMMENTS_WEIGHT);

                    // Divide by 100 once per row (matches the single-division the DB uses
                    // on the aggregate). Round to nearest instead of truncating so
                    // e.g. 1.80 → 2, not 1, and the per-idea total matches the DB score.
                    long ideaRaw = (scaledSum + 50) / 100; // +50 = round-half-up

                    // per-idea score capped at 100
                    int ideaScore = (int) Math.min(100L, ideaRaw);

                    return CreatorDashboardDTO.ContentRow.builder()
                            .idea(idea.getTitle())
                            .reads(idea.getReadCount())
                            .likes(idea.getLikeCount())
                            .comments(ideaComments)
                            .saves(ideaSaves)
                            .score(ideaScore)
                            .build();
                })
                .toList();

        // ── Premium breakdown ────────────────────────────────────────────────
        int premiumIdeas = ideaRepository.countByCreatorIdAndIsPremium(creatorId, true);
        int freeIdeas    = ideasPublished - premiumIdeas;
        int premiumReads = ideaRepository.sumPremiumReadCountByCreatorId(creatorId);

        // ── Monthly score: use share_percent if filled, else raw_score ────────
        int monthlyScore = computeDisplayScore(metrics);

        // ── Assemble ─────────────────────────────────────────────────────────
        return CreatorDashboardDTO.builder()
                .status(CreatorDashboardDTO.StatusBlock.builder()
                        .creatorPro(Boolean.TRUE.equals(creator.getCreatorPro()))
                        .verified(creator.isVerified())
                        .premiumPublishing(Boolean.TRUE.equals(creator.getPremiumPublishing()))
                        .build())
                .performance(CreatorDashboardDTO.PerformanceBlock.builder()
                        .ideasPublished(ideasPublished)
                        .totalReads(totalReads)
                        .totalLikes(totalLikes)
                        .totalSaves(totalSaves)
                        .totalComments(totalComments)
                        .build())
                .content(contentRows)
                .premium(CreatorDashboardDTO.PremiumBlock.builder()
                        .premiumIdeas(premiumIdeas)
                        .freeIdeas(freeIdeas)
                        .premiumReads(premiumReads)
                        .build())
                .monthlyScore(monthlyScore)
                .earnings(CreatorDashboardDTO.EarningsBlock.builder()
                        // Convert paise → rupees for the frontend
                        .estimated((int) (estimatedPaise / 100))
                        .build())
                .build();
    }

    // ────────────────────────────────────────────────────────────────────────
    //  GET /api/creator/earnings
    // ────────────────────────────────────────────────────────────────────────

    @Transactional
    public List<CreatorEarningDTO> getEarnings(String email) {

        User creator = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // ── Seed/refresh the current month's row from live metrics ───────────
        // Without this, creator_earnings stays empty forever for a brand-new
        // creator (nothing else in the app ever inserts into this table until
        // the admin distribution job locks a pool), so the history table would
        // always come back [] and the frontend would silently fall back to
        // its mock rows. We keep the current month's row in sync with the
        // monthly metrics on every call; past (locked) months are left alone.
        //
        // upsertMetrics() runs first (independently of /dashboard) so this
        // endpoint works correctly even if it's the first one the creator hits.
        LocalDate thisMonth = LocalDate.now().withDayOfMonth(1);
        upsertMetrics(creator, thisMonth);
        upsertCurrentMonthEarning(creator, thisMonth);

        List<CreatorEarning> rows =
                earningRepository.findByCreatorIdOrderByMonthDesc(creator.getId());

        DateTimeFormatter fmt = DateTimeFormatter.ISO_LOCAL_DATE; // "2026-06-01"

        return rows.stream()
                .map(row -> {
                    // score_percent stored in DB; convert to 0-100 int for display
                    int scoreDisplay = row.getScorePercent() != null
                            ? row.getScorePercent().setScale(0, RoundingMode.HALF_UP).intValue()
                            : 0;

                    // revenue_paise → rupees
                    int earningRupees = row.getRevenuePaise() != null
                            ? (int) (row.getRevenuePaise() / 100)
                            : 0;

                    return CreatorEarningDTO.builder()
                            .month(row.getMonth().format(fmt))
                            .score(scoreDisplay)
                            .earning(earningRupees)
                            .status(row.getStatus())
                            .build();
                })
                .toList();
    }

    // ────────────────────────────────────────────────────────────────────────
    //  Helpers
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Upserts the creator_monthly_metrics row for the given month.
     * Re-counts live data each call so the current-month row stays fresh.
     */
    @Transactional
    protected CreatorMonthlyMetrics upsertMetrics(User creator, LocalDate month) {

        UUID creatorId = creator.getId();

        CreatorMonthlyMetrics m = metricsRepository
                .findByCreatorIdAndMonth(creatorId, month)
                .orElseGet(() -> CreatorMonthlyMetrics.builder()
                        .creator(creator)
                        .month(month)
                        .build());

        long views    = ideaRepository.sumReadCountByCreatorId(creatorId);
        long likes    = ideaRepository.sumLikeCountByCreatorId(creatorId);
        long saves    = savedIdeaRepository.countByIdeaCreatorId(creatorId);
        long comments = commentRepository.countByIdeaCreatorId(creatorId);

        // raw_score = (views*0.25) + (saves*0.40) + (likes*0.20) + (comments*0.15)
        // Multiplied by 100 then divided by 100 to keep integer arithmetic exact.
        long rawScoreLong = ((views    * VIEWS_WEIGHT)
                          +  (saves    * SAVES_WEIGHT)
                          +  (likes    * LIKES_WEIGHT)
                          +  (comments * COMMENTS_WEIGHT)) / 100;

        m.setViews(views);
        m.setLikes(likes);
        m.setSaves(saves);
        m.setComments(comments);
        m.setRawScore(BigDecimal.valueOf(rawScoreLong));
        // share_percent is calculated by the admin/distribution job, not here

        return metricsRepository.save(m);
    }

    /**
     * Upserts the creator_earnings row for the given (current) month so the
     * Revenue History table always has at least one live row instead of
     * coming back empty for creators who haven't been through an admin
     * distribution run yet.
     *
     * - Creates the row on first call for the month, status "Pending".
     * - On every subsequent call for the *same, still-open* month, refreshes
     *   `score_percent` from the live raw_score (capped 0-100) and re-estimates
     *   `revenue_paise` proportionally from the month's revenue pool, if one
     *   exists yet.
     * - Once a row's status is "Paid", it is left untouched — paid history
     *   must never be silently rewritten.
     */
    @Transactional
    protected void upsertCurrentMonthEarning(User creator, LocalDate month) {

        UUID creatorId = creator.getId();

        CreatorEarning earning = earningRepository
                .findByCreatorIdAndMonth(creatorId, month)
                .orElseGet(() -> CreatorEarning.builder()
                        .creator(creator)
                        .month(month)
                        .status("Pending")
                        .build());

        // Never touch a row that's already been paid out / locked.
        if ("Paid".equalsIgnoreCase(earning.getStatus())) {
            return;
        }

        CreatorMonthlyMetrics metrics = metricsRepository
                .findByCreatorIdAndMonth(creatorId, month)
                .orElse(null);

        // Display score: prefer locked share_percent, else live raw_score.
        int liveScore = metrics != null ? computeDisplayScore(metrics) : 0;
        earning.setScorePercent(BigDecimal.valueOf(liveScore));

        // Re-estimate revenue from the pool when one exists for this month;
        // otherwise leave it at whatever it already was (0 on first insert)
        // so the row still appears with a real, live score.
        Long estimatedPaise = poolRepository.findByMonth(month)
                .filter(p -> p.getCreatorPoolPaise() != null
                          && metrics != null
                          && metrics.getSharePercent() != null)
                .map(pool -> metrics.getSharePercent()
                        .divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(pool.getCreatorPoolPaise()))
                        .longValue())
                .orElse(earning.getRevenuePaise() != null ? earning.getRevenuePaise() : 0L);
        earning.setRevenuePaise(estimatedPaise);

        if (earning.getStatus() == null) {
            earning.setStatus("Pending");
        }

        earningRepository.save(earning);
    }

    /**
     * Estimates the creator's earning for the current month in paise.
     *
     * If a revenue pool exists for the month and this creator already has an
     * earnings row with a score_percent, we use the real formula:
     *   earning = score_percent / 100 * pool.creator_pool_paise
     *
     * Otherwise we return a simple estimate using the raw_score weight alone
     * so the dashboard always shows something meaningful.
     */
    private long estimateEarning(CreatorMonthlyMetrics metrics, LocalDate month) {

        // Try the real earnings row first
        return earningRepository
                .findByCreatorIdAndMonth(metrics.getCreator().getId(), month)
                .filter(e -> e.getRevenuePaise() != null)
                .map(CreatorEarning::getRevenuePaise)
                .orElseGet(() ->
                    // Fallback: check if pool exists and estimate proportionally
                    poolRepository.findByMonth(month)
                        .filter(p -> p.getCreatorPoolPaise() != null
                                  && metrics.getSharePercent() != null)
                        .map(pool -> metrics.getSharePercent()
                                .divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP)
                                .multiply(BigDecimal.valueOf(pool.getCreatorPoolPaise()))
                                .longValue())
                        .orElse(0L)
                );
    }

    /**
     * Returns a 0-100 integer score for the monthly-score card.
     * Uses share_percent if the pool has been locked, raw_score otherwise
     * (scaled to a 0-100 range with a divisor that you can tune).
     */
    private int computeDisplayScore(CreatorMonthlyMetrics metrics) {
        if (metrics.getSharePercent() != null
                && metrics.getSharePercent().compareTo(BigDecimal.ZERO) > 0) {
            // share_percent is already 0-100
            return metrics.getSharePercent()
                    .setScale(0, RoundingMode.HALF_UP)
                    .intValue();
        }
        if (metrics.getRawScore() != null) {
            // raw_score can be arbitrarily large; cap at 100
            return (int) Math.min(100L, metrics.getRawScore().longValue() / 50L);
        }
        return 0;
    }

    /**
     * Splits a month's revenue into the creator pool vs. SoCreate's share,
     * per the "SoCreate Creator Pro Revenue Distribution Proposal":
     *
     *   creator_pool   = (readerRevenuePaise    * 0.50)
     *                  + (creatorProRevenuePaise * 0.25)
     *
     *   socreate_share = (readerRevenuePaise    * 0.50)
     *                  + (creatorProRevenuePaise * 0.75)
     *
     * Reader Premium and Creator Pro revenue are split at *different* rates
     * (50/50 vs 25/75) and then summed — this is NOT the same as a flat
     * 50/50 split of total revenue. Each component is floored independently
     * (paise are indivisible) so the pool never overpays; any leftover
     * "dust" implicitly stays with SoCreate via the subtraction in
     * socreateSharePaise().
     *
     * @param readerRevenuePaise     Reader Premium revenue for the month, in paise.
     * @param creatorProRevenuePaise Creator Pro revenue for the month, in paise.
     * @return the creator pool amount, in paise.
     */
    public long creatorPoolPaise(long readerRevenuePaise, long creatorProRevenuePaise) {
        long readerPool     = BigDecimal.valueOf(readerRevenuePaise)
                .multiply(READER_POOL_SHARE)
                .setScale(0, RoundingMode.FLOOR)
                .longValue();
        long creatorProPool = BigDecimal.valueOf(creatorProRevenuePaise)
                .multiply(CREATOR_PRO_POOL_SHARE)
                .setScale(0, RoundingMode.FLOOR)
                .longValue();
        return readerPool + creatorProPool;
    }

    /**
     * SoCreate's share for the month — total revenue minus whatever was
     * floored into the creator pool above, so the two always add back up
     * to total_revenue_paise exactly (any rounding dust lands here, not in
     * the creator pool, matching the "round down per creator, dust stays
     * with the platform" rule used elsewhere in the payout workflow).
     */
    public long socreateSharePaise(long readerRevenuePaise, long creatorProRevenuePaise) {
        long totalRevenue = readerRevenuePaise + creatorProRevenuePaise;
        return totalRevenue - creatorPoolPaise(readerRevenuePaise, creatorProRevenuePaise);
    }
}

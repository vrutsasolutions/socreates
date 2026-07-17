package com.ideaspark.service;

import com.ideaspark.model.AuditLog;
import com.ideaspark.model.CreatorEarning;
import com.ideaspark.model.CreatorMonthlyMetrics;
import com.ideaspark.model.RevenuePool;
import com.ideaspark.repository.AuditLogRepository;
import com.ideaspark.repository.CreatorEarningRepository;
import com.ideaspark.repository.CreatorMonthlyMetricsRepository;
import com.ideaspark.repository.MembershipPaymentRepository;
import com.ideaspark.repository.RevenuePoolRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RevenueDistributionService {

    private static final Logger log = LoggerFactory.getLogger(RevenueDistributionService.class);
    /**
     * Rollover threshold — earnings <= this amount (in paise) roll into next month
     * instead of paying out.
     */
    private static final long ROLLOVER_THRESHOLD_PAISE = 50_000L; // ₹500

    private final RevenuePoolRepository poolRepository;
    private final MembershipPaymentRepository paymentRepository;
    private final CreatorMonthlyMetricsRepository metricsRepository;
    private final CreatorEarningRepository earningRepository;
    private final CreatorService creatorService;
    private final AuditLogRepository auditLogRepository;

    // ────────────────────────────────────────────────────────────────────────
    // P1 item 6b — automatic monthly run
    // ────────────────────────────────────────────────────────────────────────
    //
    // Fires at 00:30 IST on the 1st of every month — i.e. right after the
    // previous month has fully closed, which is exactly the guard distribute()
    // already enforces below (targetMonth must be strictly before the current
    // month). 30 minutes past midnight gives a small buffer clear of any
    // last-minute captured-at-23:59:59-on-the-31st webhook writes finishing
    // their transaction.
    //
    // Calls distribute() directly, in-process — no HTTP, no JWT, no
    // ROLE_ADMIN check, none of that applies here since this isn't a
    // request coming from a browser. The admin endpoint (AdminRevenueController)
    // stays in place as the manual/backup trigger for re-running a month by
    // hand if this scheduled run ever needs to be redone.
    //
    // Zone is pinned explicitly to Asia/Kolkata so this doesn't silently
    // depend on whatever timezone the deployment server's OS happens to be
    // set to (which is very likely UTC, not IST, on most hosting providers —
    // that would fire this ~5.5 hours off from the intended local time).
    @Scheduled(cron = "0 30 0 1 * *", zone = "Asia/Kolkata")
    public void runMonthlyDistribution() {
        YearMonth previousMonth = YearMonth.now().minusMonths(1);
        String monthParam = previousMonth.format(DateTimeFormatter.ofPattern("yyyy-MM"));

        log.info("Scheduled monthly distribution starting for {}", monthParam);

        try {
            Map<String, Object> result = distribute(monthParam);
            log.info("Scheduled monthly distribution finished for {}: {}", monthParam, result);

            writeAudit("DISTRIBUTION_SCHEDULED_COMPLETED", monthParam,
                    "{\"month\":\"" + monthParam + "\",\"result\":\"" + escapeJson(String.valueOf(result)) + "\"}");
        } catch (Exception e) {
            // A scheduled task must never throw past this point — an
            // uncaught exception here would just vanish into Spring's task
            // executor with nothing but a stack trace in the server log, and
            // no record that a month's payout run silently failed to happen.
            log.error("Scheduled monthly distribution FAILED for {}", monthParam, e);

            writeAudit("DISTRIBUTION_SCHEDULED_FAILED", monthParam,
                    "{\"month\":\"" + monthParam + "\",\"error\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Payout scheduling — 15th of the month
    // ────────────────────────────────────────────────────────────────────────
    //
    // Runs two weeks after runMonthlyDistribution() has closed the previous
    // month's pool and created "Pending" CreatorEarning rows. This method
    // decides, per creator, whether that Pending row is actually ready to be
    // paid or needs to roll into next month:
    //
    // revenuePaise <= ₹500 → folded into NEXT month's row (added to its
    // revenue_paise, rolled_from set), this row is
    // marked "Rolled_Over". Rolled-over amounts
    // accumulate month over month until the combined
    // total exceeds ₹500, at which point that (larger)
    // row gets scheduled normally on its own 15th.
    // revenuePaise > ₹500 → marked "Scheduled" with scheduledFor = now.
    // ScheduledPayoutRunner picks these up and pays
    // them via RazorpayX.
    //
    // 1:00 AM IST on the 15th — two weeks after the 1st-of-month pool build,
    // giving plenty of clearance from that job and any manual re-runs via
    // AdminRevenueController.
    @Scheduled(cron = "0 0 1 15 * *", zone = "Asia/Kolkata")
    public void runPayoutScheduling() {
        LocalDate targetMonth = YearMonth.now().minusMonths(1).atDay(1);
        String monthParam = targetMonth.toString();

        log.info("Scheduled payout scheduling starting for {}", monthParam);

        try {
            Map<String, Object> result = schedulePayoutsForMonth(targetMonth);
            log.info("Scheduled payout scheduling finished for {}: {}", monthParam, result);

            writeAudit("PAYOUT_SCHEDULING_COMPLETED", monthParam,
                    "{\"month\":\"" + monthParam + "\",\"result\":\"" + escapeJson(String.valueOf(result)) + "\"}");
        } catch (Exception e) {
            // Same rule as runMonthlyDistribution(): a scheduled task must never
            // throw past this point, or a silently-failed payout scheduling run
            // leaves creators unpaid with zero record of why.
            log.error("Scheduled payout scheduling FAILED for {}", monthParam, e);

            writeAudit("PAYOUT_SCHEDULING_FAILED", monthParam,
                    "{\"month\":\"" + monthParam + "\",\"error\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    /**
     * For every "Pending" earning in the given month:
     * - if revenuePaise <= ROLLOVER_THRESHOLD_PAISE, fold it into next
     * month's row (creating that row if it doesn't exist yet) and mark
     * this row "Rolled_Over".
     * - otherwise mark it "Scheduled" with scheduledFor = now, ready for
     * ScheduledPayoutRunner to actually pay it out.
     *
     * Safe to call multiple times for the same month — rows that are no
     * longer "Pending" (already Scheduled/Rolled_Over/Paid from a prior run)
     * are simply not matched by findByMonthAndStatus() and are left alone.
     */
    @Transactional
    public Map<String, Object> schedulePayoutsForMonth(LocalDate month) {
        List<CreatorEarning> pendingEarnings = earningRepository.findByMonthAndStatus(month, "Pending");
        LocalDate nextMonth = month.plusMonths(1);
        LocalDateTime scheduledFor = LocalDateTime.now();

        int rolledOver = 0;
        int scheduled = 0;

        for (CreatorEarning earning : pendingEarnings) {
            long amountPaise = earning.getRevenuePaise() != null ? earning.getRevenuePaise() : 0L;

            if (amountPaise <= ROLLOVER_THRESHOLD_PAISE) {
                CreatorEarning nextEarning = earningRepository
                        .findByCreatorIdAndMonth(earning.getCreator().getId(), nextMonth)
                        .orElseGet(() -> CreatorEarning.builder()
                                .creator(earning.getCreator())
                                .month(nextMonth)
                                .status("Pending")
                                .revenuePaise(0L)
                                .build());

                // Safety: only fold into a row that's still open (Pending or a
                // fresh unsaved one). If next month's row is already
                // Scheduled/Processing/Paid for some unexpected reason, don't
                // silently merge money into it — schedule THIS row for payout
                // instead of losing the amount.
                String nextStatus = nextEarning.getStatus();
                boolean nextIsOpen = nextStatus == null || "Pending".equalsIgnoreCase(nextStatus);

                if (nextIsOpen) {
                    long nextAmountPaise = nextEarning.getRevenuePaise() != null ? nextEarning.getRevenuePaise() : 0L;
                    nextEarning.setRevenuePaise(nextAmountPaise + amountPaise);
                    nextEarning.setRolledFrom(month);
                    if (nextEarning.getStatus() == null) {
                        nextEarning.setStatus("Pending");
                    }
                    earningRepository.save(nextEarning);

                    earning.setStatus("Rolled_Over");
                    earningRepository.save(earning);
                    rolledOver++;
                } else {
                    log.warn(
                            "Could not roll {} (creator {}) into {} — target row status is '{}', scheduling directly instead.",
                            month, earning.getCreator().getId(), nextMonth, nextStatus);
                    earning.setStatus("Scheduled");
                    earning.setScheduledFor(scheduledFor);
                    earningRepository.save(earning);
                    scheduled++;
                }
            } else {
                earning.setStatus("Scheduled");
                earning.setScheduledFor(scheduledFor);
                earningRepository.save(earning);
                scheduled++;
            }
        }

        return Map.of(
                "message", "Payout scheduling completed",
                "month", month.toString(),
                "rolledOver", rolledOver,
                "scheduled", scheduled);
    }

    private void writeAudit(String action, String entityId, String metadata) {
        try {
            auditLogRepository.save(AuditLog.builder()
                    .userId(null) // system-originated, no real user attached
                    .action(action)
                    .entityType("revenue_pool")
                    .entityId(entityId)
                    .metadata(metadata)
                    .build());
        } catch (Exception ex) {
            // Audit logging must never break the caller.
            log.warn("Failed to write audit log for {}", action, ex);
        }
    }

    private String escapeJson(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    @Transactional
    public Map<String, Object> distribute(String month) {
        LocalDate targetMonth = parseTargetMonth(month);

        // P0: a month is only "closed" once it has fully elapsed. Distributing
        // the current (or a future) month means calling this mid-month against
        // partial revenue data — and because the check above short-circuits on
        // status="distributed" with no way to re-run, that under-counts every
        // creator for the rest of the month with no fix except a manual DB
        // edit. Reject anything that isn't strictly in the past.
        LocalDate firstDayOfCurrentMonth = LocalDate.now().withDayOfMonth(1);
        if (!targetMonth.isBefore(firstDayOfCurrentMonth)) {
            throw new IllegalStateException(
                    "Cannot distribute " + targetMonth + " — it isn't closed yet. " +
                            "Only months before " + firstDayOfCurrentMonth
                            + " (the current month) can be distributed.");
        }

        LocalDateTime start = targetMonth.atStartOfDay();
        LocalDateTime end = targetMonth.plusMonths(1).atStartOfDay();
        LocalDateTime now = LocalDateTime.now();

        RevenuePool pool = poolRepository.findByMonth(targetMonth).orElse(null);

        if (pool != null && "distributed".equalsIgnoreCase(pool.getStatus())) {
            return Map.of(
                    "message", "Already distributed",
                    "month", targetMonth.toString());
        }

        Long totalRevenuePaise = paymentRepository.sumCapturedAmountBetween(start, end);
        if (totalRevenuePaise == null)
            totalRevenuePaise = 0L;

        // Split total revenue into Reader Premium vs Creator Pro before applying
        // the pool formula — Reader Premium is 50/50, Creator Pro is 25/75, per
        // the "SoCreate Creator Pro Revenue Distribution Proposal". These are
        // NOT the same rate, so summing everything and halving it (the old
        // behaviour) silently threw away the Creator Pro split entirely.
        Long creatorProRevenuePaise = paymentRepository.sumCapturedCreatorProAmountBetween(start, end);
        if (creatorProRevenuePaise == null)
            creatorProRevenuePaise = 0L;
        long readerRevenuePaise = totalRevenuePaise - creatorProRevenuePaise;

        long creatorPoolPaise = creatorService.creatorPoolPaise(readerRevenuePaise, creatorProRevenuePaise);
        long socreateSharePaise = creatorService.socreateSharePaise(readerRevenuePaise, creatorProRevenuePaise);

        if (pool == null) {
            pool = new RevenuePool();
            pool.setMonth(targetMonth);
        }

        pool.setTotalRevenuePaise(totalRevenuePaise);
        pool.setReaderRevenuePaise(readerRevenuePaise);
        pool.setCreatorProRevenuePaise(creatorProRevenuePaise);
        pool.setCreatorPoolPaise(creatorPoolPaise);
        pool.setSocreatSharePaise(socreateSharePaise);
        pool.setStatus("distributed");
        pool.setLockedAt(now);
        pool.setDistributedAt(now);

        pool = poolRepository.save(pool);

        List<CreatorMonthlyMetrics> metricsList = metricsRepository.findEligibleMetrics(targetMonth, now);

        BigDecimal totalRawScore = metricsList.stream()
                .map(CreatorMonthlyMetrics::getRawScore)
                .filter(score -> score != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int earningsCreated = 0;

        if (totalRawScore.compareTo(BigDecimal.ZERO) > 0 && creatorPoolPaise > 0) {
            for (CreatorMonthlyMetrics metrics : metricsList) {
                BigDecimal rawScore = metrics.getRawScore() == null
                        ? BigDecimal.ZERO
                        : metrics.getRawScore();

                BigDecimal sharePercent = rawScore
                        .multiply(BigDecimal.valueOf(100))
                        .divide(totalRawScore, 2, RoundingMode.HALF_UP);

                long revenuePaise = sharePercent
                        .multiply(BigDecimal.valueOf(creatorPoolPaise))
                        .divide(BigDecimal.valueOf(100), 0, RoundingMode.DOWN)
                        .longValue();

                CreatorEarning earning = earningRepository
                        .findByCreatorIdAndMonth(metrics.getCreator().getId(), targetMonth)
                        .orElseGet(CreatorEarning::new);

                earning.setCreator(metrics.getCreator());
                earning.setMonth(targetMonth);
                earning.setPool(pool);
                earning.setScorePercent(sharePercent);
                earning.setRevenuePaise(revenuePaise);
                earning.setStatus("Pending");

                earningRepository.save(earning);
                earningsCreated++;
            }
        }

        return Map.of(
                "message", "Distribution completed",
                "month", targetMonth.toString(),
                "totalRevenuePaise", totalRevenuePaise,
                "readerRevenuePaise", readerRevenuePaise,
                "creatorProRevenuePaise", creatorProRevenuePaise,
                "creatorPoolPaise", creatorPoolPaise,
                "socreateSharePaise", socreateSharePaise,
                "earningsCreated", earningsCreated);
    }

    // Accepts either a bare month ("2026-07" — what an admin UI naturally
    // sends when asking "distribute July 2026") or a full ISO date
    // ("2026-07-01"), and normalizes both to the first day of that month.
    // Anything else fails fast with a clear 400 instead of a raw
    // DateTimeParseException stack trace.
    private static LocalDate parseTargetMonth(String month) {
        try {
            return java.time.YearMonth.parse(month).atDay(1);
        } catch (java.time.format.DateTimeParseException ex) {
            try {
                return LocalDate.parse(month).withDayOfMonth(1);
            } catch (java.time.format.DateTimeParseException ex2) {
                throw new IllegalArgumentException(
                        "Invalid month '" + month + "'. Expected 'yyyy-MM' (e.g. 2026-07) or 'yyyy-MM-dd'.");
            }
        }
    }
}

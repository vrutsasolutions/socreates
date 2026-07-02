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

    private final RevenuePoolRepository poolRepository;
    private final MembershipPaymentRepository paymentRepository;
    private final CreatorMonthlyMetricsRepository metricsRepository;
    private final CreatorEarningRepository earningRepository;
    private final CreatorService creatorService;
    private final AuditLogRepository auditLogRepository;

    // ────────────────────────────────────────────────────────────────────────
    //  P1 item 6b — automatic monthly run
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
                    "Only months before " + firstDayOfCurrentMonth + " (the current month) can be distributed.");
        }

        LocalDateTime start = targetMonth.atStartOfDay();
        LocalDateTime end = targetMonth.plusMonths(1).atStartOfDay();
        LocalDateTime now = LocalDateTime.now();

        RevenuePool pool = poolRepository.findByMonth(targetMonth).orElse(null);

        if (pool != null && "distributed".equalsIgnoreCase(pool.getStatus())) {
            return Map.of(
                    "message", "Already distributed",
                    "month", targetMonth.toString()
            );
        }

        Long totalRevenuePaise = paymentRepository.sumCapturedAmountBetween(start, end);
        if (totalRevenuePaise == null) totalRevenuePaise = 0L;

        // Split total revenue into Reader Premium vs Creator Pro before applying
        // the pool formula — Reader Premium is 50/50, Creator Pro is 25/75, per
        // the "SoCreate Creator Pro Revenue Distribution Proposal". These are
        // NOT the same rate, so summing everything and halving it (the old
        // behaviour) silently threw away the Creator Pro split entirely.
        Long creatorProRevenuePaise = paymentRepository.sumCapturedCreatorProAmountBetween(start, end);
        if (creatorProRevenuePaise == null) creatorProRevenuePaise = 0L;
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

        List<CreatorMonthlyMetrics> metricsList =
                metricsRepository.findEligibleMetrics(targetMonth, now);

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
                "earningsCreated", earningsCreated
        );
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

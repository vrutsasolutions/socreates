package com.ideaspark.service;

import com.ideaspark.model.CreatorEarning;
import com.ideaspark.model.CreatorMonthlyMetrics;
import com.ideaspark.model.RevenuePool;
import com.ideaspark.repository.CreatorEarningRepository;
import com.ideaspark.repository.CreatorMonthlyMetricsRepository;
import com.ideaspark.repository.MembershipPaymentRepository;
import com.ideaspark.repository.RevenuePoolRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RevenueDistributionService {

    private final RevenuePoolRepository poolRepository;
    private final MembershipPaymentRepository paymentRepository;
    private final CreatorMonthlyMetricsRepository metricsRepository;
    private final CreatorEarningRepository earningRepository;

    @Transactional
    public Map<String, Object> distribute(String month) {
        LocalDate targetMonth = LocalDate.parse(month).withDayOfMonth(1);
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

        long creatorPoolPaise = totalRevenuePaise / 2;
        long socreateSharePaise = totalRevenuePaise - creatorPoolPaise;

        if (pool == null) {
            pool = new RevenuePool();
            pool.setMonth(targetMonth);
        }

        pool.setTotalRevenuePaise(totalRevenuePaise);
        pool.setReaderRevenuePaise(totalRevenuePaise);
        pool.setCreatorProRevenuePaise(0L);
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
                "creatorPoolPaise", creatorPoolPaise,
                "socreateSharePaise", socreateSharePaise,
                "earningsCreated", earningsCreated
        );
    }
}
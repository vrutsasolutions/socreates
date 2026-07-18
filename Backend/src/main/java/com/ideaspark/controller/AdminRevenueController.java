package com.ideaspark.controller;

import com.ideaspark.model.CreatorEarning;
import com.ideaspark.model.PayoutAccount;
import com.ideaspark.repository.CreatorEarningRepository;
import com.ideaspark.service.RevenueDistributionService;
import com.ideaspark.service.ScheduledPayoutRunner;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/pools")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminRevenueController {

    private final RevenueDistributionService revenueDistributionService;
    private final CreatorEarningRepository earningRepository;
    private final ScheduledPayoutRunner scheduledPayoutRunner;

    /**
     * Runs monthly revenue distribution.
     *
     * Example:
     * POST /api/admin/pools/2026-07/distribute
     */
    @PostMapping("/{month}/distribute")
    public ResponseEntity<?> distribute(
            @PathVariable String month
    ) {
        return ResponseEntity.ok(
                revenueDistributionService.distribute(month)
        );
    }

    /**
     * Returns creator earnings whose payouts permanently failed.
     *
     * GET /api/admin/pools/payouts/failed
     */
    @GetMapping("/payouts/failed")
    public ResponseEntity<List<Map<String, Object>>> getFailedPayouts() {
        List<Map<String, Object>> response = earningRepository
                .findByStatus("Failed")
                .stream()
                .map(this::toPayoutResponse)
                .toList();

        return ResponseEntity.ok(response);
    }

    /**
     * Returns creator earnings blocked because payout setup is missing.
     *
     * GET /api/admin/pools/payouts/setup-missing
     */
    @GetMapping("/payouts/setup-missing")
    public ResponseEntity<List<Map<String, Object>>> getSetupMissingPayouts() {
        List<Map<String, Object>> response = earningRepository
                .findByStatus("Setup_Missing")
                .stream()
                .map(this::toPayoutResponse)
                .toList();

        return ResponseEntity.ok(response);
    }

    /**
     * Returns all currently scheduled payouts.
     *
     * GET /api/admin/pools/payouts/scheduled
     */
    @GetMapping("/payouts/scheduled")
    public ResponseEntity<List<Map<String, Object>>> getScheduledPayouts() {
        List<Map<String, Object>> response = earningRepository
                .findByStatus("Scheduled")
                .stream()
                .map(this::toPayoutResponse)
                .toList();

        return ResponseEntity.ok(response);
    }

    /**
     * Returns payouts currently waiting for retry.
     *
     * GET /api/admin/pools/payouts/processing
     */
    @GetMapping("/payouts/processing")
    public ResponseEntity<List<Map<String, Object>>> getProcessingPayouts() {
        List<Map<String, Object>> response = earningRepository
                .findByStatus("Processing")
                .stream()
                .map(this::toPayoutResponse)
                .toList();

        return ResponseEntity.ok(response);
    }

    /**
     * Manually reschedules a failed or setup-missing payout.
     *
     * The creator must now have an active Razorpay fund account.
     *
     * POST /api/admin/pools/payouts/{earningId}/reschedule
     */
    @Transactional
    @PostMapping("/payouts/{earningId}/reschedule")
    public ResponseEntity<?> reschedulePayout(
            @PathVariable UUID earningId
    ) {
        CreatorEarning earning = earningRepository
                .findById(earningId)
                .orElse(null);

        if (earning == null) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "message",
                            "Creator earning not found"
                    ));
        }

        String currentStatus = earning.getStatus();

        boolean canReschedule =
                "Failed".equalsIgnoreCase(currentStatus)
                        || "Setup_Missing".equalsIgnoreCase(currentStatus);

        if (!canReschedule) {
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            "Only Failed or Setup_Missing payouts can be rescheduled",
                            "currentStatus",
                            currentStatus != null
                                    ? currentStatus
                                    : "Unknown"
                    ));
        }

        PayoutAccount payoutAccount = resolvePayoutAccount(earning);

        if (!isValidPayoutAccount(payoutAccount)) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                            "message",
                            "The creator does not have an active payout account",
                            "status",
                            "Setup_Missing"
                    ));
        }

        if (earning.getRevenuePaise() == null
                || earning.getRevenuePaise() <= 0) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                            "message",
                            "The earning amount must be greater than zero"
                    ));
        }

        earning.setPayoutAccount(payoutAccount);
        earning.setStatus("Scheduled");
        earning.setScheduledFor(LocalDateTime.now());
        earning.setFailureReason(null);
        earning.setRetryCount(0);
        earning.setNextRetryAt(null);
        earning.setPaidAt(null);

        /*
         * A failed Razorpay payout ID must not prevent the scheduler from
         * creating the rescheduled payout.
         */
        earning.setRazorpayPayoutId(null);

        CreatorEarning saved = earningRepository.save(earning);

        return ResponseEntity.ok(Map.of(
                "message",
                "Payout rescheduled successfully",
                "earningId",
                saved.getId(),
                "status",
                saved.getStatus(),
                "scheduledFor",
                saved.getScheduledFor().toString()
        ));
    }

    /**
     * Manually runs the same payout job normally executed by the cron.
     *
     * POST /api/admin/pools/payouts/run
     */
    @PostMapping("/payouts/run")
    public ResponseEntity<?> runScheduledPayouts() {
        scheduledPayoutRunner.processScheduledPayouts();

        return ResponseEntity.ok(Map.of(
                "message",
                "Scheduled payout processing completed"
        ));
    }

    /**
     * Provides a payout summary for the admin dashboard.
     *
     * GET /api/admin/pools/payouts/summary
     */
    @GetMapping("/payouts/summary")
    public ResponseEntity<Map<String, Object>> getPayoutSummary() {
        long scheduled =
                earningRepository.findByStatus("Scheduled").size();

        long processing =
                earningRepository.findByStatus("Processing").size();

        long paid =
                earningRepository.findByStatus("Paid").size();

        long failed =
                earningRepository.findByStatus("Failed").size();

        long setupMissing =
                earningRepository.findByStatus("Setup_Missing").size();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("scheduled", scheduled);
        response.put("processing", processing);
        response.put("paid", paid);
        response.put("failed", failed);
        response.put("setupMissing", setupMissing);

        return ResponseEntity.ok(response);
    }

    private PayoutAccount resolvePayoutAccount(
            CreatorEarning earning
    ) {
        if (earning.getPayoutAccount() != null
                && Boolean.TRUE.equals(
                        earning.getPayoutAccount().getIsActive()
                )) {

            return earning.getPayoutAccount();
        }

        if (earning.getCreator() == null) {
            return null;
        }

        return earning
                .getCreator()
                .getActivePayoutAccount();
    }

    private boolean isValidPayoutAccount(
            PayoutAccount payoutAccount
    ) {
        return payoutAccount != null
                && Boolean.TRUE.equals(payoutAccount.getIsActive())
                && payoutAccount.getRazorpayFundAccountId() != null
                && !payoutAccount
                        .getRazorpayFundAccountId()
                        .isBlank();
    }

    /**
     * Converts an entity into an admin-safe response.
     *
     * This avoids directly serializing lazy JPA relationships and prevents
     * sensitive bank details from being exposed.
     */
    private Map<String, Object> toPayoutResponse(
            CreatorEarning earning
    ) {
        Map<String, Object> response = new LinkedHashMap<>();

        response.put("earningId", earning.getId());

        response.put(
                "creatorId",
                earning.getCreator() != null
                        ? earning.getCreator().getId()
                        : null
        );

        response.put(
                "creatorName",
                earning.getCreator() != null
                        ? earning.getCreator().getName()
                        : null
        );

        response.put(
                "creatorEmail",
                earning.getCreator() != null
                        ? earning.getCreator().getEmail()
                        : null
        );

        response.put("month", earning.getMonth());
        response.put("revenuePaise", earning.getRevenuePaise());

        response.put(
                "revenueRupees",
                earning.getRevenuePaise() != null
                        ? earning.getRevenuePaise() / 100.0
                        : 0
        );

        response.put("status", earning.getStatus());
        response.put("scheduledFor", earning.getScheduledFor());
        response.put("paidAt", earning.getPaidAt());
        response.put("retryCount", earning.getRetryCount());
        response.put("nextRetryAt", earning.getNextRetryAt());
        response.put("failureReason", earning.getFailureReason());

        response.put(
                "razorpayPayoutId",
                earning.getRazorpayPayoutId()
        );

        PayoutAccount payoutAccount =
                resolvePayoutAccount(earning);

        response.put(
                "payoutAccountConfigured",
                isValidPayoutAccount(payoutAccount)
        );

        response.put(
                "payoutMethod",
                payoutAccount != null
                        ? payoutAccount.getPayoutMethod()
                        : null
        );

        response.put(
                "destination",
                maskDestination(payoutAccount)
        );

        return response;
    }

    private String maskDestination(
            PayoutAccount account
    ) {
        if (account == null) {
            return null;
        }

        String lastFour =
                account.getPayoutAccountNumberLast4();

        if (lastFour == null || lastFour.isBlank()) {
            return "Bank account";
        }

        if (lastFour.length() > 4) {
            lastFour = lastFour.substring(
                    lastFour.length() - 4
            );
        }

        String bank =
                account.getBankName() != null
                        && !account.getBankName().isBlank()
                        ? account.getBankName()
                        : "Bank";

        return bank + " ****" + lastFour;
    }
}

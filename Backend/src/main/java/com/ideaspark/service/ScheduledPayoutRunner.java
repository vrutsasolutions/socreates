package com.ideaspark.service;

import com.ideaspark.model.CreatorEarning;
import com.ideaspark.model.PayoutAccount;
import com.ideaspark.model.User;
import com.ideaspark.repository.CreatorEarningRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScheduledPayoutRunner {

    private static final int MAX_RETRY_COUNT = 3;

    private final CreatorEarningRepository earningRepository;
    private final RazorpayXService razorpayXService;
    private final EmailService emailService;

    /**
     * Runs daily at 2:00 AM India time.
     */
    @Scheduled(
            cron = "${payout.scheduler.cron:0 0 2 * * *}",
            zone = "${payout.scheduler.zone:Asia/Kolkata}"
    )
    @Transactional
    public void processScheduledPayouts() {
        log.info("Starting scheduled creator payout processing");

        if (!razorpayXService.isConfigured()) {
            log.error(
                    "Scheduled payouts skipped because RazorpayX is not configured"
            );
            return;
        }

        LocalDateTime now =
                LocalDateTime.now();

        List<CreatorEarning> scheduled =
                earningRepository.findScheduledPayouts(now);

        List<CreatorEarning> retries =
                earningRepository.findDueForRetry(now);

        Map<UUID, CreatorEarning> dueEarnings =
                new LinkedHashMap<>();

        scheduled.forEach(
                earning ->
                        dueEarnings.put(
                                earning.getId(),
                                earning
                        )
        );

        retries.forEach(
                earning ->
                        dueEarnings.put(
                                earning.getId(),
                                earning
                        )
        );

        if (dueEarnings.isEmpty()) {
            log.info("No creator payouts are currently due");
            return;
        }

        int paid = 0;
        int waiting = 0;
        int retrying = 0;
        int failed = 0;
        int setupMissing = 0;
        int skipped = 0;

        for (CreatorEarning earning : dueEarnings.values()) {
            try {
                ProcessingResult result =
                        processOneEarning(earning);

                switch (result) {
                    case PAID -> paid++;
                    case WAITING_FOR_PROVIDER -> waiting++;
                    case RETRY_SCHEDULED -> retrying++;
                    case FAILED -> failed++;
                    case SETUP_MISSING -> setupMissing++;
                    case SKIPPED -> skipped++;
                }

            } catch (Exception exception) {
                log.error(
                        "Unexpected payout error for earning {}",
                        earning.getId(),
                        exception
                );

                CreatorEarning current =
                        earningRepository
                                .findById(earning.getId())
                                .orElse(earning);

                registerFailure(
                        current,
                        safeFailureMessage(exception)
                );

                if (hasReachedRetryLimit(current)) {
                    sendPermanentFailureEmail(current);
                    failed++;
                } else {
                    retrying++;
                }
            }
        }

        log.info(
                "Scheduled payout processing completed. " +
                        "paid={}, waiting={}, retrying={}, failed={}, " +
                        "setupMissing={}, skipped={}",
                paid,
                waiting,
                retrying,
                failed,
                setupMissing,
                skipped
        );
    }

    private ProcessingResult processOneEarning(
            CreatorEarning originalEarning
    ) {
        UUID earningId =
                originalEarning.getId();

        if ("Scheduled".equalsIgnoreCase(
                originalEarning.getStatus()
        )) {
            int claimed =
                    earningRepository
                            .claimScheduledForPayout(earningId);

            if (claimed == 0) {
                log.info(
                        "Earning {} was already claimed by another runner",
                        earningId
                );

                return ProcessingResult.SKIPPED;
            }

        } else if (!"Processing".equalsIgnoreCase(
                originalEarning.getStatus()
        )) {
            log.warn(
                    "Skipping earning {} because status is {}",
                    earningId,
                    originalEarning.getStatus()
            );

            return ProcessingResult.SKIPPED;
        }

        CreatorEarning earning =
                earningRepository
                        .findById(earningId)
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Creator earning disappeared after claim: "
                                                + earningId
                                )
                        );

        PayoutAccount payoutAccount =
                resolvePayoutAccount(earning);

        if (!isValidPayoutAccount(payoutAccount)) {
            markSetupMissing(
                    earning,
                    "No active RazorpayX payout account is configured"
            );

            return ProcessingResult.SETUP_MISSING;
        }

        long revenuePaise =
                earning.getRevenuePaise() != null
                        ? earning.getRevenuePaise()
                        : 0L;

        if (revenuePaise <= 0) {
            markFailedWithoutRetry(
                    earning,
                    "Payout amount must be greater than zero"
            );

            sendPermanentFailureEmail(earning);

            return ProcessingResult.FAILED;
        }

        try {
            JSONObject payout;

            /*
             * Once Razorpay has created a payout, only fetch its latest state.
             * Do not create another payout for the same earning.
             */
            if (notBlank(earning.getRazorpayPayoutId())) {
                payout = razorpayXService.getPayout(
                        earning.getRazorpayPayoutId()
                );

                log.info(
                        "Fetched payout {} for earning {}",
                        earning.getRazorpayPayoutId(),
                        earning.getId()
                );

            } else {
                String payoutMode =
                        determinePayoutMode(payoutAccount);

                String referenceId =
                        buildReferenceId(earning);

                payout = razorpayXService.createPayout(
                        payoutAccount.getRazorpayFundAccountId(),
                        revenuePaise,
                        payoutMode,
                        referenceId
                );

                String payoutId =
                        payout.optString("id", null);

                if (notBlank(payoutId)) {
                    earning.setRazorpayPayoutId(payoutId);
                    earningRepository.save(earning);
                }

                log.info(
                        "Created Razorpay payout {} for earning {}",
                        payoutId,
                        earning.getId()
                );
            }

            return handleRazorpayResponse(
                    earning,
                    payout
            );

        } catch (Exception exception) {
            String reason =
                    safeFailureMessage(exception);

            log.error(
                    "RazorpayX payout operation failed for earning {}: {}",
                    earning.getId(),
                    reason
            );

            registerFailure(
                    earning,
                    reason
            );

            if (hasReachedRetryLimit(earning)) {
                sendPermanentFailureEmail(earning);
                return ProcessingResult.FAILED;
            }

            return ProcessingResult.RETRY_SCHEDULED;
        }
    }

    private ProcessingResult handleRazorpayResponse(
            CreatorEarning earning,
            JSONObject payout
    ) {
        String payoutId =
                payout.optString("id", null);

        if (notBlank(payoutId)) {
            earning.setRazorpayPayoutId(payoutId);
        }

        String providerStatus =
                payout.optString(
                                "status",
                                "processing"
                        )
                        .trim()
                        .toLowerCase(Locale.ROOT);

        switch (providerStatus) {
            case "processed" -> {
                markPaid(earning);
                sendSuccessEmail(earning);

                log.info(
                        "Creator payout completed for earning {}. " +
                                "Razorpay payout ID={}",
                        earning.getId(),
                        earning.getRazorpayPayoutId()
                );

                return ProcessingResult.PAID;
            }

            case "failed",
                 "rejected",
                 "cancelled",
                 "reversed" -> {

                String reason =
                        extractRazorpayFailureReason(
                                payout,
                                providerStatus
                        );

                registerFailure(
                        earning,
                        reason
                );

                if (hasReachedRetryLimit(earning)) {
                    sendPermanentFailureEmail(earning);
                    return ProcessingResult.FAILED;
                }

                return ProcessingResult.RETRY_SCHEDULED;
            }

            case "processing",
                 "queued",
                 "pending",
                 "initiated" -> {

                /*
                 * Provider-side processing is not an application failure.
                 * Do not increase retryCount. Poll the stored payout ID later.
                 */
                earning.setStatus("Processing");
                earning.setFailureReason(
                        "RazorpayX payout status: "
                                + providerStatus
                );
                earning.setNextRetryAt(
                        LocalDateTime.now().plusHours(1)
                );

                earningRepository.save(earning);

                log.info(
                        "Payout {} for earning {} is currently {}",
                        earning.getRazorpayPayoutId(),
                        earning.getId(),
                        providerStatus
                );

                return ProcessingResult.WAITING_FOR_PROVIDER;
            }

            default -> {
                earning.setStatus("Processing");
                earning.setFailureReason(
                        "Unknown RazorpayX payout status: "
                                + providerStatus
                );
                earning.setNextRetryAt(
                        LocalDateTime.now().plusHours(1)
                );

                earningRepository.save(earning);

                log.warn(
                        "Unknown payout status {} for earning {}",
                        providerStatus,
                        earning.getId()
                );

                return ProcessingResult.WAITING_FOR_PROVIDER;
            }
        }
    }

    private PayoutAccount resolvePayoutAccount(
            CreatorEarning earning
    ) {
        PayoutAccount lockedAccount =
                earning.getPayoutAccount();

        if (isValidPayoutAccount(lockedAccount)) {
            return lockedAccount;
        }

        /*
         * The account this earning was locked to is gone (e.g. the creator
         * updated their bank/UPI details, which deactivates the old
         * PayoutAccount). Previously this method silently reassigned the
         * earning to whichever account is CURRENTLY active and kept going —
         * which meant a mid-retry attempt could send a different
         * fund_account_id under the same fixed idempotency key as an
         * earlier attempt, triggering Razorpay's
         * "Different request body sent for the same Idempotency Header"
         * error.
         *
         * Instead, treat this the same as "no account configured": return
         * null so the caller marks the earning Setup_Missing. When the
         * creator's payout details are next saved,
         * CreatorPayoutService.reactivateSetupMissingEarnings() will pick
         * this earning back up with retryCount/razorpayPayoutId reset to a
         * clean state, and buildReferenceId() will mint a fresh
         * attempt-scoped idempotency key for it.
         */
        return null;
    }

    private boolean isValidPayoutAccount(
            PayoutAccount account
    ) {
        return account != null
                && Boolean.TRUE.equals(account.getIsActive())
                && notBlank(
                        account.getRazorpayFundAccountId()
                );
    }

    private String determinePayoutMode(
            PayoutAccount account
    ) {
        String method =
                account.getPayoutMethod();

        if (method == null) {
            return "IMPS";
        }

        String normalized =
                method.trim().toUpperCase(Locale.ROOT);

        return switch (normalized) {
            case "VPA", "UPI" -> "UPI";
            default -> "IMPS";
        };
    }

    private String buildReferenceId(
            CreatorEarning earning
    ) {
        /*
         * IMPORTANT: this value is also used as the Razorpay idempotency key
         * (see RazorpayXService.createPayout -> post(..., stableReference)).
         * Razorpay requires that the SAME idempotency key always be paired
         * with the SAME request body. If anything in the body can change
         * between attempts (e.g. the fund_account_id, if the creator swaps
         * bank accounts between retries), reusing a single fixed key across
         * every attempt causes Razorpay to reject the retry with
         * "Different request body sent for the same Idempotency Header".
         *
         * To keep retries safe without hard-coding a single lifetime key,
         * the attempt number is folded into the reference ID. Each attempt
         * gets its own idempotency key, so a genuinely-changed body (e.g.
         * new bank account) is treated as a new attempt rather than a
         * conflicting duplicate. A single attempt is still protected against
         * accidental double-submission (e.g. a network retry of the exact
         * same HTTP call), since the key stays fixed within one attempt.
         *
         * UUID without dashes = 32 chars, "-r" + attempt number keeps the
         * total within Razorpay's 4-36 character limit.
         */
        String base =
                earning.getId().toString().replace("-", "");

        int attempt =
                safeRetryCount(earning) + 1;

        return base + "-r" + attempt;
    }

    private void markPaid(
            CreatorEarning earning
    ) {
        earning.setStatus("Paid");
        earning.setPaidAt(LocalDateTime.now());
        earning.setFailureReason(null);
        earning.setNextRetryAt(null);

        earningRepository.save(earning);
    }

    private void markSetupMissing(
            CreatorEarning earning,
            String reason
    ) {
        earning.setStatus("Setup_Missing");
        earning.setFailureReason(reason);
        earning.setNextRetryAt(null);

        earningRepository.save(earning);

        log.warn(
                "Payout setup missing for earning {}",
                earning.getId()
        );
    }

    private void markFailedWithoutRetry(
            CreatorEarning earning,
            String reason
    ) {
        earning.setStatus("Failed");
        earning.setFailureReason(reason);
        earning.setNextRetryAt(null);

        earningRepository.save(earning);

        log.error(
                "Earning {} permanently failed: {}",
                earning.getId(),
                reason
        );
    }

    private void registerFailure(
            CreatorEarning earning,
            String reason
    ) {
        int nextRetryCount =
                safeRetryCount(earning) + 1;

        earning.setRetryCount(nextRetryCount);
        earning.setFailureReason(reason);

        if (nextRetryCount >= MAX_RETRY_COUNT) {
            earning.setStatus("Failed");
            earning.setNextRetryAt(null);

            log.error(
                    "Earning {} permanently failed after {} attempts: {}",
                    earning.getId(),
                    nextRetryCount,
                    reason
            );

        } else {
            earning.setStatus("Processing");
            earning.setNextRetryAt(
                    calculateNextRetryTime(nextRetryCount)
            );

            log.warn(
                    "Retry {} scheduled for earning {} at {}",
                    nextRetryCount,
                    earning.getId(),
                    earning.getNextRetryAt()
            );
        }

        earningRepository.save(earning);
    }

    private LocalDateTime calculateNextRetryTime(
            int retryCount
    ) {
        LocalDateTime now =
                LocalDateTime.now();

        return switch (retryCount) {
            case 1 -> now.plusHours(1);
            case 2 -> now.plusHours(6);
            default -> now.plusHours(24);
        };
    }

    private boolean hasReachedRetryLimit(
            CreatorEarning earning
    ) {
        return safeRetryCount(earning)
                >= MAX_RETRY_COUNT;
    }

    private int safeRetryCount(
            CreatorEarning earning
    ) {
        return earning.getRetryCount() != null
                ? earning.getRetryCount()
                : 0;
    }

    private String extractRazorpayFailureReason(
            JSONObject payout,
            String status
    ) {
        String description =
                payout.optString(
                        "failure_reason",
                        null
                );

        if (!notBlank(description)) {
            Object statusDetails =
                    payout.opt("status_details");

            if (statusDetails instanceof JSONObject json) {
                description = json.optString(
                        "description",
                        null
                );

                if (!notBlank(description)) {
                    description = json.optString(
                            "reason",
                            null
                    );
                }
            } else if (statusDetails != null) {
                description =
                        statusDetails.toString();
            }
        }

        if (!notBlank(description)) {
            description =
                    "RazorpayX payout status: "
                            + status;
        }

        return description;
    }

    private String safeFailureMessage(
            Exception exception
    ) {
        if (exception == null) {
            return "Unknown payout-processing error";
        }

        String message =
                exception.getMessage();

        if (!notBlank(message)) {
            return exception
                    .getClass()
                    .getSimpleName();
        }

        return message.length() > 1000
                ? message.substring(0, 1000)
                : message;
    }

    private void sendSuccessEmail(
            CreatorEarning earning
    ) {
        User creator =
                earning.getCreator();

        if (creator == null
                || !notBlank(creator.getEmail())) {
            return;
        }

        emailService.sendPayoutSuccessfulEmail(
                creator.getEmail(),
                notBlank(creator.getName())
                        ? creator.getName()
                        : "Creator",
                earning.getMonth().toString(),
                toRupees(earning.getRevenuePaise())
        );
    }

    private void sendPermanentFailureEmail(
            CreatorEarning earning
    ) {
        User creator =
                earning.getCreator();

        if (creator == null) {
            return;
        }

        String creatorName =
                notBlank(creator.getName())
                        ? creator.getName()
                        : "Creator";

        if (notBlank(creator.getEmail())) {
            emailService.sendPayoutFailedEmail(
                    creator.getEmail(),
                    creatorName,
                    earning.getMonth().toString(),
                    toRupees(earning.getRevenuePaise()),
                    earning.getFailureReason()
            );
        }

        // Admin alert is sent regardless of whether the creator has a
        // usable email on file — the admin still needs to know a payout
        // permanently failed so it can be followed up on.
        emailService.sendPayoutFailedAlertToAdmin(
                creatorName,
                notBlank(creator.getEmail())
                        ? creator.getEmail()
                        : "(no email on file)",
                earning.getMonth().toString(),
                toRupees(earning.getRevenuePaise()),
                earning.getFailureReason()
        );
    }

    private long toRupees(
            Long amountPaise
    ) {
        return amountPaise != null
                ? amountPaise / 100
                : 0;
    }

    private static boolean notBlank(
            String value
    ) {
        return value != null
                && !value.isBlank();
    }

    private enum ProcessingResult {
        PAID,
        WAITING_FOR_PROVIDER,
        RETRY_SCHEDULED,
        FAILED,
        SETUP_MISSING,
        SKIPPED
    }
}
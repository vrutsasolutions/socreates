package com.ideaspark.service;

import com.ideaspark.model.PayoutAccount;
import com.ideaspark.model.User;
import com.ideaspark.repository.PayoutAccountRepository;
import com.ideaspark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Monthly payout-details reminder, lock, and unlock scheduler.
 *
 * Timeline (every month):
 *   10th  10:00 AM IST — Early reminder email to unconfigured creators
 *   13th  10:00 AM IST — Final/urgent reminder ("fill by 8 PM today")
 *   13th   8:00 PM IST — Lock all active payout accounts (edits rejected)
 *   15th   1:00 AM IST — Payout scheduling runs (existing job)
 *   20th  12:00 AM IST — Unlock all payout accounts (edits allowed again)
 *
 * "Not configured" means:
 *   - No active payout account at all, OR
 *   - Active account but method is not bank_account, OR
 *   - Active bank_account but missing required fields
 *     (legalName, panNumber, mobileNumber, bankName,
 *      accountHolderName, accountNumber/last4, ifscCode)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PayoutSetupReminderJob {

    private final UserRepository userRepository;
    private final PayoutAccountRepository payoutAccountRepository;
    private final EmailService emailService;

    // ── 10th of month, 10:00 AM IST — Early reminder ──────────────────

    @Scheduled(
            cron = "0 0 10 10 * *",
            zone = "Asia/Kolkata"
    )
    public void sendEarlyReminder() {
        log.info("Starting early payout-setup reminder (10th)");
        sendReminders(false);
    }

    // ── 13th of month, 10:00 AM IST — Final/urgent reminder ──────────

    @Scheduled(
            cron = "0 0 10 13 * *",
            zone = "Asia/Kolkata"
    )
    public void sendFinalReminder() {
        log.info("Starting final payout-setup reminder (13th)");
        sendReminders(true);
    }

    // ── 13th of month, 10:10 AM IST — Lock payout details ────────────
    // Change back to "0 0 20 13 * *" (8:00 PM) after testing

    @Scheduled(
            cron = "0 0 20 13 * *",
            zone = "Asia/Kolkata"
    )
    @Transactional
    public void lockPayoutDetails() {
        log.info("Locking all active payout accounts");

        List<PayoutAccount> activeAccounts =
                payoutAccountRepository.findAllByIsActiveTrue();

        int locked = 0;

        for (PayoutAccount account : activeAccounts) {
            if (!Boolean.TRUE.equals(account.getPayoutLocked())) {
                account.setPayoutLocked(true);
                payoutAccountRepository.save(account);
                locked++;
            }
        }

        log.info(
                "Payout lock completed. locked={}, already_locked={}",
                locked,
                activeAccounts.size() - locked
        );
    }

    // ── 20th of month, 12:00 AM IST — Unlock payout details ──────────

    @Scheduled(
            cron = "0 0 0 20 * *",
            zone = "Asia/Kolkata"
    )
    @Transactional
    public void unlockPayoutDetails() {
        log.info("Unlocking all payout accounts");

        List<PayoutAccount> activeAccounts =
                payoutAccountRepository.findAllByIsActiveTrue();

        int unlocked = 0;

        for (PayoutAccount account : activeAccounts) {
            if (Boolean.TRUE.equals(account.getPayoutLocked())) {
                account.setPayoutLocked(false);
                payoutAccountRepository.save(account);
                unlocked++;
            }
        }

        log.info(
                "Payout unlock completed. unlocked={}, already_unlocked={}",
                unlocked,
                activeAccounts.size() - unlocked
        );
    }

    // ── Shared reminder logic ─────────────────────────────────────────

    private void sendReminders(boolean isFinalReminder) {
        List<User> verifiedCreators =
                userRepository.findByIsVerifiedTrue();

        if (verifiedCreators.isEmpty()) {
            log.info("No verified creators found — nothing to do");
            return;
        }

        int sent = 0;
        int skipped = 0;

        for (User creator : verifiedCreators) {
            Optional<PayoutAccount> activePayout =
                    payoutAccountRepository
                            .findByUserAndIsActiveTrue(creator);

            if (activePayout.isPresent()
                    && isFullyConfigured(activePayout.get())) {
                skipped++;
                continue;
            }

            if (creator.getEmail() == null
                    || creator.getEmail().isBlank()) {
                log.warn(
                        "Skipping reminder for creator {} — no email",
                        creator.getId()
                );
                skipped++;
                continue;
            }

            try {
                String name = creator.getName() != null
                        && !creator.getName().isBlank()
                        ? creator.getName()
                        : "Creator";

                if (isFinalReminder) {
                    emailService.sendPayoutSetupFinalReminderEmail(
                            creator.getEmail(),
                            name
                    );
                } else {
                    emailService.sendPayoutSetupReminderEmail(
                            creator.getEmail(),
                            name
                    );
                }

                sent++;
            } catch (Exception e) {
                log.error(
                        "Failed to send payout-setup reminder to {}",
                        creator.getEmail(),
                        e
                );
            }
        }

        log.info(
                "Payout-setup reminder job completed (final={}). "
                        + "sent={}, skipped={}",
                isFinalReminder,
                sent,
                skipped
        );
    }

    /**
     * Same validation as AdminPayoutController — a payout account
     * is fully configured only when method is bank_account and all
     * required KYC + bank fields are filled.
     */
    private static boolean isFullyConfigured(PayoutAccount account) {
        if (!"bank_account".equalsIgnoreCase(
                account.getPayoutMethod())) {
            return false;
        }

        return notBlank(account.getLegalName())
                && notBlank(account.getPanNumber())
                && notBlank(account.getMobileNumber())
                && notBlank(account.getBankName())
                && notBlank(account.getPayoutAccountName())
                && notBlank(account.getPayoutIfsc())
                && (notBlank(account.getPayoutAccountNumber())
                    || notBlank(
                        account.getPayoutAccountNumberLast4()
                    ));
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}

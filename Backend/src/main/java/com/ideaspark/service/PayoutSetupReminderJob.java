package com.ideaspark.service;

import com.ideaspark.model.PayoutAccount;
import com.ideaspark.model.User;
import com.ideaspark.repository.PayoutAccountRepository;
import com.ideaspark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Monthly reminder for verified creators who haven't fully set up
 * their payout details (bank account + KYC).
 *
 * "Not configured" means:
 *   - No active payout account at all, OR
 *   - Active account but method is VPA (not bank_account), OR
 *   - Active bank_account but missing required fields
 *     (legalName, panNumber, mobileNumber, bankName,
 *      accountHolderName, accountNumber/last4, ifscCode)
 *
 * Runs on the 10th of every month at 10:00 AM IST.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PayoutSetupReminderJob {

    private final UserRepository userRepository;
    private final PayoutAccountRepository payoutAccountRepository;
    private final EmailService emailService;

    @Scheduled(
            cron = "0 0 10 10 * *",
            zone = "Asia/Kolkata"
    )
    public void sendPayoutSetupReminders() {
        log.info(
                "Starting monthly payout-setup reminder check"
        );

        List<User> verifiedCreators =
                userRepository.findByIsVerifiedTrue();

        if (verifiedCreators.isEmpty()) {
            log.info("No verified creators found — nothing to do");
            return;
        }

        int sent = 0;
        int skipped = 0;

        for (User creator : verifiedCreators) {
            // Check if they have a fully configured bank payout
            Optional<PayoutAccount> activePayout =
                    payoutAccountRepository
                            .findByUserAndIsActiveTrue(creator);

            if (activePayout.isPresent()
                    && isFullyConfigured(activePayout.get())) {
                skipped++;
                continue;
            }

            // Skip if no usable email
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

                emailService.sendPayoutSetupReminderEmail(
                        creator.getEmail(),
                        name
                );

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
                "Payout-setup reminder job completed. "
                        + "sent={}, skipped={}",
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
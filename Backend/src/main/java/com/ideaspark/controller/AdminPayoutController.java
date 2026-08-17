package com.ideaspark.controller;

import com.ideaspark.dto.AdminPayoutDetailsDTO;
import com.ideaspark.model.PayoutAccount;
import com.ideaspark.model.User;
import com.ideaspark.repository.PayoutAccountRepository;
import com.ideaspark.repository.UserRepository;
import com.ideaspark.util.PayoutLockWindow;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Admin-only endpoints for viewing all Creator Pro subscribers
 * and their payout details (full decrypted PAN + account number),
 * and for unlocking individual payout accounts mid-cycle.
 *
 * A creator is considered "configured" only when they have an active
 * payout account with method = bank_account AND all required fields
 * filled: legalName, panNumber, mobileNumber, bankName,
 * accountHolderName, account number (full or last4), and ifscCode.
 *
 * VPA-only accounts or accounts with missing fields show as "Pending".
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/payout-accounts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPayoutController {

    private final UserRepository userRepository;
    private final PayoutAccountRepository payoutAccountRepository;

    // ── List all creator payout details ──────────────────────────────

    @GetMapping
    public ResponseEntity<List<AdminPayoutDetailsDTO>> getAllCreatorPayoutDetails() {

        List<User> verifiedCreators =
                userRepository.findByIsVerifiedTrue();

        List<AdminPayoutDetailsDTO> dtos = verifiedCreators.stream()
                .map(this::toAdminDTO)
                .toList();

        return ResponseEntity.ok(dtos);
    }

    // ── Unlock a specific creator's payout account ──────────────────

    /**
     * Admin override to unlock a creator's payout account during the
     * lock window (13th 8 PM – 20th 12 AM IST) so they can fix
     * incorrect bank details.
     */
    @PostMapping("/{userId}/unlock")
    @Transactional
    public ResponseEntity<?> unlockPayoutAccount(
            @PathVariable UUID userId
    ) {
        Optional<User> userOpt = userRepository.findById(userId);

        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOpt.get();

        Optional<PayoutAccount> accountOpt =
                payoutAccountRepository
                        .findByUserAndIsActiveTrue(user);

        if (accountOpt.isEmpty()) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            "No active payout account found "
                                    + "for this creator"
                    ));
        }

        PayoutAccount account = accountOpt.get();

        if (!Boolean.TRUE.equals(account.getPayoutLocked())) {
            return ResponseEntity.ok(Map.of(
                    "message",
                    "Payout account is already unlocked",
                    "userId", userId
            ));
        }

        account.setPayoutLocked(false);
        payoutAccountRepository.save(account);

        log.info(
                "Admin unlocked payout account for user {} ({})",
                user.getEmail(),
                userId
        );

        return ResponseEntity.ok(Map.of(
                "message",
                "Payout account unlocked successfully",
                "userId", userId,
                "creatorName", user.getName() != null
                        ? user.getName() : "",
                "creatorEmail", user.getEmail() != null
                        ? user.getEmail() : ""
        ));
    }

    // ── Unlock every locked account in one go ────────────────────────

    /**
     * Admin override to unlock every currently-locked payout account
     * at once, instead of clicking "Unlock" one creator at a time.
     * Same effect as PayoutSetupReminderJob.unlockPayoutDetails(),
     * just triggered on demand rather than waiting for the 20th.
     */
    @PostMapping("/unlock-all")
    @Transactional
    public ResponseEntity<?> unlockAllPayoutAccounts() {

        List<PayoutAccount> lockedAccounts =
                payoutAccountRepository.findAllByIsActiveTrue()
                        .stream()
                        .filter(a -> Boolean.TRUE.equals(a.getPayoutLocked()))
                        .toList();

        for (PayoutAccount account : lockedAccounts) {
            account.setPayoutLocked(false);
        }
        payoutAccountRepository.saveAll(lockedAccounts);

        log.info(
                "Admin bulk-unlocked {} payout account(s)",
                lockedAccounts.size()
        );

        return ResponseEntity.ok(Map.of(
                "message",
                "Unlocked " + lockedAccounts.size() + " payout account(s)",
                "unlockedCount", lockedAccounts.size(),
                "unlockedUserIds", lockedAccounts.stream()
                        .map(a -> a.getUser().getId())
                        .toList()
        ));
    }

    // ── Mapping ─────────────────────────────────────────────────────

    private AdminPayoutDetailsDTO toAdminDTO(User user) {

        Optional<PayoutAccount> activePayout =
                payoutAccountRepository.findByUserAndIsActiveTrue(user);

        if (activePayout.isPresent()) {
            PayoutAccount account = activePayout.get();
            boolean fullyConfigured = isFullyConfigured(account);

            return AdminPayoutDetailsDTO.builder()
                    .userId(user.getId())
                    .creatorName(user.getName())
                    .creatorEmail(user.getEmail())
                    .creatorUsername(user.getUsername())
                    .profileImage(user.getProfileImage())

                    .payoutConfigured(fullyConfigured)
                    .payoutAccountId(account.getId())

                    .legalName(account.getLegalName())
                    .panNumber(account.getPanNumber())
                    .mobileNumber(account.getMobileNumber())

                    .bankName(account.getBankName())
                    .accountHolderName(account.getPayoutAccountName())
                    .accountNumber(account.getPayoutAccountNumber())
                    .accountNumberLast4(
                            account.getPayoutAccountNumberLast4()
                    )
                    .ifscCode(account.getPayoutIfsc())
                    .payoutMethod(account.getPayoutMethod())

                    .razorpayContactId(
                            account.getRazorpayContactId()
                    )
                    .razorpayFundAccountId(
                            account.getRazorpayFundAccountId()
                    )

                    .active(
                            Boolean.TRUE.equals(account.getIsActive())
                    )
                    .payoutLocked(
                            PayoutLockWindow.isEffectivelyLocked(
                                    account.getPayoutLocked()
                            )
                    )
                    .createdAt(account.getCreatedAt())
                    .updatedAt(account.getUpdatedAt())
                    .build();
        }

        // No payout account at all
        return AdminPayoutDetailsDTO.builder()
                .userId(user.getId())
                .creatorName(user.getName())
                .creatorEmail(user.getEmail())
                .creatorUsername(user.getUsername())
                .profileImage(user.getProfileImage())
                .payoutConfigured(false)
                .payoutLocked(false)
                .active(false)
                .build();
    }

    /**
     * A payout account is fully configured only when:
     *  1. Method is "bank_account" (VPA not accepted)
     *  2. All required KYC + bank fields are present
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

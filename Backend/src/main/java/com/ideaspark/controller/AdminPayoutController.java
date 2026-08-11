package com.ideaspark.controller;

import com.ideaspark.dto.AdminPayoutDetailsDTO;
import com.ideaspark.model.PayoutAccount;
import com.ideaspark.model.User;
import com.ideaspark.repository.PayoutAccountRepository;
import com.ideaspark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * Admin-only endpoint for viewing all Creator Pro subscribers
 * and their payout details (full decrypted PAN + account number).
 *
 * A creator is considered "configured" only when they have an active
 * payout account with method = bank_account AND all required fields
 * filled: legalName, panNumber, mobileNumber, bankName,
 * accountHolderName, account number (full or last4), and ifscCode.
 *
 * VPA-only accounts or accounts with missing fields show as "Pending".
 */
@RestController
@RequestMapping("/api/admin/payout-accounts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPayoutController {

    private final UserRepository userRepository;
    private final PayoutAccountRepository payoutAccountRepository;

    @GetMapping
    public ResponseEntity<List<AdminPayoutDetailsDTO>> getAllCreatorPayoutDetails() {

        List<User> verifiedCreators =
                userRepository.findByIsVerifiedTrue();

        List<AdminPayoutDetailsDTO> dtos = verifiedCreators.stream()
                .map(this::toAdminDTO)
                .toList();

        return ResponseEntity.ok(dtos);
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
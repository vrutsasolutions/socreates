package com.ideaspark.service;

import com.ideaspark.dto.PayoutDetailsRequest;
import com.ideaspark.dto.PayoutDetailsResponse;
import com.ideaspark.model.CreatorEarning;
import com.ideaspark.model.PayoutAccount;
import com.ideaspark.model.User;
import com.ideaspark.repository.CreatorEarningRepository;
import com.ideaspark.repository.PayoutAccountRepository;
import com.ideaspark.repository.UserRepository;
import com.ideaspark.util.PayoutLockWindow;
import com.ideaspark.util.PayoutValidationHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Manages creator payout-account setup.
 *
 * Creators no longer request individual withdrawals manually.
 * Monthly earnings are paid by ScheduledPayoutRunner after revenue
 * distribution schedules the earning.
 *
 * Payout details are locked from the 13th 8 PM IST until the 20th
 * 12:00 AM IST each month to prevent mid-cycle changes during
 * payout processing.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CreatorPayoutService {

    private final UserRepository userRepository;
    private final PayoutAccountRepository payoutAccountRepository;
    private final CreatorEarningRepository earningRepository;
    private final RazorpayXService razorpayX;

    // ── GET payout details ───────────────────────────────────────────────────

    /**
     * Returns the creator's currently active payout destination.
     */
    @Transactional(readOnly = true)
    public PayoutDetailsResponse getPayoutDetails(String email) {
        User user = requireUser(email);

        PayoutAccount payoutAccount = resolveActiveAccount(user);

        if (payoutAccount == null) {
            return PayoutDetailsResponse.builder()
                    .configured(false)
                    .active(false)
                    .verified(false)
                    .locked(false)
                    .build();
        }

        return toResponse(payoutAccount);
    }

    // ── PUT payout details ───────────────────────────────────────────────────

    /**
     * Creates or replaces the creator's payout destination.
     *
     * Process:
     *
     * 1. Check payout lock — reject if locked.
     * 2. Validate the request.
     * 3. Reuse the existing Razorpay contact when possible.
     * 4. Create a new Razorpay fund account.
     * 5. Deactivate the previous Razorpay fund account.
     * 6. Mark the previous local account inactive.
     * 7. Create a new local payout-account history row.
     * 8. Point User.activePayoutAccount to the new row.
     * 9. Reschedule eligible Setup_Missing earnings.
     */
    @Transactional
    public PayoutDetailsResponse savePayoutDetails(
            String email,
            PayoutDetailsRequest request
    ) throws Exception {

        if (!razorpayX.hasApiCredentials()) {
            throw new IllegalStateException(
                    "Razorpay API credentials are not configured."
            );
        }

        if (request == null) {
            throw new IllegalArgumentException(
                    "Payout details are required."
            );
        }

        User user = requireUser(email);

        // ── Lock check ────────────────────────────────────────────
        // Uses the real-time window, not just the stored flag — a
        // stuck-true flag from a stray job run should never block
        // edits outside the actual 13th-8PM-to-20th-12AM window.
        // See PayoutLockWindow for why.
        PayoutAccount existingAccount = resolveActiveAccount(user);

        if (existingAccount != null
                && PayoutLockWindow.isEffectivelyLocked(
                        existingAccount.getPayoutLocked()
                )) {
            throw new IllegalStateException(
                    "Payout details are locked for this month's "
                            + "payout cycle. They will be editable "
                            + "again after the 20th."
            );
        }
        // ──────────────────────────────────────────────────────────

        ValidatedPayoutDetails details = validate(request);

        // ── Enhanced validation (Aug 2026) ────────────────────────
        // PAN surname cross-check + bank-specific account length.
        // These are advisory on the frontend (dismissible warnings),
        // but logged on the backend for audit. Non-individual PANs
        // (Company/HUF/Firm) are hard-blocked — creators must use a
        // personal PAN.
        List<String> validationWarnings =
                PayoutValidationHelper.runValidations(
                        details.panNumber(),
                        details.legalName(),
                        details.accountNumber(),
                        details.ifscCode()
                );

        // Hard-block non-individual PANs
        String panCheck = PayoutValidationHelper
                .validatePanAgainstName(
                        details.panNumber(),
                        details.legalName()
                );
        if (panCheck != null
                && panCheck.contains("non-individual")) {
            throw new IllegalArgumentException(panCheck);
        }

        // Log advisory warnings for audit trail
        if (!validationWarnings.isEmpty()) {
            log.warn(
                    "Payout validation warnings for user {}: {}",
                    email,
                    String.join(" | ", validationWarnings)
            );
        }
        // ──────────────────────────────────────────────────────────

        String contactId = resolveContactId(
                user,
                existingAccount
        );

        String newFundAccountId;

        try {
            newFundAccountId = createFundAccount(
                    contactId,
                    details
            );
        } catch (Exception firstAttempt) {
            /*
             * If the reused contact ID is stale (deleted or expired on
             * RazorpayX), the API returns "The id provided does not exist".
             * Recover by creating a brand-new contact and retrying.
             */
            String msg = firstAttempt.getMessage();

            if (msg != null && msg.toLowerCase()
                    .contains("does not exist")) {

                log.warn(
                        "Stale RazorpayX contact {} for user {} — "
                                + "creating a fresh contact and retrying. "
                                + "Original error: {}",
                        contactId,
                        user.getEmail(),
                        msg
                );

                contactId = razorpayX.createContact(
                        user.getName(),
                        user.getEmail()
                );

                newFundAccountId = createFundAccount(
                        contactId,
                        details
                );
            } else {
                throw firstAttempt;
            }
        }

        /*
         * Create the new Razorpay fund account before disabling the previous
         * one. This avoids leaving the creator with no usable destination if
         * creation of the replacement fails.
         */
        try {
            deactivatePreviousRemoteAccount(
                    existingAccount,
                    newFundAccountId
            );
        } catch (Exception exception) {
            /*
             * Best-effort cleanup of the newly-created remote account.
             * The previous account remains active if its deactivation failed.
             */
            try {
                razorpayX.deactivateFundAccount(
                        newFundAccountId
                );
            } catch (Exception cleanupException) {
                exception.addSuppressed(cleanupException);
            }

            throw exception;
        }

        deactivatePreviousLocalAccount(existingAccount);

        PayoutAccount newAccount = createLocalPayoutAccount(
                user,
                contactId,
                newFundAccountId,
                details
        );

        newAccount = payoutAccountRepository.save(newAccount);

        user.setActivePayoutAccount(newAccount);
        userRepository.save(user);

        reactivateSetupMissingEarnings(
                user,
                newAccount
        );

        return toResponse(newAccount);
    }

    // ── Request validation ───────────────────────────────────────────────────

    private ValidatedPayoutDetails validate(
            PayoutDetailsRequest request
    ) {
        String legalName = requireText(
                request.getLegalName(),
                "Legal name"
        );

        String mobileNumber = normalizeMobile(
                request.getMobileNumber()
        );

        String panNumber = normalizePan(
                request.getPanNumber()
        );

        if (!request.isOwnershipConfirmed()) {
            throw new IllegalArgumentException(
                    "You must confirm that the payout account belongs to you."
            );
        }

        String accountHolderName = requireText(
                request.getAccountHolderName(),
                "Account holder name"
        );

        String accountNumber = normalizeDigits(
                request.getAccountNumber()
        );

        String confirmAccountNumber = normalizeDigits(
                request.getConfirmAccountNumber()
        );

        String ifscCode = normalize(
                request.getIfscCode()
        ).toUpperCase();

        String bankName = requireText(
                request.getBankName(),
                "Bank name"
        );

        if (!accountNumber.matches("\\d{6,20}")) {
            throw new IllegalArgumentException(
                    "Enter a valid bank account number."
            );
        }

        if (!accountNumber.equals(confirmAccountNumber)) {
            throw new IllegalArgumentException(
                    "Account number and confirmation do not match."
            );
        }

        if (!ifscCode.matches("[A-Z]{4}0[A-Z0-9]{6}")) {
            throw new IllegalArgumentException(
                    "Enter a valid IFSC code."
            );
        }

        return new ValidatedPayoutDetails(
                "bank_account",
                legalName,
                mobileNumber,
                panNumber,
                accountHolderName,
                accountNumber,
                ifscCode,
                bankName
        );
    }
    private String normalizeMobile(String value) {
        String mobile = normalize(value)
                .replaceAll("[^0-9+]", "");

        if (mobile.startsWith("+91")) {
            mobile = mobile.substring(3);
        }

        if (!mobile.matches("\\d{10}")) {
            throw new IllegalArgumentException(
                    "Enter a valid 10-digit mobile number."
            );
        }

        return mobile;
    }

    private String normalizePan(String value) {
        String pan = normalize(value)
                .toUpperCase()
                .replaceAll("[^A-Z0-9]", "");

        if (!pan.matches("[A-Z]{5}[0-9]{4}[A-Z]")) {
            throw new IllegalArgumentException(
                    "Enter a valid PAN (e.g. ABCDE1234F)."
            );
        }

        return pan;
    }

    // ── RazorpayX helpers ────────────────────────────────────────────────────

    private String resolveContactId(
            User user,
            PayoutAccount previousAccount
    ) throws Exception {
        if (previousAccount != null
                && notBlank(
                        previousAccount.getRazorpayContactId()
                )) {

            return previousAccount.getRazorpayContactId();
        }

        return razorpayX.createContact(
                user.getName(),
                user.getEmail()
        );
    }

    private String createFundAccount(
            String contactId,
            ValidatedPayoutDetails details
    ) throws Exception {
        return razorpayX.createBankFundAccount(
                contactId,
                details.accountHolderName(),
                details.ifscCode(),
                details.accountNumber()
        );
    }

    private void deactivatePreviousRemoteAccount(
            PayoutAccount previousAccount,
            String newFundAccountId
    ) throws Exception {
        if (previousAccount == null) {
            return;
        }

        String previousFundAccountId =
                previousAccount.getRazorpayFundAccountId();

        if (!notBlank(previousFundAccountId)) {
            return;
        }

        if (previousFundAccountId.equals(newFundAccountId)) {
            return;
        }

        try {
            razorpayX.deactivateFundAccount(
                    previousFundAccountId
            );
        } catch (Exception e) {
            String msg = e.getMessage();

            if (msg != null && msg.toLowerCase()
                    .contains("does not exist")) {

                log.warn(
                        "Previous RazorpayX fund account {} "
                                + "no longer exists — skipping "
                                + "deactivation. Original error: {}",
                        previousFundAccountId,
                        msg
                );

                return;
            }

            throw e;
        }
    }

    // ── Local persistence ────────────────────────────────────────────────────

    private void deactivatePreviousLocalAccount(
            PayoutAccount previousAccount
    ) {
        if (previousAccount == null) {
            return;
        }

        previousAccount.setIsActive(false);
        payoutAccountRepository.save(previousAccount);
    }

    private PayoutAccount createLocalPayoutAccount(
            User user,
            String contactId,
            String fundAccountId,
            ValidatedPayoutDetails details
    ) {
        String lastFour = null;

        if (notBlank(details.accountNumber())) {
            String accountNumber = details.accountNumber();

            lastFour = accountNumber.substring(
                    Math.max(0, accountNumber.length() - 4)
            );
        }

        return PayoutAccount.builder()
                .user(user)
                .legalName(details.legalName())
                .panNumber(details.panNumber())
                .mobileNumber(details.mobileNumber())
                .bankName(details.bankName())
                .payoutAccountName(details.accountHolderName())
                .payoutAccountNumberLast4(lastFour)
                .payoutAccountNumber(details.accountNumber())
                .payoutIfsc(details.ifscCode())
                .payoutMethod("bank_account")
                .razorpayContactId(contactId)
                .razorpayFundAccountId(fundAccountId)
                .isActive(true)
                .payoutLocked(false)
                .build();
    }

    /**
     * Restores earnings that were blocked only because payout setup was
     * missing.
     *
     * Rows with no payable amount remain Setup_Missing/estimating and are not
     * sent to Razorpay.
     */
    private void reactivateSetupMissingEarnings(
            User user,
            PayoutAccount payoutAccount
    ) {
        List<CreatorEarning> earnings =
                earningRepository
                        .findByCreatorIdOrderByMonthDesc(
                                user.getId()
                        );

        LocalDateTime now = LocalDateTime.now();

        for (CreatorEarning earning : earnings) {
            if (!"Setup_Missing".equalsIgnoreCase(
                    earning.getStatus()
            )) {
                continue;
            }

            long amountPaise =
                    earning.getRevenuePaise() != null
                            ? earning.getRevenuePaise()
                            : 0L;

            if (amountPaise <= 0) {
                continue;
            }

            earning.setPayoutAccount(payoutAccount);
            earning.setStatus("Scheduled");
            earning.setScheduledFor(now);
            earning.setFailureReason(null);
            earning.setRetryCount(0);
            earning.setNextRetryAt(null);
        }

        earningRepository.saveAll(earnings);
    }

    // ── Response mapping ─────────────────────────────────────────────────────

    private PayoutDetailsResponse toResponse(
            PayoutAccount account
    ) {
        return PayoutDetailsResponse.builder()
                .configured(
                        Boolean.TRUE.equals(account.getIsActive())
                                && notBlank(
                                        account.getRazorpayFundAccountId()
                                )
                )
                .method(account.getPayoutMethod())
                .accountHolderName(
                        account.getPayoutAccountName()
                )
                .bankName(account.getBankName())
                .destination(maskDestination(account))
                .maskedPan(maskPan(account.getPanNumber()))
                .maskedMobile(
                        maskMobile(account.getMobileNumber())
                )
                .active(Boolean.TRUE.equals(account.getIsActive()))
                .verified(
                        notBlank(account.getRazorpayContactId())
                                && notBlank(
                                        account.getRazorpayFundAccountId()
                                )
                )
                .locked(
                        PayoutLockWindow.isEffectivelyLocked(
                                account.getPayoutLocked()
                        )
                )
                .build();
    }

    private PayoutAccount resolveActiveAccount(User user) {
        PayoutAccount pointedAccount =
                user.getActivePayoutAccount();

        if (pointedAccount != null
                && Boolean.TRUE.equals(
                        pointedAccount.getIsActive()
                )) {

            return pointedAccount;
        }

        return payoutAccountRepository
                .findByUserAndIsActiveTrue(user)
                .orElse(null);
    }

    // ── Masking helpers ──────────────────────────────────────────────────────

    private static String maskDestination(
            PayoutAccount account
    ) {
        if (account == null) {
            return null;
        }

        String lastFour =
                account.getPayoutAccountNumberLast4();

        if (!notBlank(lastFour)) {
            return null;
        }

        if (lastFour.length() > 4) {
            lastFour = lastFour.substring(
                    lastFour.length() - 4
            );
        }

        String bank = notBlank(account.getBankName())
                ? account.getBankName()
                : "Bank";

        return bank + " ****" + lastFour;
    }

    private static String maskPan(String pan) {
        if (!notBlank(pan)) {
            return null;
        }

        String normalized = pan.trim().toUpperCase();

        if (normalized.length() < 6) {
            return "****";
        }

        return normalized.substring(0, 5)
                + "****"
                + normalized.substring(
                        normalized.length() - 1
                );
    }

    private static String maskMobile(String mobile) {
        if (!notBlank(mobile)) {
            return null;
        }

        String digits = mobile.replaceAll("[^0-9]", "");

        if (digits.length() <= 4) {
            return "****";
        }

        return "*".repeat(digits.length() - 4)
                + digits.substring(digits.length() - 4);
    }

    // ── General helpers ──────────────────────────────────────────────────────

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found")
                );
    }

    private static String requireText(
            String value,
            String fieldName
    ) {
        String normalized = normalize(value);

        if (normalized.isBlank()) {
            throw new IllegalArgumentException(
                    fieldName + " is required."
            );
        }

        return normalized;
    }

    private static String normalizeDigits(String value) {
        return normalize(value)
                .replaceAll("[^0-9]", "");
    }

    private static String normalize(String value) {
        return value == null
                ? ""
                : value.trim();
    }

    private static boolean notBlank(String value) {
        return value != null
                && !value.isBlank();
    }

    /**
     * Internal validated representation so unvalidated request values are not
     * repeatedly used throughout the setup process.
     */
    private record ValidatedPayoutDetails(
            String method,
            String legalName,
            String mobileNumber,
            String panNumber,
            String accountHolderName,
            String accountNumber,
            String ifscCode,
            String bankName
    ) {
    }
}

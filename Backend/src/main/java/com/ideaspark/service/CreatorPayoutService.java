package com.ideaspark.service;

import com.ideaspark.dto.PayoutDetailsRequest;
import com.ideaspark.dto.PayoutDetailsResponse;
import com.ideaspark.model.CreatorEarning;
import com.ideaspark.model.PayoutAccount;
import com.ideaspark.model.User;
import com.ideaspark.repository.CreatorEarningRepository;
import com.ideaspark.repository.PayoutAccountRepository;
import com.ideaspark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Manages creator payout-account setup.
 *
 * Creators no longer request individual withdrawals manually.
 * Monthly earnings are paid by ScheduledPayoutRunner after revenue
 * distribution schedules the earning.
 */
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
     * 1. Validate the request.
     * 2. Reuse the existing Razorpay contact when possible.
     * 3. Create a new Razorpay fund account.
     * 4. Deactivate the previous Razorpay fund account.
     * 5. Mark the previous local account inactive.
     * 6. Create a new local payout-account history row.
     * 7. Point User.activePayoutAccount to the new row.
     * 8. Reschedule eligible Setup_Missing earnings.
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

        ValidatedPayoutDetails details = validate(request);

        PayoutAccount previousAccount =
                resolveActiveAccount(user);

        String contactId = resolveContactId(
                user,
                previousAccount
        );

        String newFundAccountId = createFundAccount(
                contactId,
                details
        );

        /*
         * Create the new Razorpay fund account before disabling the previous
         * one. This avoids leaving the creator with no usable destination if
         * creation of the replacement fails.
         */
        try {
            deactivatePreviousRemoteAccount(
                    previousAccount,
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

        deactivatePreviousLocalAccount(previousAccount);

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
        String method = normalize(request.getMethod());

        if (!"vpa".equals(method)
                && !"bank_account".equals(method)) {

            throw new IllegalArgumentException(
                    "method must be 'vpa' or 'bank_account'."
            );
        }

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

        if ("vpa".equals(method)) {
            String vpa = normalize(request.getVpa());

            if (!vpa.matches("[A-Za-z0-9._\\-]+@[A-Za-z0-9.\\-]+")) {
                throw new IllegalArgumentException(
                        "Enter a valid UPI ID, for example name@bank."
                );
            }

            return new ValidatedPayoutDetails(
                    method,
                    legalName,
                    mobileNumber,
                    panNumber,
                    null,
                    null,
                    null,
                    null,
                    vpa
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
                method,
                legalName,
                mobileNumber,
                panNumber,
                accountHolderName,
                accountNumber,
                ifscCode,
                bankName,
                null
        );
    }

    private String normalizeMobile(String value) {
        String mobile = normalize(value)
                .replaceAll("[^0-9]", "");

        if (!mobile.matches("\\d{10,15}")) {
            throw new IllegalArgumentException(
                    "Enter a valid mobile number."
            );
        }

        return mobile;
    }

    private String normalizePan(String value) {
        String pan = normalize(value).toUpperCase();

        if (!pan.matches("[A-Z]{5}[0-9]{4}[A-Z]")) {
            throw new IllegalArgumentException(
                    "Enter a valid PAN number."
            );
        }

        return pan;
    }

    // ── Razorpay setup ───────────────────────────────────────────────────────

    private String resolveContactId(
            User user,
            PayoutAccount previousAccount
    ) throws Exception {

        if (previousAccount != null
                && notBlank(previousAccount.getRazorpayContactId())) {

            return previousAccount.getRazorpayContactId();
        }

        /*
         * The active pointer may be empty while historical payout accounts
         * still contain the creator's reusable Razorpay contact ID.
         */
        List<PayoutAccount> history =
                payoutAccountRepository
                        .findByUserOrderByCreatedAtDesc(user);

        for (PayoutAccount account : history) {
            if (notBlank(account.getRazorpayContactId())) {
                return account.getRazorpayContactId();
            }
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

        if ("vpa".equals(details.method())) {
            return razorpayX.createVpaFundAccount(
                    contactId,
                    details.vpa()
            );
        }

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

        /*
         * Defensive guard in case Razorpay returns/reuses the same ID.
         */
        if (previousFundAccountId.equals(newFundAccountId)) {
            return;
        }

        razorpayX.deactivateFundAccount(
                previousFundAccountId
        );
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
                .payoutAccountName(
                        "vpa".equals(details.method())
                                ? details.legalName()
                                : details.accountHolderName()
                )
                .payoutAccountNumberLast4(lastFour)
                .payoutIfsc(details.ifscCode())
                .payoutMethod(details.method())
                .payoutVpa(details.vpa())
                .razorpayContactId(contactId)
                .razorpayFundAccountId(fundAccountId)
                .isActive(true)
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

        if ("vpa".equalsIgnoreCase(account.getPayoutMethod())
                && notBlank(account.getPayoutVpa())) {

            return maskVpa(account.getPayoutVpa());
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

    private static String maskVpa(String vpa) {
        int atIndex = vpa.indexOf('@');

        if (atIndex <= 0) {
            return vpa;
        }

        String prefix = vpa.substring(0, atIndex);
        String provider = vpa.substring(atIndex);

        if (prefix.length() <= 2) {
            return prefix.substring(0, 1)
                    + "***"
                    + provider;
        }

        return prefix.substring(0, 2)
                + "***"
                + provider;
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
            String bankName,
            String vpa
    ) {
    }
}
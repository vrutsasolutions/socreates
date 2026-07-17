package com.ideaspark.service;

import com.ideaspark.dto.PayoutDetailsRequest;
import com.ideaspark.dto.PayoutDetailsResponse;
import com.ideaspark.dto.PayoutResultResponse;
import com.ideaspark.model.CreatorEarning;
import com.ideaspark.model.User;
import com.ideaspark.repository.CreatorEarningRepository;
import com.ideaspark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.json.JSONObject;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ideaspark.model.PayoutAccount;
import com.ideaspark.repository.PayoutAccountRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Creator self-service payouts via RazorpayX (test mode).
 *
 * Two-step model:
 * 1. Creator saves payout details once → we create a RazorpayX contact +
 * fund account and persist the ids on the user ({@link #savePayoutDetails}).
 * 2. Creator withdraws a Pending earnings row → we create a RazorpayX payout
 * to that fund account and flip the row to "Paid" ({@link #requestPayout}).
 */
@Service
@RequiredArgsConstructor
public class CreatorPayoutService {

    private final UserRepository userRepository;
    private final PayoutAccountRepository payoutAccountRepository;
    private final CreatorEarningRepository earningRepository;
    private final RazorpayXService razorpayX;

    // ── GET payout details ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PayoutDetailsResponse getPayoutDetails(String email) {
        User user = requireUser(email);

        PayoutAccount payoutAccount = user.getActivePayoutAccount();

        if (payoutAccount == null) {
            return PayoutDetailsResponse.builder()
                    .configured(false)
                    .build();
        }
        return PayoutDetailsResponse.builder()
                .configured(true)
                .method(payoutAccount.getPayoutMethod())
                .accountHolderName(payoutAccount.getPayoutAccountName())
                .bankName(payoutAccount.getBankName())
                .destination(maskDestination(payoutAccount))
                .active(Boolean.TRUE.equals(payoutAccount.getIsActive()))
                .verified(true)
                .build();
    }

    // ── PUT payout details ────────────────────────────────────────────────────

    @Transactional
    public PayoutDetailsResponse savePayoutDetails(String email, PayoutDetailsRequest req) throws Exception {
        if (!razorpayX.isConfigured()) {
            throw new IllegalStateException(
                    "RazorpayX is not configured. Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET and razorpayx.account-number.");
        }
        User user = requireUser(email);
        String method = req.getMethod() == null ? "" : req.getMethod().trim().toLowerCase();

        // Reuse the creator's existing RazorpayX contact; create it once.
        String contactId = null;

        PayoutAccount existingAccount = user.getActivePayoutAccount();

        if (existingAccount != null) {
            contactId = existingAccount.getRazorpayContactId();
        }
        if (!notBlank(contactId)) {
            contactId = razorpayX.createContact(user.getName(), user.getEmail());
            
        }

        String fundAccountId;
        switch (method) {
            case "vpa" -> {
                String vpa = req.getVpa() == null ? "" : req.getVpa().trim();
                if (!vpa.matches("[\\w.\\-]+@[\\w.\\-]+")) {
                    throw new IllegalArgumentException("Enter a valid UPI ID (e.g. name@bank).");
                }
                fundAccountId = razorpayX.createVpaFundAccount(contactId, vpa);

            }
            case "bank_account" -> {
                String name = req.getAccountHolderName() == null ? "" : req.getAccountHolderName().trim();
                String acct = req.getAccountNumber() == null ? "" : req.getAccountNumber().trim();
                String ifsc = req.getIfscCode() == null ? "" : req.getIfscCode().trim().toUpperCase();
                if (name.isBlank())
                    throw new IllegalArgumentException("Account holder name is required.");
                if (!acct.matches("\\d{6,20}"))
                    throw new IllegalArgumentException("Enter a valid account number.");
                if (!ifsc.matches("[A-Z]{4}0[A-Z0-9]{6}"))
                    throw new IllegalArgumentException("Enter a valid IFSC code.");
                fundAccountId = razorpayX.createBankFundAccount(contactId, name, ifsc, acct);

            }
            default -> throw new IllegalArgumentException("method must be 'vpa' or 'bank_account'.");
        }

        // Deactivate previous payout account (if any)
        PayoutAccount oldAccount = user.getActivePayoutAccount();

        if (oldAccount != null) {
            oldAccount.setIsActive(false);
            payoutAccountRepository.save(oldAccount);
        }

        // Store only the last 4 digits of the account number
        String last4 = null;
        if ("bank_account".equals(method) && req.getAccountNumber() != null) {
            String accountNumber = req.getAccountNumber().trim();
            if (accountNumber.length() >= 4) {
                last4 = accountNumber.substring(accountNumber.length() - 4);
            }
        }

        // Create new payout account
        PayoutAccount payoutAccount = PayoutAccount.builder()
                .user(user)
                .legalName(req.getLegalName())
                .panNumber(req.getPanNumber())
                .mobileNumber(req.getMobileNumber())
                .bankName(req.getBankName())
                .payoutAccountName(req.getAccountHolderName())
                .payoutAccountNumberLast4(last4)
                .payoutIfsc(req.getIfscCode())
                .payoutMethod(method)
                .razorpayContactId(contactId)
                .payoutVpa(req.getVpa())
                .razorpayContactId(contactId)
                .razorpayFundAccountId(fundAccountId)
                .isActive(true)
                .build();

        payoutAccountRepository.save(payoutAccount);

        // Link it to the user
        user.setActivePayoutAccount(payoutAccount);
        userRepository.save(user);

        return getPayoutDetails(email);
    }

    // ── POST payout (withdraw one month) ──────────────────────────────────────

    @Transactional
    public PayoutResultResponse requestPayout(String email, String monthStr) {
        if (!razorpayX.isConfigured()) {
            throw new IllegalStateException(
                    "RazorpayX is not configured. Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET and razorpayx.account-number.");
        }
        User user = requireUser(email);

        PayoutAccount payoutAccount = user.getActivePayoutAccount();

        if (payoutAccount == null || !Boolean.TRUE.equals(payoutAccount.getIsActive())) {
            throw new IllegalStateException("Add your payout details before withdrawing.");
        }

        LocalDate month = parseMonth(monthStr);
        CreatorEarning earning = earningRepository
                .findByCreatorIdAndMonth(user.getId(), month)
                .orElseThrow(() -> new IllegalArgumentException("No earnings found for " + monthStr + "."));

        long amountPaise = earning.getRevenuePaise() != null ? earning.getRevenuePaise() : 0L;
        if (amountPaise <= 0) {
            throw new IllegalStateException("Nothing to withdraw for this month.");
        }

        // ── Fix #14: atomic claim, BEFORE calling RazorpayX ────────────────
        // Replaces the old "check earning.getStatus() in Java, write 'Paid'
        // later" pattern, which let two concurrent requests both pass the
        // check and both fire a real RazorpayX payout for the same row.
        // This single UPDATE ... WHERE status='Pending' is the actual lock:
        // only one concurrent caller can ever flip Pending -> Processing,
        // so only one can ever reach the RazorpayX call below. If this
        // whole method later throws (including the RazorpayX call failing),
        // @Transactional rolls the claim back to 'Pending' automatically,
        // so the creator can simply retry — no separate cleanup needed.
        int claimed = earningRepository.claimPendingForPayout(earning.getId());
        if (claimed == 0) {
            throw new IllegalStateException(
                    "This month has already been paid out or a withdrawal is already in progress.");
        }

        // VPA → UPI, bank_account → IMPS. reference_id = row id makes the call
        // idempotent (a replay returns the original payout, never a duplicate).
        String mode = "vpa".equalsIgnoreCase(payoutAccount.getPayoutMethod())
                ? "UPI"
                : "IMPS";
        String reference = earning.getId().toString();

        JSONObject payout;
        try {
            payout = razorpayX.createPayout(
                    payoutAccount.getRazorpayFundAccountId(),
                    amountPaise,
                    mode,
                    reference);
        } catch (RazorpayXService.RazorpayXException e) {
            // Bubble up RazorpayX's message; controller maps to a 4xx/5xx.
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Could not reach RazorpayX: " + e.getMessage(), e);
        }

        String payoutId = payout.optString("id", null);
        String payoutStatus = payout.optString("status", "processing");

        earning.setStatus("Paid");
        earning.setRazorpayPayoutId(payoutId);
        earning.setPaidAt(LocalDateTime.now());
        earning.setPayoutAccount(payoutAccount);

        earningRepository.save(earning);

        return PayoutResultResponse.builder()
                .month(monthStr)
                .status(earning.getStatus())
                .earning((int) (amountPaise / 100))
                .payoutId(payoutId)
                .payoutStatus(payoutStatus)
                .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private static LocalDate parseMonth(String monthStr) {
        if (monthStr == null || monthStr.isBlank()) {
            throw new IllegalArgumentException("month is required (e.g. 2026-06-01).");
        }
        try {
            // Accept the full ISO date the earnings endpoint returns; normalise to
            // the 1st so it matches how rows are stored.
            return LocalDate.parse(monthStr.trim()).withDayOfMonth(1);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid month '" + monthStr + "' (expected YYYY-MM-DD).");
        }
    }

    /** Human-readable, masked destination for display (never the full number). */
    private static String maskDestination(PayoutAccount account) {
        if ("vpa".equalsIgnoreCase(account.getPayoutMethod()) && notBlank(account.getPayoutVpa())) {
            return account.getPayoutVpa();
        }
        String acct = account.getPayoutAccountNumberLast4();
        if (notBlank(acct)) {
            String last4 = acct.length() > 4 ? acct.substring(acct.length() - 4) : acct;
            String bank = notBlank(account.getPayoutIfsc()) ? account.getPayoutIfsc().substring(0, 4) : "BANK";
            return bank + " ****" + last4;
        }
        return null;
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}

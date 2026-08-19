package com.ideaspark.util;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Server-side payout detail validation — mirrors the three layers of
 * checks performed on the frontend so that validation cannot be bypassed
 * by direct API calls.
 *
 * <p>Layer 1 (IFSC full branch lookup) is frontend-only — it hits a free
 * external API for branch confirmation and has no security implications if
 * skipped.</p>
 *
 * <p>Layer 2: PAN 5th-character cross-validation against the legal name.
 * Indian PAN structure is AAAAA9999A. For individual ("P"-type) PANs, the
 * 5th character must be the first letter of the holder's surname.</p>
 *
 * <p>Layer 3: Bank-specific account number length validation. Different
 * banks use different account number lengths; we validate against known
 * lengths for major banks identified by the IFSC prefix.</p>
 *
 * <p>All checks are free — no external API is called.</p>
 */
public final class PayoutValidationHelper {

    private PayoutValidationHelper() { }

    // ── Layer 2: PAN cross-validation ────────────────────────────────────

    /**
     * Validates PAN against the legal name.
     *
     * <p>For individual (P-type) PANs, the 5th character must match the
     * first letter of the holder's surname (last word of the legal name).</p>
     *
     * @return a human-readable warning message, or {@code null} if valid
     */
    public static String validatePanAgainstName(
            String pan,
            String legalName
    ) {
        if (!notBlank(pan) || !notBlank(legalName)) {
            return null;
        }

        String normalizedPan = pan.trim().toUpperCase()
                .replaceAll("[^A-Z0-9]", "");

        if (normalizedPan.length() != 10) {
            return null; // Format already checked elsewhere
        }

        char holderType = normalizedPan.charAt(3);

        // Only individual PANs allowed for creator payouts
        if (holderType != 'P') {
            return "This PAN belongs to a non-individual entity "
                    + "(Company/HUF/Firm). Please use your personal PAN.";
        }

        char panSurnameChar = normalizedPan.charAt(4);

        String name = legalName.trim();
        String[] parts = name.split("\\s+");

        // Surname is the last word, or the only word for single names
        String surname = parts.length > 1
                ? parts[parts.length - 1]
                : parts[0];

        if (surname.isEmpty()) {
            return null;
        }

        char surnameInitial = Character.toUpperCase(surname.charAt(0));

        if (surnameInitial != panSurnameChar) {
            return String.format(
                    "PAN's 5th character '%c' does not match your surname "
                            + "initial '%c' (from \"%s\"). Please verify "
                            + "your PAN and legal name.",
                    panSurnameChar,
                    surnameInitial,
                    surname
            );
        }

        return null;
    }

    // ── Layer 3: Bank-specific account number length ─────────────────────

    /**
     * Known account number lengths for major Indian banks, keyed by IFSC
     * prefix (first 4 characters).
     */
    private static final Map<String, BankRule> BANK_ACCOUNT_LENGTHS = Map.ofEntries(
            Map.entry("SBIN", new BankRule("State Bank of India", Set.of(11))),
            Map.entry("HDFC", new BankRule("HDFC Bank", Set.of(14))),
            Map.entry("ICIC", new BankRule("ICICI Bank", Set.of(12))),
            Map.entry("UTIB", new BankRule("Axis Bank", Set.of(15))),
            Map.entry("KKBK", new BankRule("Kotak Mahindra Bank", Set.of(14))),
            Map.entry("PUNB", new BankRule("Punjab National Bank", Set.of(16))),
            Map.entry("UBIN", new BankRule("Union Bank of India", Set.of(14, 15))),
            Map.entry("CNRB", new BankRule("Canara Bank", Set.of(13))),
            Map.entry("BARB", new BankRule("Bank of Baroda", Set.of(14))),
            Map.entry("BKID", new BankRule("Bank of India", Set.of(15))),
            Map.entry("MAHB", new BankRule("Bank of Maharashtra", Set.of(11))),
            Map.entry("IOBA", new BankRule("Indian Overseas Bank", Set.of(15))),
            Map.entry("FDRL", new BankRule("Federal Bank", Set.of(14, 16))),
            Map.entry("IDIB", new BankRule("Indian Bank", Set.of(9, 17))),
            Map.entry("INDB", new BankRule("IndusInd Bank", Set.of(14))),
            Map.entry("YESB", new BankRule("YES Bank", Set.of(14, 15))),
            Map.entry("IDFC", new BankRule("IDFC FIRST Bank", Set.of(14))),
            Map.entry("IBKL", new BankRule("IDBI Bank", Set.of(13, 14, 15, 16))),
            Map.entry("RATN", new BankRule("RBL Bank", Set.of(12))),
            Map.entry("SIBL", new BankRule("South Indian Bank", Set.of(14, 16))),
            Map.entry("UCBA", new BankRule("UCO Bank", Set.of(14))),
            Map.entry("CSBK", new BankRule("CSB Bank", Set.of(16, 17)))
    );

    /**
     * Validates account number length against the known lengths for the
     * bank identified by the IFSC prefix.
     *
     * @return a human-readable warning message, or {@code null} if valid
     */
    public static String validateAccountNumberLength(
            String accountNumber,
            String ifscCode
    ) {
        if (!notBlank(accountNumber) || !notBlank(ifscCode)) {
            return null;
        }

        String acct = accountNumber.trim().replaceAll("[^0-9]", "");
        String ifsc = ifscCode.trim().toUpperCase();

        if (acct.length() < 6 || ifsc.length() < 4) {
            return null;
        }

        String prefix = ifsc.substring(0, 4);
        BankRule rule = BANK_ACCOUNT_LENGTHS.get(prefix);

        if (rule == null) {
            return null; // Unknown bank — can't validate
        }

        if (!rule.validLengths.contains(acct.length())) {
            String expected = rule.validLengths.stream()
                    .sorted()
                    .map(String::valueOf)
                    .reduce((a, b) -> a + " or " + b)
                    .orElse("unknown");

            return String.format(
                    "%s account numbers are typically %s digits, "
                            + "but %d digits were entered. Please verify "
                            + "the account number.",
                    rule.bankName,
                    expected,
                    acct.length()
            );
        }

        return null;
    }

    // ── Combined runner ──────────────────────────────────────────────────

    /**
     * Runs all server-side validation checks and returns any warnings.
     *
     * <p>These are advisory warnings, not hard errors. The frontend shows
     * them as dismissible alerts; the backend logs them but does not block
     * the request (the frontend already enforced acknowledgment).</p>
     */
    public static List<String> runValidations(
            String pan,
            String legalName,
            String accountNumber,
            String ifscCode
    ) {
        List<String> warnings = new ArrayList<>();

        String panWarning = validatePanAgainstName(pan, legalName);
        if (panWarning != null) {
            warnings.add(panWarning);
        }

        String acctWarning = validateAccountNumberLength(
                accountNumber,
                ifscCode
        );
        if (acctWarning != null) {
            warnings.add(acctWarning);
        }

        return warnings;
    }

    // ── Internal ─────────────────────────────────────────────────────────

    private record BankRule(String bankName, Set<Integer> validLengths) { }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}

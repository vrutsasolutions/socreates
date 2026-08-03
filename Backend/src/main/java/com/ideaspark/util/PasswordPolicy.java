package com.ideaspark.util;

/**
 * Single source of truth for "is this password strong enough" — used by
 * registration (AuthService), the forgot-password reset flow
 * (OtpController), and the logged-in change-password flow (UserController).
 *
 * Previously each of those three call sites enforced its own rule
 * independently: AuthService and UserController both required only a
 * 6-character minimum with no complexity check, and OtpController's
 * forgot-password reset endpoint enforced nothing at all — a password could
 * be reset to a single character through that path. Centralizing the check
 * here means all three flows are always in sync, and fixing/relaxing the
 * policy in the future only requires touching one file.
 *
 * The rule itself is deliberately modest — 8+ characters, at least one
 * letter and one digit — rather than requiring symbols/mixed-case, which
 * tends to push users toward predictable substitutions (e.g. "Password1!")
 * without meaningfully raising entropy.
 */
public final class PasswordPolicy {

    private static final int MIN_LENGTH = 8;

    private PasswordPolicy() {
    }

    /**
     * @return null if the password satisfies the policy, otherwise a
     *         user-facing message describing what's missing.
     */
    public static String validate(String password) {
        if (password == null || password.length() < MIN_LENGTH) {
            return "Password must be at least " + MIN_LENGTH + " characters.";
        }
        boolean hasLetter = password.chars().anyMatch(Character::isLetter);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);
        if (!hasLetter || !hasDigit) {
            return "Password must contain at least one letter and one number.";
        }
        return null;
    }

    public static boolean isValid(String password) {
        return validate(password) == null;
    }
}
package com.ideaspark.util;

import java.time.ZoneId;
import java.time.ZonedDateTime;

/**
 * Single source of truth for "is it currently the monthly payout
 * lock window?" — 13th 8:00 PM IST through 20th 12:00 AM IST.
 *
 * WHY THIS EXISTS:
 * PayoutAccount.payoutLocked is a stored boolean, flipped by two
 * scheduled jobs (PayoutSetupReminderJob.lockPayoutDetails() /
 * unlockPayoutDetails()). A stored flag like that can get stuck —
 * a stray test run of the lock job, a missed cron due to a deploy,
 * a bug in an earlier release — and once it's stuck true, creators
 * stay locked out indefinitely with nothing to correct it, even
 * though the calendar says it isn't the lock window at all.
 *
 * The fix is to never trust the stored flag by itself. Every read
 * path should compute:
 *
 *     effectivelyLocked = storedFlag && isWithinLockWindow(now)
 *
 * This makes the lock self-healing: the moment "now" moves outside
 * the real window, accounts unlock automatically regardless of
 * what's sitting in the database, and admins can still force an
 * early unlock inside the window by clearing the stored flag (the
 * scheduled lock job will set it true again next cycle).
 */
public final class PayoutLockWindow {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    private PayoutLockWindow() {
    }

    /** True if right now (IST) falls inside the lock window. */
    public static boolean isWithinLockWindow() {
        return isWithinLockWindow(ZonedDateTime.now(IST));
    }

    /**
     * True if the given IST instant falls inside the lock window
     * for its own month: 13th 20:00:00 (inclusive) through
     * 20th 00:00:00 (exclusive).
     */
    public static boolean isWithinLockWindow(ZonedDateTime nowIst) {
        ZonedDateTime lockStart = nowIst
                .withDayOfMonth(13)
                .withHour(20).withMinute(0).withSecond(0).withNano(0);

        ZonedDateTime lockEnd = nowIst
                .withDayOfMonth(20)
                .withHour(0).withMinute(0).withSecond(0).withNano(0);

        return !nowIst.isBefore(lockStart) && nowIst.isBefore(lockEnd);
    }

    /**
     * Combines the stored per-account flag with the real-time window
     * check. Use this everywhere "is this account locked?" matters —
     * never read PayoutAccount.getPayoutLocked() directly.
     */
    public static boolean isEffectivelyLocked(Boolean storedFlag) {
        return Boolean.TRUE.equals(storedFlag) && isWithinLockWindow();
    }
}

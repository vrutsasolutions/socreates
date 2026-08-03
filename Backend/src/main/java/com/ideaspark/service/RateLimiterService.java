package com.ideaspark.service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimiterService {

    private static final Logger log = LoggerFactory.getLogger(RateLimiterService.class);

    // Every map below used to store a bare Bucket keyed by email/user and
    // was NEVER evicted — a bucket created for a one-time visitor (a single
    // OTP send, one failed login) stayed in memory for the life of the JVM.
    // On a growing user base that's an unbounded, slow leak. Buckets are now
    // wrapped in TrackedBucket so cleanupIdleBuckets() (below) can sweep out
    // anything that hasn't been touched in a while; the tryConsume/refill
    // behaviour of each bucket is completely unchanged.
    private final ConcurrentHashMap<String, TrackedBucket> sendBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, TrackedBucket> verifyBuckets = new ConcurrentHashMap<>();
    // Separate buckets for the forgot-password flow so a user mid-signup
    // (register-OTP) and a user mid-reset (forgot-password-OTP) never share
    // or exhaust each other's quota for the same email.
    private final ConcurrentHashMap<String, TrackedBucket> forgotPasswordSendBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, TrackedBucket> forgotPasswordVerifyBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, TrackedBucket> aiRefineBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, TrackedBucket> aiChatBuckets = new ConcurrentHashMap<>();
    // Password-login attempts. Kept separate from the OTP buckets above —
    // this is the plain email+password flow in AuthService#login, which
    // previously had NO brute-force protection at all (only the OTP-based
    // register/forgot-password flows did).
    private final ConcurrentHashMap<String, TrackedBucket> loginBuckets = new ConcurrentHashMap<>();
    // Plagiarism checks — each call does a full cosine-similarity scan
    // against every idea in the DB, so it's expensive per-call as well as
    // per-account. Capped like the AI endpoints below.
    private final ConcurrentHashMap<String, TrackedBucket> plagiarismBuckets = new ConcurrentHashMap<>();

    // The longest bandwidth window in use anywhere in this class is 1 day
    // (the AI/plagiarism buckets). An entry idle for longer than that has
    // necessarily refilled to full capacity anyway, so dropping it changes
    // no caller's observable behaviour — the next call just recreates it
    // fresh, at full capacity, which is exactly the state it was already in.
    // The extra day on top is just breathing room, not a correctness
    // requirement.
    private static final Duration IDLE_TTL = Duration.ofDays(2);

    /** A Bucket plus the wall-clock time it was last touched, so idle entries can be swept. */
    private static final class TrackedBucket {
        final Bucket bucket;
        volatile long lastAccessMillis;

        TrackedBucket(Bucket bucket) {
            this.bucket = bucket;
            this.lastAccessMillis = System.currentTimeMillis();
        }
    }

    // Shared by every allow*() method below: get-or-create the bucket for
    // `key` in `map` (using `bandwidth` only on first creation), stamp it as
    // just-used, and consume one token.
    private boolean consume(ConcurrentHashMap<String, TrackedBucket> map, String key, Bandwidth bandwidth) {
        TrackedBucket tracked = map.computeIfAbsent(key, k ->
                new TrackedBucket(Bucket.builder().addLimit(bandwidth).build()));
        tracked.lastAccessMillis = System.currentTimeMillis();
        return tracked.bucket.tryConsume(1);
    }

    // Max 3 OTP sends per email per 15 minutes
    public boolean allowSend(String email) {
        return consume(sendBuckets, email, Bandwidth.builder()
                .capacity(3)
                .refillIntervally(3, Duration.ofMinutes(15))
                .build());
    }

    // Max 10 verify attempts per email per 15 minutes
    public boolean allowVerify(String email) {
        return consume(verifyBuckets, email, Bandwidth.builder()
                .capacity(10)
                .refillIntervally(10, Duration.ofMinutes(15))
                .build());
    }

    // Max 3 forgot-password OTP sends per email per 15 minutes — same limit as
    // registration; also stops the endpoint being used to email-bomb a victim.
    public boolean allowForgotPasswordSend(String email) {
        return consume(forgotPasswordSendBuckets, email, Bandwidth.builder()
                .capacity(3)
                .refillIntervally(3, Duration.ofMinutes(15))
                .build());
    }

    // Max 10 forgot-password verify attempts per email per 15 minutes — this
    // is what actually closes the gap: without it, a caller could keep
    // requesting fresh OTPs (bypassing the per-OTP 5-attempt cap in
    // OtpService) and get unlimited guesses against the reset flow.
    public boolean allowForgotPasswordVerify(String email) {
        return consume(forgotPasswordVerifyBuckets, email, Bandwidth.builder()
                .capacity(10)
                .refillIntervally(10, Duration.ofMinutes(15))
                .build());
    }

    // Max 20 AI refine/enhance calls per user per day — caps Groq spend per user
    public boolean allowAiRefine(String userKey) {
        return consume(aiRefineBuckets, userKey, Bandwidth.builder()
                .capacity(20)
                .refillIntervally(20, Duration.ofDays(1))
                .build());
    }

    // Max 30 AI chat messages per user per day — caps Groq spend per user
    public boolean allowAiChat(String userKey) {
        return consume(aiChatBuckets, userKey, Bandwidth.builder()
                .capacity(30)
                .refillIntervally(30, Duration.ofDays(1))
                .build());
    }

    // Max 5 login attempts per email per 15 minutes. Deliberately keyed on
    // the (normalized, lowercased) email from the request body rather than
    // caller IP — the account being guessed matters more than where the
    // guesses come from, and this mirrors the OTP buckets above. Applies
    // regardless of whether the password turns out right or wrong, so it
    // also caps damage from a compromised/leaked password being replayed.
    public boolean allowLogin(String email) {
        return consume(loginBuckets, email, Bandwidth.builder()
                .capacity(5)
                .refillIntervally(5, Duration.ofMinutes(15))
                .build());
    }

    // Max 20 plagiarism checks per user per day — same cap as AI
    // refine/enhance, since a full scan against every idea in the DB is
    // comparably expensive and this now runs once per idea-submission
    // attempt from a logged-in user.
    public boolean allowPlagiarismCheck(String userKey) {
        return consume(plagiarismBuckets, userKey, Bandwidth.builder()
                .capacity(20)
                .refillIntervally(20, Duration.ofDays(1))
                .build());
    }

    // Runs once an hour. This is what actually bounds memory — without it,
    // every one of the maps above grows by one entry per distinct
    // email/user forever and nothing ever comes back out, even long after
    // that account stops being active. Safe to run concurrently with
    // consume() above: ConcurrentHashMap.entrySet().removeIf() is
    // thread-safe, and worst case a bucket gets evicted moments after being
    // touched, which just means the next call recreates it — no different
    // from a cold start.
    @Scheduled(cron = "0 0 * * * *")
    public void cleanupIdleBuckets() {
        long cutoffMillis = System.currentTimeMillis() - IDLE_TTL.toMillis();

        int removed = 0;
        removed += evictIdle(sendBuckets, cutoffMillis);
        removed += evictIdle(verifyBuckets, cutoffMillis);
        removed += evictIdle(forgotPasswordSendBuckets, cutoffMillis);
        removed += evictIdle(forgotPasswordVerifyBuckets, cutoffMillis);
        removed += evictIdle(aiRefineBuckets, cutoffMillis);
        removed += evictIdle(aiChatBuckets, cutoffMillis);
        removed += evictIdle(loginBuckets, cutoffMillis);
        removed += evictIdle(plagiarismBuckets, cutoffMillis);

        if (removed > 0) {
            log.debug("RateLimiterService: evicted {} idle rate-limit bucket(s)", removed);
        }
    }

    private int evictIdle(ConcurrentHashMap<String, TrackedBucket> map, long cutoffMillis) {
        int before = map.size();
        map.entrySet().removeIf(entry -> entry.getValue().lastAccessMillis < cutoffMillis);
        return before - map.size();
    }
}
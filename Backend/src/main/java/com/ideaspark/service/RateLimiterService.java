package com.ideaspark.service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimiterService {

    private final ConcurrentHashMap<String, Bucket> sendBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> verifyBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> aiRefineBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> aiChatBuckets = new ConcurrentHashMap<>();

    // Max 3 OTP sends per email per 15 minutes
    public boolean allowSend(String email) {
        Bucket bucket = sendBuckets.computeIfAbsent(email, k ->
                Bucket.builder()
                        .addLimit(Bandwidth.builder()
                                .capacity(3)
                                .refillIntervally(3, Duration.ofMinutes(15))
                                .build())
                        .build());
        return bucket.tryConsume(1);
    }

    // Max 10 verify attempts per email per 15 minutes
    public boolean allowVerify(String email) {
        Bucket bucket = verifyBuckets.computeIfAbsent(email, k ->
                Bucket.builder()
                        .addLimit(Bandwidth.builder()
                                .capacity(10)
                                .refillIntervally(10, Duration.ofMinutes(15))
                                .build())
                        .build());
        return bucket.tryConsume(1);
    }

    // Max 20 AI refine/enhance calls per user per day — caps Groq spend per user
    public boolean allowAiRefine(String userKey) {
        Bucket bucket = aiRefineBuckets.computeIfAbsent(userKey, k ->
                Bucket.builder()
                        .addLimit(Bandwidth.builder()
                                .capacity(20)
                                .refillIntervally(20, Duration.ofDays(1))
                                .build())
                        .build());
        return bucket.tryConsume(1);
    }

    // Max 30 AI chat messages per user per day — caps Groq spend per user
    public boolean allowAiChat(String userKey) {
        Bucket bucket = aiChatBuckets.computeIfAbsent(userKey, k ->
                Bucket.builder()
                        .addLimit(Bandwidth.builder()
                                .capacity(30)
                                .refillIntervally(30, Duration.ofDays(1))
                                .build())
                        .build());
        return bucket.tryConsume(1);
    }
}
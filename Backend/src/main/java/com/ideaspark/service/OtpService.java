package com.ideaspark.service;

import com.ideaspark.model.EmailOtp;
import com.ideaspark.repository.EmailOtpRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class OtpService {

    private final EmailOtpRepository emailOtpRepository;

    // Short-lived tokens issued after a successful OTP verification, required to
    // actually reset the password (so /forgot-password/reset can't be called blind).
    private final Map<String, String> resetTokens = new ConcurrentHashMap<>();
    private final Map<String, LocalDateTime> resetTokenExpiry = new ConcurrentHashMap<>();

    private static final int OTP_EXPIRY_MINUTES = 10;
    private static final int RESET_TOKEN_EXPIRY_MINUTES = 15;

    public String generateOtp(String email) {
        return generateOtp(email, "REGISTER");
    }

    public String generateOtp(String email, String purpose) {
        email = email.trim().toLowerCase();

        String otp = String.format("%06d", new Random().nextInt(999999));
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES);

        EmailOtp emailOtp = EmailOtp.builder()
                .email(email)
                .otpCode(otp)
                .otpExpiresAt(expiry)
                .purpose(purpose)
                .verified(false)
                .build();

        emailOtpRepository.save(emailOtp);

        return otp;
    }

    public boolean validateOtp(String email, String otp) {
        return validateOtp(email, otp, "REGISTER");
    }

    public boolean validateOtp(String email, String otp, String purpose) {
        email = email.trim().toLowerCase();

        var otpRecordOpt = emailOtpRepository
                .findTopByEmailAndPurposeOrderByCreatedAtDesc(email, purpose);

        if (otpRecordOpt.isEmpty()) {
            return false;
        }

        EmailOtp otpRecord = otpRecordOpt.get();

        if (otpRecord.isVerified()) {
            return false;
        }

        if (LocalDateTime.now().isAfter(otpRecord.getOtpExpiresAt())) {
            return false;
        }

        if (!otpRecord.getOtpCode().equals(otp)) {
            return false;
        }

        otpRecord.setVerified(true);
        emailOtpRepository.save(otpRecord);

        return true;
    }

    public boolean hasOtp(String email) {
        return emailOtpRepository
                .findTopByEmailAndPurposeOrderByCreatedAtDesc(
                        email.trim().toLowerCase(),
                        "REGISTER"
                )
                .isPresent();
    }

    // ── Password-reset tokens ────────────────────────────────────────────────
    public String generateResetToken(String email) {
        String key = email.trim().toLowerCase();
        String token = UUID.randomUUID().toString();
        resetTokens.put(key, token);
        resetTokenExpiry.put(key, LocalDateTime.now().plusMinutes(RESET_TOKEN_EXPIRY_MINUTES));
        return token;
    }

    // Validates and consumes a reset token (single use).
    public boolean validateResetToken(String email, String token) {
        String key = email.trim().toLowerCase();
        String stored = resetTokens.get(key);
        LocalDateTime expiry = resetTokenExpiry.get(key);

        if (stored == null || expiry == null || token == null) {
            return false;
        }
        if (LocalDateTime.now().isAfter(expiry)) {
            resetTokens.remove(key);
            resetTokenExpiry.remove(key);
            return false;
        }
        if (!stored.equals(token)) {
            return false;
        }
        resetTokens.remove(key);
        resetTokenExpiry.remove(key);
        return true;
    }
}

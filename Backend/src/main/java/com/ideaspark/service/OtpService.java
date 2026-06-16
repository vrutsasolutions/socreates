package com.ideaspark.service;

import com.ideaspark.model.EmailOtp;
import com.ideaspark.repository.EmailOtpRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class OtpService {

    private final EmailOtpRepository emailOtpRepository;

    private static final int OTP_EXPIRY_MINUTES = 10;

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
}

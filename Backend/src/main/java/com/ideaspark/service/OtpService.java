package com.ideaspark.service;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {

    private final Map<String, String> otpStore=new ConcurrentHashMap<>();
    private final Map<String,LocalDateTime> otpExpiry=new ConcurrentHashMap<>();

    // Short-lived tokens issued after a successful OTP verification, required to
    // actually reset the password (so /forgot-password/reset can't be called blind).
    private final Map<String,String> resetTokens=new ConcurrentHashMap<>();
    private final Map<String,LocalDateTime> resetTokenExpiry=new ConcurrentHashMap<>();

    private static final int OTP_EXPIRY_MINUTES=10;
    private static final int RESET_TOKEN_EXPIRY_MINUTES=15;

    public String generateOtp(String email){
        String otp=String.format("%06d",new Random().nextInt(999999));
        otpStore.put(email,otp);
        otpExpiry.put(email,LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES));
        return otp;
    }

    public boolean validateOtp(String email,String otp){
        String storedOtp=otpStore.get(email);
        LocalDateTime expiry=otpExpiry.get(email);

        if(storedOtp==null || expiry==null){
            return false;
        }
        if(LocalDateTime.now().isAfter(expiry)){
            otpStore.remove(email);
            otpExpiry.remove(email);
            return false;
        }

        if(!storedOtp.equals(otp)){
            return false;
        }
        otpStore.remove(email);
        otpExpiry.remove(email);
        return true;

    }
    public boolean hasOtp(String email){
        return otpStore.containsKey(email);
    }

    // ── Password-reset tokens ────────────────────────────────────────────────
    public String generateResetToken(String email){
        String token=UUID.randomUUID().toString();
        resetTokens.put(email,token);
        resetTokenExpiry.put(email,LocalDateTime.now().plusMinutes(RESET_TOKEN_EXPIRY_MINUTES));
        return token;
    }

    // Validates and consumes a reset token (single use).
    public boolean validateResetToken(String email,String token){
        String stored=resetTokens.get(email);
        LocalDateTime expiry=resetTokenExpiry.get(email);

        if(stored==null || expiry==null || token==null){
            return false;
        }
        if(LocalDateTime.now().isAfter(expiry)){
            resetTokens.remove(email);
            resetTokenExpiry.remove(email);
            return false;
        }
        if(!stored.equals(token)){
            return false;
        }
        resetTokens.remove(email);
        resetTokenExpiry.remove(email);
        return true;
    }
}

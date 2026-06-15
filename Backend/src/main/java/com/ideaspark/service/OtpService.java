package com.ideaspark.service;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {

    private final Map<String, String> otpStore=new ConcurrentHashMap<>();
    private final Map<String,LocalDateTime> otpExpiry=new ConcurrentHashMap<>();

    private static final int OTP_EXPIRY_MINUTES=10;

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
    
}

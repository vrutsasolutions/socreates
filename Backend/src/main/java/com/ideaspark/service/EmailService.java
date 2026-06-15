package com.ideaspark.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    // Send OTP email for registration
    public void sendOtpEmail(String toEmail, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("your_gmail@gmail.com", "SoCreates");
            helper.setTo(toEmail);
            helper.setSubject("Your OTP Verification Code — SoCreates");
            helper.setText(buildOtpEmailHtml(otp), true); // true = HTML

            mailSender.send(message);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            throw new RuntimeException("Failed to send OTP email: " + e.getMessage());
        }
    }

    // Send OTP email for forgot password
    public void sendPasswordResetEmail(String toEmail, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("your_gmail@gmail.com", "SoCreates");
            helper.setTo(toEmail);
            helper.setSubject("Password Reset OTP — SoCreates");
            helper.setText(buildPasswordResetHtml(otp), true); // true = HTML

            mailSender.send(message);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            throw new RuntimeException("Failed to send password reset email: " + e.getMessage());
        }
    }

    // HTML template for OTP email
    private String buildOtpEmailHtml(String otp) {
        return """
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border-radius: 12px; background: #f4f7ff;">
                    <h2 style="color: #1565C0;">SoCreates</h2>
                    <p style="color: #333;">Hello,</p>
                    <p style="color: #333;">Your OTP for email verification is:</p>
                    <div style="text-align: center; margin: 24px 0;">
                        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1565C0; background: #fff; padding: 16px 32px; border-radius: 8px; border: 2px dashed #1565C0;">
                            %s
                        </span>
                    </div>
                    <p style="color: #666;">This OTP is valid for <strong>5 minutes</strong>.</p>
                    <p style="color: #666;">Do not share this code with anyone.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
                    <p style="color: #999; font-size: 12px;">If you did not request this, please ignore this email.</p>
                    <p style="color: #999; font-size: 12px;">— Team SoCreates</p>
                </div>
                """.formatted(otp);
    }

    // HTML template for password reset email
    private String buildPasswordResetHtml(String otp) {
        return """
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border-radius: 12px; background: #f4f7ff;">
                    <h2 style="color: #1565C0;">SoCreates</h2>
                    <p style="color: #333;">Hello,</p>
                    <p style="color: #333;">Your OTP for password reset is:</p>
                    <div style="text-align: center; margin: 24px 0;">
                        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1565C0; background: #fff; padding: 16px 32px; border-radius: 8px; border: 2px dashed #1565C0;">
                            %s
                        </span>
                    </div>
                    <p style="color: #666;">This OTP is valid for <strong>5 minutes</strong>.</p>
                    <p style="color: #666;">Do not share this code with anyone.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
                    <p style="color: #999; font-size: 12px;">If you did not request this, please ignore this email.</p>
                    <p style="color: #999; font-size: 12px;">— Team SoCreates</p>
                </div>
                """.formatted(otp);
    }
}


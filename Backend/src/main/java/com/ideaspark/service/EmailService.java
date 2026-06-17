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
                """
                .formatted(otp);
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
                """
                .formatted(otp);
    }

    public void sendNewIdeaNotificationEmail(
        String toEmail,
        String creatorName,
        String ideaTitle,
        String ideaDescription,
        String category,
        java.util.UUID ideaId
) {
    try {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom("your_gmail@gmail.com", "SoCreates");
        helper.setTo(toEmail);
        helper.setSubject("New Idea from " + creatorName);

        String shortDescription = ideaDescription != null && ideaDescription.length() > 160
                ? ideaDescription.substring(0, 160) + "..."
                : ideaDescription;

        String body = """
                <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 28px; border-radius: 14px; background: #f4f7ff;">
                    <h2 style="color: #1565C0;">New Idea Posted</h2>

                    <p><strong>%s</strong> posted a new idea on SoCreates.</p>

                    <p style="font-size: 13px; color: #1565C0; font-weight: bold;">
                        Category: %s
                    </p>

                    <h3 style="color:#0D2137;">%s</h3>

                    <p style="color:#455A64; line-height:1.5;">
                        %s
                    </p>

                    <p>
                        <a href="http://localhost:5173/ideas/%s"
                           style="background:#1565C0;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;display:inline-block;">
                           View Idea on SoCreates
                        </a>
                    </p>

                    <p style="color:#777;font-size:12px;">
                        You received this email because you follow %s.
                    </p>

                    <p style="color:#999;font-size:12px;">— Team SoCreates</p>
                </div>
                """.formatted(
                creatorName,
                category != null ? category : "General",
                ideaTitle,
                shortDescription != null ? shortDescription : "",
                ideaId,
                creatorName
        );

        helper.setText(body, true);
        mailSender.send(message);

    } catch (Exception e) {
        System.out.println("New idea email failed: " + e.getMessage());
    }
}
    public void sendMilestoneEmail(String toEmail, long count, String type) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("your_gmail@gmail.com", "SoCreates");
            helper.setTo(toEmail);
            helper.setSubject("🎉 Congratulations! You reached " + count + " " + type);

            String body = """
                    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 28px; border-radius: 14px; background: #f4f7ff;">
                        <h2 style="color:#1565C0;">Congratulations!</h2>
                        <p>You reached <strong>%s %s</strong> on SoCreates.</p>
                        <p>Keep sharing amazing ideas with the community.</p>
                        <p style="color:#999;font-size:12px;">— Team SoCreates</p>
                    </div>
                    """
                    .formatted(count, type);

            helper.setText(body, true);
            mailSender.send(message);

        } catch (Exception e) {
            System.out.println("Milestone email failed: " + e.getMessage());
        }
    }
}

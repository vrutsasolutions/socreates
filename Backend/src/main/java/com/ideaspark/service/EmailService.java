package com.ideaspark.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Async;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    // Send OTP email for registration
    public void sendOtpEmail(String toEmail, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("your_gmail@gmail.com", "SoCreate");
            helper.setTo(toEmail);
            helper.setSubject("Your OTP Verification Code — SoCreate");
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

            helper.setFrom("your_gmail@gmail.com", "SoCreate");
            helper.setTo(toEmail);
            helper.setSubject("Password Reset OTP — SoCreate");
            helper.setText(buildPasswordResetHtml(otp), true); // true = HTML

            mailSender.send(message);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            throw new RuntimeException("Failed to send password reset email: " + e.getMessage());
        }
    }

    // HTML template for OTP email
    private String buildOtpEmailHtml(String otp) {
        return """
                <div style="font-family: Arial, sans-serif; max-width: 480px; width: 100%%; margin: auto; padding: 32px 20px; border-radius: 12px; background: #f4f7ff; box-sizing: border-box;">
                    <style>
                        @media only screen and (max-width: 480px) {
                            .otp-badge { font-size: 26px !important; letter-spacing: 4px !important; padding: 12px 8px !important; }
                        }
                    </style>
                    <h2 style="color: #1565C0;">SoCreate</h2>
                    <p style="color: #333;">Hello,</p>
                    <p style="color: #333;">Your OTP for email verification is:</p>
                    <div style="text-align: center; margin: 24px 0;">
                        <table role="presentation" align="center" style="margin: 0 auto; border-collapse: collapse;">
                            <tr>
                                <td class="otp-badge" style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1565C0; background: #fff; padding: 16px 20px; border-radius: 8px; border: 2px dashed #1565C0; white-space: nowrap; font-family: 'Courier New', monospace;">
                                    %s
                                </td>
                            </tr>
                        </table>
                    </div>
                    <p style="color: #666;">This OTP is valid for <strong>5 minutes</strong>.</p>
                    <p style="color: #666;">Do not share this code with anyone.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
                    <p style="color: #999; font-size: 12px;">If you did not request this, please ignore this email.</p>
                    <p style="color: #999; font-size: 12px;">— Team SoCreate</p>
                </div>
                """
                .formatted(otp);
    }

    // HTML template for password reset email
    private String buildPasswordResetHtml(String otp) {
        return """
                <div style="font-family: Arial, sans-serif; max-width: 480px; width: 100%%; margin: auto; padding: 32px 20px; border-radius: 12px; background: #f4f7ff; box-sizing: border-box;">
                    <style>
                        @media only screen and (max-width: 480px) {
                            .otp-badge { font-size: 26px !important; letter-spacing: 4px !important; padding: 12px 8px !important; }
                        }
                    </style>
                    <h2 style="color: #1565C0;">SoCreate</h2>
                    <p style="color: #333;">Hello,</p>
                    <p style="color: #333;">Your OTP for password reset is:</p>
                    <div style="text-align: center; margin: 24px 0;">
                        <table role="presentation" align="center" style="margin: 0 auto; border-collapse: collapse;">
                            <tr>
                                <td class="otp-badge" style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1565C0; background: #fff; padding: 16px 20px; border-radius: 8px; border: 2px dashed #1565C0; white-space: nowrap; font-family: 'Courier New', monospace;">
                                    %s
                                </td>
                            </tr>
                        </table>
                    </div>
                    <p style="color: #666;">This OTP is valid for <strong>5 minutes</strong>.</p>
                    <p style="color: #666;">Do not share this code with anyone.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
                    <p style="color: #999; font-size: 12px;">If you did not request this, please ignore this email.</p>
                    <p style="color: #999; font-size: 12px;">— Team SoCreate</p>
                </div>
                """
                .formatted(otp);
    }

    @Async
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

        helper.setFrom("your_gmail@gmail.com", "SoCreate");
        helper.setTo(toEmail);
        helper.setSubject("New Idea from " + creatorName);

        String shortDescription = ideaDescription != null && ideaDescription.length() > 160
                ? ideaDescription.substring(0, 160) + "..."
                : ideaDescription;

        String body = """
                <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 28px; border-radius: 14px; background: #f4f7ff;">
                    <h2 style="color: #1565C0;">New Idea Posted</h2>

                    <p><strong>%s</strong> posted a new idea on SoCreate.</p>

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
                           View Idea on SoCreate
                        </a>
                    </p>

                    <p style="color:#777;font-size:12px;">
                        You received this email because you follow %s.
                    </p>

                    <p style="color:#999;font-size:12px;">— Team SoCreate</p>
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
    // ── Milestone: likes on an idea ──────────────────────────────────────────
    public void sendLikeMilestoneEmail(String toEmail, String creatorName,
                                       String ideaTitle, int likeCount) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("vrutsasolutions@gmail.com", "SoCreate");
            helper.setTo(toEmail);
            helper.setSubject("Congratulations! Your idea just hit " + likeCount + " likes on SoCreate");
            helper.setText(buildLikeMilestoneHtml(creatorName, ideaTitle, likeCount), true);

            mailSender.send(message);
            System.out.println("Like milestone email sent to: " + toEmail);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            System.out.println("Like milestone email failed: " + e.getMessage());
        }
    }

    // ── Milestone: followers ─────────────────────────────────────────────────
    public void sendFollowerMilestoneEmail(String toEmail, String userName,
                                           long followerCount) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("vrutsasolutions@gmail.com", "SoCreate");
            helper.setTo(toEmail);
            helper.setSubject("Congratulations! You just hit " + followerCount + " followers on SoCreate");
            helper.setText(buildFollowerMilestoneHtml(userName, followerCount), true);

            mailSender.send(message);
            System.out.println("Follower milestone email sent to: " + toEmail);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            System.out.println("Follower milestone email failed: " + e.getMessage());
        }
    }

    // HTML template for like milestone
    private String buildLikeMilestoneHtml(String creatorName, String ideaTitle, int likeCount) {
        return """
                <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(21,101,192,0.12);">

                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #1565C0 0%%, #1976D2 60%%, #42A5F5 100%%); padding: 40px 32px 32px; text-align: center;">
                    <div style="width: 56px; height: 56px; margin: 0 auto 16px; background: rgba(255,255,255,0.15); border-radius: 50%%; display: flex; align-items: center; justify-content: center;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                    </div>
                    <h1 style="color: #fff; margin: 0; font-size: 26px; font-weight: 800;">Milestone Reached!</h1>
                    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 15px;">Your idea is making an impact</p>
                  </div>

                  <!-- Body -->
                  <div style="background: #f4f7ff; padding: 32px;">
                    <p style="color: #333; font-size: 16px; margin: 0 0 16px;">Hi <strong>%s</strong>,</p>
                    <p style="color: #444; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                      Great news! Your idea <strong style="color: #1565C0;">"%s"</strong> has reached a new milestone on SoCreate.
                    </p>

                    <!-- Count badge -->
                    <div style="text-align: center; margin: 0 0 28px;">
                      <div style="display: inline-block; background: #fff; border: 2px solid #1565C0; border-radius: 12px; padding: 20px 48px;">
                        <div style="font-size: 48px; font-weight: 900; color: #1565C0; line-height: 1;">%,d</div>
                        <div style="font-size: 13px; color: #888; margin-top: 6px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600;">Likes</div>
                      </div>
                    </div>

                    <p style="color: #444; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
                      The SoCreate community is responding to your idea. Keep sharing and inspiring others.
                    </p>

                    <div style="text-align: center;">
                      <a href="http://localhost:5173/home"
                         style="display: inline-block; background: #1565C0; color: #fff; text-decoration: none;
                                padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 700;">
                        View Your Idea
                      </a>
                    </div>
                  </div>

                  <!-- Footer -->
                  <div style="background: #e8edf7; padding: 20px 32px; text-align: center;">
                    <p style="color: #999; font-size: 12px; margin: 0;">— Team SoCreate | Keep creating, keep inspiring</p>
                  </div>

                </div>
                """.formatted(creatorName, ideaTitle, likeCount);
    }

    // HTML template for follower milestone
    private String buildFollowerMilestoneHtml(String userName, long followerCount) {
        return """
                <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(21,101,192,0.12);">

                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #1565C0 0%%, #7B1FA2 60%%, #9C27B0 100%%); padding: 40px 32px 32px; text-align: center;">
                    <div style="width: 56px; height: 56px; margin: 0 auto 16px; background: rgba(255,255,255,0.15); border-radius: 50%%; display: flex; align-items: center; justify-content: center;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                    </div>
                    <h1 style="color: #fff; margin: 0; font-size: 26px; font-weight: 800;">Milestone Reached!</h1>
                    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 15px;">Your community is growing</p>
                  </div>

                  <!-- Body -->
                  <div style="background: #f4f7ff; padding: 32px;">
                    <p style="color: #333; font-size: 16px; margin: 0 0 16px;">Hi <strong>%s</strong>,</p>
                    <p style="color: #444; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                      Congratulations! You have reached a new follower milestone on SoCreate.
                    </p>

                    <!-- Count badge -->
                    <div style="text-align: center; margin: 0 0 28px;">
                      <div style="display: inline-block; background: #fff; border: 2px solid #7B1FA2; border-radius: 12px; padding: 20px 48px;">
                        <div style="font-size: 48px; font-weight: 900; color: #7B1FA2; line-height: 1;">%,d</div>
                        <div style="font-size: 13px; color: #888; margin-top: 6px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600;">Followers</div>
                      </div>
                    </div>

                    <p style="color: #444; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
                      Every follower is someone who believes in your ideas and your voice. Thank you for being part of the SoCreate community.
                    </p>

                    <div style="text-align: center;">
                      <a href="http://localhost:5173/profile"
                         style="display: inline-block; background: #7B1FA2; color: #fff; text-decoration: none;
                                padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 700;">
                        View Your Profile
                      </a>
                    </div>
                  </div>

                  <!-- Footer -->
                  <div style="background: #e8edf7; padding: 20px 32px; text-align: center;">
                    <p style="color: #999; font-size: 12px; margin: 0;">— Team SoCreate | Keep creating, keep inspiring</p>
                  </div>

                </div>
                """.formatted(userName, followerCount);
    }
}

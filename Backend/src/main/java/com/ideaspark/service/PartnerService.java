package com.ideaspark.service;

import com.ideaspark.dto.PartnerApplicationRequest;
import com.ideaspark.dto.PartnerApplicationResponse;
import com.ideaspark.model.Membership;
import com.ideaspark.model.Notification;
import com.ideaspark.model.PartnerApplication;
import com.ideaspark.model.User;
import com.ideaspark.repository.MembershipRepository;
import com.ideaspark.repository.PartnerApplicationRepository;
import com.ideaspark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PartnerService {

    private final PartnerApplicationRepository applicationRepo;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final NotificationService notificationService;

    // ── Submit a new application ────────────────────────────────────────
    @Transactional
    public PartnerApplicationResponse submit(PartnerApplicationRequest req, String loggedInEmail) {

        // Prevent duplicate applications
        if (applicationRepo.existsByEmailAndStatusIn(req.getEmail(), List.of("pending", "approved"))) {
            throw new IllegalStateException("An application for this email already exists");
        }

        // Age gate
        if ("under_18".equals(req.getAgeGroup())) {
            throw new IllegalArgumentException("This program is open to participants aged 18 and above");
        }

        // Consent is mandatory
        if (req.getConsentProgram() == null || !req.getConsentProgram()) {
            throw new IllegalArgumentException("Program consent is required");
        }

        // Link to existing SoCreate user if logged in
        User user = null;
        if (loggedInEmail != null) {
            user = userRepository.findByEmail(loggedInEmail).orElse(null);
        }

        // Free days: 30 for everyone (students and professionals alike).
        int freeDays = 30;

        PartnerApplication app = PartnerApplication.builder()
                .user(user)
                .fullName(req.getFullName())
                .email(req.getEmail())
                .mobileNumber(req.getMobileNumber())
                .city(req.getCity())
                .ageGroup(req.getAgeGroup())
                .participantType(req.getParticipantType())
                // Student fields
                .collegeName(req.getCollegeName())
                .courseDegree(req.getCourseDegree())
                .currentYear(req.getCurrentYear())
                .graduationYear(req.getGraduationYear())
                // Professional fields
                .jobTitle(req.getJobTitle())
                .companyOrganisation(req.getCompanyOrganisation())
                .industry(req.getIndustry())
                .yearsOfExperience(req.getYearsOfExperience())
                // About you
                .alreadyRegistered(req.getAlreadyRegistered())
                .usagePurpose(req.getUsagePurpose())
                .bestDescribes(req.getBestDescribes())
                .heardFrom(req.getHeardFrom())
                .partnerOrgName(req.getPartnerOrgName())
                // Subscription choice
                .subscriptionChoice(req.getSubscriptionChoice())
                // Consent
                .consentProgram(req.getConsentProgram())
                .consentUpdates(req.getConsentUpdates() != null && req.getConsentUpdates())
                .consentFuturePrograms(req.getConsentFuturePrograms() != null && req.getConsentFuturePrograms())
                // State
                .status("pending")
                .queuePosition(applicationRepo.nextQueuePosition())
                .freeDays(freeDays)
                .build();

        app = applicationRepo.save(app);
        log.info("Partner application submitted: {} (queue #{})", app.getEmail(), app.getQueuePosition());
        return toResponse(app);
    }

    // ── Get current user's application status ───────────────────────────
    public PartnerApplicationResponse getMyApplication(String email) {
        return applicationRepo.findByEmail(email)
                .map(this::toResponse)
                .orElse(null);
    }

    // ── Admin: list pending applications ────────────────────────────────
    public List<PartnerApplicationResponse> listPending() {
        return applicationRepo.findByStatusOrderByQueuePositionAsc("pending")
                .stream().map(this::toResponse).toList();
    }

    // ── Admin: approve an application ───────────────────────────────────
    @Transactional
    public PartnerApplicationResponse approve(UUID applicationId, String adminEmail) {
        PartnerApplication app = applicationRepo.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found"));

        if (!"pending".equals(app.getStatus())) {
            throw new IllegalStateException("Application is already " + app.getStatus());
        }

        app.setStatus("approved");
        app.setReviewedBy(adminEmail);
        app.setReviewedAt(LocalDateTime.now());
        applicationRepo.save(app);

        // Grant the free subscription
        grantPartnerSubscription(app);

        log.info("Partner application approved: {} by {}", app.getEmail(), adminEmail);
        return toResponse(app);
    }

    // ── Admin: approve ALL pending applications in one action ────────────
    @Transactional
    public int approveAll(String adminEmail) {
        List<PartnerApplication> pending =
                applicationRepo.findByStatusOrderByQueuePositionAsc("pending");

        if (pending.isEmpty()) return 0;

        LocalDateTime now = LocalDateTime.now();
        for (PartnerApplication app : pending) {
            app.setStatus("approved");
            app.setReviewedBy(adminEmail);
            app.setReviewedAt(now);
        }
        applicationRepo.saveAll(pending);

        // Grant memberships + notifications outside the status-update loop
        // so a single grant failure doesn't roll back the whole batch.
        int granted = 0;
        for (PartnerApplication app : pending) {
            try {
                grantPartnerSubscription(app);
                granted++;
            } catch (Exception e) {
                log.error("Failed to grant subscription for {}: {}",
                        app.getEmail(), e.getMessage());
            }
        }

        log.info("Bulk-approved {} partner applications ({} subscriptions granted) by {}",
                pending.size(), granted, adminEmail);
        return pending.size();
    }

    // ── Admin: reject an application ────────────────────────────────────
    @Transactional
    public PartnerApplicationResponse reject(UUID applicationId, String adminEmail, String reason) {
        PartnerApplication app = applicationRepo.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found"));

        if (!"pending".equals(app.getStatus())) {
            throw new IllegalStateException("Application is already " + app.getStatus());
        }

        app.setStatus("rejected");
        app.setReviewedBy(adminEmail);
        app.setReviewedAt(LocalDateTime.now());
        app.setRejectionReason(reason);
        applicationRepo.save(app);

        log.info("Partner application rejected: {} by {}", app.getEmail(), adminEmail);
        return toResponse(app);
    }

    // ── Grant a complimentary membership ────────────────────────────────
    // Called internally after approve / approveAll, and also from
    // AuthService when a user registers with an email that already has
    // an approved application (the "deferred grant" path).

    /**
     * If an approved partner application exists for this email AND no
     * membership has been granted yet, grant it now.  Called from the
     * registration flow so that users who were approved before they
     * created a SoCreate account receive their membership automatically.
     */
    @Transactional
    public void grantIfApproved(String email) {
        applicationRepo.findByEmail(email).ifPresent(app -> {
            if ("approved".equals(app.getStatus())) {
                // Only grant if the user doesn't already have a partner
                // membership (idempotency guard).
                User user = userRepository.findByEmail(email).orElse(null);
                if (user != null && !user.isPremium()) {
                    grantPartnerSubscription(app);
                }
            }
        });
    }

    private void grantPartnerSubscription(PartnerApplication app) {
        // Find or create the user
        Optional<User> optUser = userRepository.findByEmail(app.getEmail());
        if (optUser.isEmpty()) {
            log.warn("No SoCreate account found for {} — subscription will be " +
                    "activated when they register with this email", app.getEmail());
            return;
        }

        User user = optUser.get();
        String plan = "creator_pro".equals(app.getSubscriptionChoice()) ? "creator" : "reader";
        String planLabel = "creator".equals(plan) ? "Creators Pro (Partner)" : "Reader Pro (Partner)";
        int days = app.getFreeDays() != null ? app.getFreeDays() : 30;

        // Set user flags
        user.setPremium(true);
        user.setVerified(true);
        if ("creator".equals(plan)) {
            user.setCreatorPro(true);
        }
        userRepository.save(user);

        // Create membership record
        Membership membership = Membership.builder()
                .user(user)
                .plan(plan)
                .billing("partner")           // distinguishes from paid subscriptions
                .gateway("partner_program")
                .planLabel(planLabel)
                .price("₹0")
                .status("active")
                .startDate(LocalDateTime.now())
                .endDate(LocalDateTime.now().plusDays(days))
                .build();
        membershipRepository.save(membership);

        // Let the user know — in-app bell + push (sendNotification handles
        // both). SYSTEM type: not gated by the LIKE/COMMENT/NEW_IDEA
        // opt-out toggles, since this is an account-level announcement the
        // user should always see, same as FOLLOW/MESSAGE.
        notificationService.sendNotification(Notification.builder()
                .user(user)
                .type(Notification.NotificationType.SYSTEM)
                .message("You're approved! 🎉 Your " + planLabel
                        + " subscription is now active for " + days + " days.")
                .build());

        log.info("Granted {} days of {} to {} via Partners Program",
                days, planLabel, app.getEmail());
    }

    // ── Admin: list applications by status ────────────────────────────
    public List<PartnerApplicationResponse> listByStatus(String status) {
        List<PartnerApplication> apps;
        if ("pending".equals(status)) {
            apps = applicationRepo.findByStatusOrderByQueuePositionAsc(status);
        } else {
            apps = applicationRepo.findByStatusOrderByReviewedAtDesc(status);
        }
        return apps.stream().map(this::toResponse).toList();
    }

    // ── Admin: counts per status ────────────────────────────────────────
    public java.util.Map<String, Long> statusCounts() {
        return java.util.Map.of(
                "pending",  applicationRepo.countByStatus("pending"),
                "approved", applicationRepo.countByStatus("approved"),
                "rejected", applicationRepo.countByStatus("rejected")
        );
    }

    // ── Mapping ─────────────────────────────────────────────────────────
    private PartnerApplicationResponse toResponse(PartnerApplication app) {
        return PartnerApplicationResponse.builder()
                .id(app.getId())
                .fullName(app.getFullName())
                .email(app.getEmail())
                .participantType(app.getParticipantType())
                .subscriptionChoice(app.getSubscriptionChoice())
                .status(app.getStatus())
                .queuePosition(app.getQueuePosition())
                .freeDays(app.getFreeDays())
                .createdAt(app.getCreatedAt())
                .reviewedAt(app.getReviewedAt())
                .reviewedBy(app.getReviewedBy())
                .rejectionReason(app.getRejectionReason())
                .build();
    }
}

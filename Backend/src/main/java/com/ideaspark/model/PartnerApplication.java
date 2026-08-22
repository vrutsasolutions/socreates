package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Stores partner program applications.
 *
 * A user fills a 5-step form → row created with status "pending".
 * Admin reviews and either approves (→ "approved", grants Creator Pro)
 * or rejects (→ "rejected"). A queue_position is assigned on creation
 * for the "You're #N in the queue" screen.
 */
@Entity
@Table(name = "partner_program")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartnerApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    // ── Link to user (nullable — applicant may not have a SoCreate account yet) ──
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    // ── Step 1: Personal Information ────────────────────────────────────
    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String email;

    @Column(name = "mobile_number")
    private String mobileNumber;

    @Column
    private String city;

    /** "under_18" | "18-24" | "25-34" | "35+" */
    @Column(name = "age_group")
    private String ageGroup;

    /** "student" | "professional" | "freelancer" | "entrepreneur" */
    @Column(name = "participant_type")
    private String participantType;

    // ── Step 2a: Student Details (when participantType = "student") ─────
    @Column(name = "college_name")
    private String collegeName;

    @Column(name = "course_degree")
    private String courseDegree;

    /** "1st" | "2nd" | "3rd" | "4th" | "postgraduate" | "graduated" */
    @Column(name = "current_year")
    private String currentYear;

    @Column(name = "graduation_year")
    private String graduationYear;

    // ── Step 2b: Professional Details (when participantType != "student") ─
    @Column(name = "job_title")
    private String jobTitle;

    @Column(name = "company_organisation")
    private String companyOrganisation;

    @Column
    private String industry;

    /** "0-1" | "1-3" | "3-5" | "5-10" | "10+" */
    @Column(name = "years_of_experience")
    private String yearsOfExperience;

    // ── Step 3: About You & SoCreate ───────────────────────────────────
    @Column(name = "already_registered")
    private Boolean alreadyRegistered;

    /** Comma-separated: "writing_articles,publishing_knowledge,..." */
    @Column(name = "usage_purpose")
    private String usagePurpose;

    /** "creator" | "reader" | "both" */
    @Column(name = "best_describes")
    private String bestDescribes;

    /** "college" | "friend" | "whatsapp" | "instagram" | ... */
    @Column(name = "heard_from")
    private String heardFrom;

    /** Optional referral partner / college / org name */
    @Column(name = "partner_org_name")
    private String partnerOrgName;

    // ── Step 4: Subscription Choice ────────────────────────────────────
    /** "creator_pro" | "reader_pro" | "not_sure" */
    @Column(name = "subscription_choice")
    private String subscriptionChoice;

    // ── Step 5: Consent ────────────────────────────────────────────────
    @Column(name = "consent_program", nullable = false)
    @Builder.Default
    private Boolean consentProgram = false;

    @Column(name = "consent_updates")
    @Builder.Default
    private Boolean consentUpdates = false;

    @Column(name = "consent_future_programs")
    @Builder.Default
    private Boolean consentFuturePrograms = false;

    // ── Application state ──────────────────────────────────────────────
    /** "pending" | "approved" | "rejected" */
    @Column(nullable = false)
    @Builder.Default
    private String status = "pending";

    @Column(name = "queue_position")
    private Integer queuePosition;

    /** Number of free days granted: 90 for students, 60 for professionals */
    @Column(name = "free_days")
    private Integer freeDays;

    @Column(name = "reviewed_by")
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
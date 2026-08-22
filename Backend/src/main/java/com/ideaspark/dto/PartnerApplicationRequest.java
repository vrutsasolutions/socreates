package com.ideaspark.dto;

import lombok.Data;

/**
 * Flat DTO collecting all 5 steps of the partner program application form.
 * Nullable fields are conditional (e.g. student vs professional details).
 */
@Data
public class PartnerApplicationRequest {

    // Step 1 — Personal Information
    private String fullName;
    private String email;
    private String mobileNumber;
    private String city;
    private String ageGroup;         // "under_18" | "18-24" | "25-34" | "35+"
    private String participantType;  // "student" | "professional" | "freelancer" | "entrepreneur"

    // Step 2a — Student Details (when participantType = "student")
    private String collegeName;
    private String courseDegree;
    private String currentYear;      // "1st" | "2nd" | "3rd" | "4th" | "postgraduate" | "graduated"
    private String graduationYear;

    // Step 2b — Professional Details (when participantType != "student")
    private String jobTitle;
    private String companyOrganisation;
    private String industry;
    private String yearsOfExperience; // "0-1" | "1-3" | "3-5" | "5-10" | "10+"

    // Step 3 — About You & SoCreate
    private Boolean alreadyRegistered;
    private String usagePurpose;     // comma-separated
    private String bestDescribes;    // "creator" | "reader" | "both"
    private String heardFrom;
    private String partnerOrgName;

    // Step 4 — Subscription Choice
    private String subscriptionChoice; // "creator_pro" | "reader_pro" | "not_sure"

    // Step 5 — Consent
    private Boolean consentProgram;
    private Boolean consentUpdates;
    private Boolean consentFuturePrograms;
}
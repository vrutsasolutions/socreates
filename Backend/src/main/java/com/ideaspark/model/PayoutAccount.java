package com.ideaspark.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "creator_payout_accounts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayoutAccount {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "legal_name")
    private String legalName;

    @Column(name = "pan_number")
    private String panNumber;

    @Column(name = "mobile_number")
    private String mobileNumber;

    @Column(name = "bank_name")
    private String bankName;

    @Column(name = "payout_account_name")
    private String payoutAccountName;

    @Column(name = "payout_account_number_last4")
    private String payoutAccountNumberLast4;

    @Column(name = "payout_ifsc")
    private String payoutIfsc;

    @Column(name = "payout_method")
    private String payoutMethod;
// You can uncomment the following lines if you want to support UPI/VPA payouts in the future. For now, they are commented out as per the current requirements.
    // @Column(name = "payout_vpa")
    // private String payoutVpa;

    @Column(name = "razorpay_contact_id")
    private String razorpayContactId;

    @Column(name = "razorpay_fund_account_id")
    private String razorpayFundAccountId;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}

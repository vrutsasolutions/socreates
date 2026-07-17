package com.ideaspark.repository;

import com.ideaspark.model.PayoutAccount;
import com.ideaspark.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PayoutAccountRepository extends JpaRepository<PayoutAccount, UUID> {

    /**
     * Returns the currently active payout account for a user.
     */
    Optional<PayoutAccount> findByUserAndIsActiveTrue(User user);

    /**
     * Returns all payout accounts (history) for a user,
     * newest first.
     */
    List<PayoutAccount> findByUserOrderByCreatedAtDesc(User user);

    /**
     * Find a payout account by its Razorpay Fund Account ID.
     */
    Optional<PayoutAccount> findByRazorpayFundAccountId(String razorpayFundAccountId);

    /**
     * Check if a user already has an active payout account.
     */
    boolean existsByUserAndIsActiveTrue(User user);

    /**
     * Returns all active payout accounts.
     */
    List<PayoutAccount> findAllByIsActiveTrue();
}
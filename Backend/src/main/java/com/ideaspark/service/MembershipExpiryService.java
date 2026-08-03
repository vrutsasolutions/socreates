package com.ideaspark.service;

import com.ideaspark.model.Membership;
import com.ideaspark.model.User;
import com.ideaspark.repository.MembershipRepository;
import com.ideaspark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

// Closes the gap flagged in the Aug 2026 codebase review: nothing in the app
// ever set Membership.status to "expired" or reset User.isPremium once a
// membership's endDate passed. The only "active membership" lookup
// (MembershipRepository#findTopByUserIdAndStatusOrderByEndDateDesc) filters
// on status alone, never endDate > now(), so a lapsed subscriber kept full
// premium access indefinitely — a direct, ongoing revenue leak.
//
// Deliberately narrow in scope: this job only closes out memberships whose
// paid period has already ended. It does NOT attempt any renewal, re-charge,
// or trial-to-paid conversion — that mechanism (razorpayService
// .cancelSubscription(), the RBI pre-debit reminder job, and how a
// membership should behave at renewal time) is a separate, still-open
// product decision. Until that's decided, a lapsed membership simply ends;
// the member would need to check out again to resubscribe.
@Slf4j
@Component
@RequiredArgsConstructor
public class MembershipExpiryService {

    private final MembershipRepository membershipRepository;
    private final UserRepository userRepository;

    /**
     * Runs daily at 2:30 AM India time — just after the payout cron
     * (2:00 AM, see ScheduledPayoutRunner) so the two never contend for the
     * same rows/connections.
     */
    @Scheduled(
            cron = "${membership.expiry.scheduler.cron:0 30 2 * * *}",
            zone = "${payout.scheduler.zone:Asia/Kolkata}"
    )
    @Transactional
    public void expireLapsedMemberships() {
        LocalDateTime now = LocalDateTime.now();

        List<Membership> lapsed = membershipRepository.findActiveAndExpired(now);

        if (lapsed.isEmpty()) {
            log.info("Membership expiry check found no lapsed memberships");
            return;
        }

        int expiredCount = 0;

        for (Membership membership : lapsed) {
            membership.setStatus("expired");
            membershipRepository.save(membership);

            User user = membership.getUser();
            if (user != null && user.isPremium()) {
                // Don't just assume this was the user's only active row.
                // subscribe() currently cancels every prior active
                // membership before inserting a new one, so in principle
                // there should be at most one — but this is live payment
                // data going back further than that logic, so check
                // directly rather than trust the invariant: only clear
                // isPremium if no OTHER active, still-unexpired membership
                // is left standing for this user.
                boolean stillHasValidMembership = membershipRepository
                        .findByUserIdAndStatus(user.getId(), "active")
                        .stream()
                        .anyMatch(m -> m.getEndDate() != null && m.getEndDate().isAfter(now));

                if (!stillHasValidMembership) {
                    user.setPremium(false);
                    userRepository.save(user);
                }
            }

            expiredCount++;
        }

        log.info("Membership expiry check expired {} lapsed membership(s)", expiredCount);
    }
}

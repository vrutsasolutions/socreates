package com.ideaspark.service;

import com.ideaspark.dto.*;
import com.ideaspark.model.*;
import com.ideaspark.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MembershipService {

    private final MembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final MembershipPaymentRepository membershipPaymentRepository;
    private final RazorpayService razorpayService;

    // Subscribe to a plan. Returns { user: {...isPremium, membership} } so the
    // frontend can persist the premium user via login(user, token).
    @Transactional
    public Map<String, Object> subscribe(SubscribeRequest req, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // ── Idempotency guard ────────────────────────────────────────────
        // If this payment_id has already been credited — either by an
        // earlier call to this same endpoint (network retry, double-click)
        // or by the async /api/webhooks/razorpay handler racing ahead of us
        // — don't create a second Membership row. Just return current state.
        if (req.getPaymentId() != null
                && membershipPaymentRepository.existsByGatewayPaymentId(req.getPaymentId())) {
            Membership existing = membershipRepository
                    .findTopByUserIdAndStatusOrderByEndDateDesc(user.getId(), "active")
                    .orElse(null);
            return Map.of("user", toUserPayload(user, existing));
        }

        // ── Server-authoritative plan/billing ───────────────────────────
        // The signature check in the controller only proves a real payment
        // happened for this order_id — it says nothing about which plan that
        // order was created for. Read plan/billing from the MembershipPayment
        // row /create-order wrote (planType, e.g. "creator_yearly"), never
        // from this request body. Without this, a valid signature for a ₹99
        // Reader-Monthly order could be replayed here with a request body
        // claiming plan="creator", billing="yearly" to get ₹999 Creator Pro
        // Yearly for ₹99.
        MembershipPayment payment = membershipPaymentRepository
                .findByGatewayOrderId(req.getOrderId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "No matching order found for this payment — please restart checkout."));

        if (!payment.getUser().getId().equals(user.getId())) {
            // Order belongs to someone else's checkout session — refuse
            // rather than let account A redeem account B's paid order.
            throw new IllegalStateException("This order does not belong to your account.");
        }

        String[] planParts = payment.getPlanType().split("_", 2);
        String plan = planParts[0];
        String billing = planParts.length > 1 ? planParts[1] : "monthly";

        // End date is driven by the BILLING period (monthly/yearly), not the
        // plan tier (reader/creator) — the previous code conflated the two.
        LocalDateTime endDate = "yearly".equalsIgnoreCase(billing)
                ? LocalDateTime.now().plusYears(1)
                : LocalDateTime.now().plusMonths(1);

        Membership membership = Membership.builder()
                .user(user)
                .plan(plan)
                .billing(billing)
                .gateway("razorpay")
                .planLabel(req.getPlanLabel())   // display-only text, not security sensitive
                .price(req.getPrice())           // display-only text, not security sensitive
                .status("active")
                .paymentId(req.getPaymentId())
                .endDate(endDate)
                .build();

        membershipRepository.save(membership);

        // Mark the order row as captured and stamp the real payment id — this
        // is what makes the idempotency check above (and the webhook's own
        // existsByGatewayPaymentId guard) correctly no-op if the async
        // webhook for this same payment arrives before or after this call.
        // Note: gatewayPaymentId is UNIQUE at the DB level, so a genuine
        // concurrent double-submit fails loudly (integrity violation) rather
        // than silently double-crediting — acceptable here since, unlike the
        // payout race, the failure mode is "request errors", not "money
        // moves twice".
        payment.setGatewayPaymentId(req.getPaymentId());
        payment.setStatus("captured");
        payment.setSignatureVerified(true);
        payment.setPaidAt(LocalDateTime.now());
        membershipPaymentRepository.save(payment);

        // Mark user as premium
        user.setPremium(true);
        userRepository.save(user);

        return Map.of("user", toUserPayload(user, membership));
    }

    // Cancel the active membership; returns { user: {...isPremium:false, membership:null} }.
    @Transactional
    public Map<String, Object> cancel(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Cancel EVERY active membership, not just the latest. subscribe() never
        // supersedes a prior active row, so a user can hold several "active"
        // memberships (renewal / upgrade / re-subscribe in test mode). Canceling
        // only the top one would leave a stale active row behind while the user
        // is already non-premium — getStatus() would then resurrect it. Revoke
        // all of them so a cancel is always complete and consistent.
        List<Membership> active =
                membershipRepository.findByUserIdAndStatus(user.getId(), "active");
        active.forEach(m -> m.setStatus("canceled"));
        membershipRepository.saveAll(active);

        user.setPremium(false);
        userRepository.save(user);

        return Map.of("user", toUserPayload(user, null));
    }

    // Self-service refund: reverse the user's most recent captured payment and
    // revoke access immediately. Returns { user: {...isPremium:false, membership:null} }.
    //
    // Two distinct concerns, deliberately split (see RazorpayRefundWebhookHandler):
    //   - ACCESS is revoked here, synchronously, so the UI reflects the change
    //     the instant the user clicks "Refund" — same shape as cancel().
    //   - The MONEY status on the payment row is NOT flipped here. Razorpay
    //     processes the refund asynchronously; only the refund.processed webhook
    //     marks the row "refunded", which is what the revenue-pool job excludes.
    //     If the refund were to FAIL, the row correctly stays "captured".
    @Transactional
    public Map<String, Object> requestRefund(String userEmail) throws Exception {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        MembershipPayment payment = membershipPaymentRepository
                .findFirstByUserIdAndStatusOrderByPaidAtDesc(user.getId(), "captured")
                .filter(p -> p.getGatewayPaymentId() != null)
                .orElseThrow(() -> new IllegalStateException(
                        "No refundable payment found for this account."));

        // Kick off the refund with Razorpay FIRST — if this throws (already
        // refunded, gateway error), we bail out before revoking access, so the
        // user isn't left non-premium with no refund actually in flight.
        razorpayService.refund(payment.getGatewayPaymentId(), payment.getAmount());

        // Revoke access now. Cancel EVERY active membership (subscribe() never
        // supersedes a prior active row) so a refund is always complete — same
        // reasoning as cancel().
        List<Membership> active =
                membershipRepository.findByUserIdAndStatus(user.getId(), "active");
        active.forEach(m -> m.setStatus("canceled"));
        membershipRepository.saveAll(active);

        user.setPremium(false);
        userRepository.save(user);

        return Map.of("user", toUserPayload(user, null));
    }

    // Check membership status
    public MembershipDTO getStatus(String userEmail) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        return membershipRepository
                .findTopByUserIdAndStatusOrderByEndDateDesc(user.getId(), "active")
                .map(this::toDTO)
                .orElse(null);
    }

    // The active-membership shape (or null) for embedding in the auth payload,
    // so login/register/google responses carry the same `membership` object that
    // /subscribe persists — otherwise re-login drops it (only isPremium survives).
    public Map<String, Object> activeMembershipShape(User user) {
        return membershipRepository
                .findTopByUserIdAndStatusOrderByEndDateDesc(user.getId(), "active")
                .map(this::toMembershipShape)
                .orElse(null);
    }

    // ── Mappers ──────────────────────────────────────────────
    private MembershipDTO toDTO(Membership m) {
        MembershipDTO dto = new MembershipDTO();
        dto.setId(m.getId());
        dto.setPlan(m.getPlan());
        dto.setStatus(m.getStatus());
        dto.setStartDate(m.getStartDate());
        dto.setEndDate(m.getEndDate());
        return dto;
    }

    // Full user shape the frontend persists after a purchase/cancel. Keys match
    // what AuthContext.login + the Membership Active view read (isPremium,
    // membership.{plan,billing,gateway,planLabel,price,status,startedAt,renewsAt,stats}).
    private Map<String, Object> toUserPayload(User user, Membership m) {
        Map<String, Object> u = new LinkedHashMap<>();
        u.put("id", user.getId());
        u.put("name", user.getName());
        u.put("username", user.getUsername());
        u.put("email", user.getEmail());
        u.put("profileImage", user.getProfileImage());
        u.put("bio", user.getBio());
        u.put("isPremium", user.isPremium());
        u.put("membership", m == null ? null : toMembershipShape(m));
        return u;
    }

    private Map<String, Object> toMembershipShape(Membership m) {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("read", 0);
        stats.put("saved", 0);
        stats.put("shared", 0);

        Map<String, Object> shape = new LinkedHashMap<>();
        shape.put("plan", m.getPlan());
        shape.put("billing", m.getBilling());
        shape.put("gateway", m.getGateway());
        shape.put("planLabel", m.getPlanLabel());
        shape.put("price", m.getPrice());
        shape.put("status", m.getStatus());
        shape.put("startedAt", m.getStartDate() == null ? null : m.getStartDate().toString());
        shape.put("renewsAt", m.getEndDate() == null ? null : m.getEndDate().toString());
        shape.put("stats", stats);
        return shape;
    }
}

package com.ideaspark.controller;

import com.ideaspark.dto.*;
import com.ideaspark.model.MembershipPayment;
import com.ideaspark.model.User;
import com.ideaspark.repository.MembershipPaymentRepository;
import com.ideaspark.repository.UserRepository;
import com.ideaspark.service.MembershipService;
import com.ideaspark.service.RazorpayService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class MembershipController {

    private final MembershipService membershipService;
    private final RazorpayService razorpayService;
    private final MembershipPaymentRepository membershipPaymentRepository;
    private final UserRepository userRepository;

    // POST /api/payment/create-order
    // Creates a Razorpay test-mode order. Amount is computed server-side (paise)
    // from the plan/billing — the client's display price is never trusted.
    //
    // Also persists a "created" MembershipPayment row keyed on the new
    // gateway_order_id, tied to the logged-in user. This is what lets the
    // /api/webhooks/razorpay handler — which only ever sees order_id /
    // payment_id, never a user — find its way back to the right user when
    // the webhook arrives later. Without this row, a webhook for a captured
    // payment has nobody to attribute it to (see RazorpayWebhookService).
    @PostMapping("/create-order")
    @Transactional
    public ResponseEntity<?> createOrder(
            @RequestBody CheckoutRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {

        if (!razorpayService.isConfigured()) {
            return ResponseEntity.status(503).body(Map.of(
                    "message",
                    "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."));
        }
        try {
            int amount = razorpayService.amountPaiseFor(req.getPlan(), req.getBilling());
            String orderId = razorpayService.createOrder(
                    amount, "rcpt_" + System.currentTimeMillis());

            User user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String planType = req.getPlan() + "_" + req.getBilling(); // e.g. "creator_yearly"

            membershipPaymentRepository.save(MembershipPayment.builder()
                    .user(user)
                    .planType(planType)
                    .amount(amount)
                    .currency("INR")
                    .paymentGateway("razorpay")
                    .gatewayOrderId(orderId)
                    .status("created")
                    .signatureVerified(false)
                    .webhookReceived(false)
                    .build());

            return ResponseEntity.ok(Map.of(
                    "orderId", orderId,
                    "amount", amount,
                    "currency", "INR",
                    "keyId", razorpayService.getKeyId()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Could not create order: " + e.getMessage()));
        }
    }

    // POST /api/payment/subscribe
    // Grants premium. The order/payment/signature triple MUST verify, AND the
    // plan/billing actually granted are read server-side in MembershipService
    // from the MembershipPayment row created at /create-order time — never
    // trusted from this request body. Two things this closes:
    //   (a) previously any req.getGateway() value other than "razorpay"
    //       skipped verification ENTIRELY and granted premium for free —
    //       Stripe was never implemented, so this wasn't a real branch, just
    //       an open bypass. Now anything but "razorpay" is rejected.
    //   (b) previously req.getPlan()/req.getBilling() were trusted directly,
    //       so a valid signature for a ₹99 Reader-Monthly order could be
    //       replayed here with plan="creator", billing="yearly" to claim
    //       ₹999 Creator-Pro-Yearly. Plan/billing now come from the order
    //       row itself, not the client.
    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribe(
            @RequestBody SubscribeRequest req,
            @AuthenticationPrincipal UserDetails user) {

        if (!"razorpay".equalsIgnoreCase(req.getGateway())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Unsupported payment gateway"));
        }

        boolean ok = razorpayService.verifySignature(
                req.getOrderId(), req.getPaymentId(), req.getSignature());
        if (!ok) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Payment verification failed"));
        }

        return ResponseEntity.ok(membershipService.subscribe(req, user.getUsername()));
    }

    // POST /api/payment/cancel
    @PostMapping("/cancel")
    public ResponseEntity<?> cancel(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(membershipService.cancel(user.getUsername()));
    }

    // POST /api/payment/refund
    // Self-service refund of the caller's most recent captured payment. Access
    // is revoked immediately; the refund.processed webhook later marks the
    // payment row "refunded" (the money source of truth). Authenticated — falls
    // under anyRequest().authenticated() in SecurityConfig.
    @PostMapping("/refund")
    public ResponseEntity<?> refund(@AuthenticationPrincipal UserDetails user) {
        if (!razorpayService.isConfigured()) {
            return ResponseEntity.status(503).body(Map.of(
                    "message",
                    "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."));
        }
        try {
            return ResponseEntity.ok(membershipService.requestRefund(user.getUsername()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Refund failed: " + e.getMessage()));
        }
    }

    // GET /api/payment/status
    @GetMapping("/status")
    public ResponseEntity<?> getStatus(@AuthenticationPrincipal UserDetails user) {
        MembershipDTO dto = membershipService.getStatus(user.getUsername());
        if (dto == null) {
            return ResponseEntity.ok(new ApiResponse(false, "No active membership"));
        }
        return ResponseEntity.ok(dto);
    }
}

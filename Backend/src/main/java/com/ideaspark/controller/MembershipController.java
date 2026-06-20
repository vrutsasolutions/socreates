package com.ideaspark.controller;

import com.ideaspark.dto.*;
import com.ideaspark.service.MembershipService;
import com.ideaspark.service.RazorpayService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class MembershipController {

    private final MembershipService membershipService;
    private final RazorpayService razorpayService;

    // POST /api/payment/create-order
    // Creates a Razorpay test-mode order. Amount is computed server-side (paise)
    // from the plan/billing — the client's display price is never trusted.
    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(@RequestBody CheckoutRequest req) {
        if (!razorpayService.isConfigured()) {
            return ResponseEntity.status(503).body(Map.of(
                    "message",
                    "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."));
        }
        try {
            int amount = razorpayService.amountPaiseFor(req.getPlan(), req.getBilling());
            String orderId = razorpayService.createOrder(
                    amount, "rcpt_" + System.currentTimeMillis());
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
    // Grants premium. For Razorpay, the order/payment/signature triple MUST
    // verify before any membership is created.
    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribe(
            @RequestBody SubscribeRequest req,
            @AuthenticationPrincipal UserDetails user) {

        if ("razorpay".equalsIgnoreCase(req.getGateway())) {
            boolean ok = razorpayService.verifySignature(
                    req.getOrderId(), req.getPaymentId(), req.getSignature());
            if (!ok) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Payment verification failed"));
            }
        }

        return ResponseEntity.ok(membershipService.subscribe(req, user.getUsername()));
    }

    // POST /api/payment/cancel
    @PostMapping("/cancel")
    public ResponseEntity<?> cancel(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(membershipService.cancel(user.getUsername()));
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

package com.ideaspark.controller;

import com.ideaspark.service.RazorpayXWebhookService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Receives webhook events from RazorpayX for creator payouts. This is the
 * outbound-money counterpart to {@link RazorpayWebhookController}, and just
 * as security-critical — it is the ONLY signal that tells us whether a
 * payout truly completed or was reversed. Without it, the DB would forever
 * believe every optimistic "Paid" flip from {@code CreatorPayoutService}.
 *
 * No @AuthenticationPrincipal here on purpose — RazorpayX's servers call
 * this with no JWT, only the X-Razorpay-Signature header. This path falls
 * under {@code /api/webhooks/**} which is already permitAll() in
 * SecurityConfig; the HMAC signature check inside the service is what
 * actually protects it.
 */
@RestController
@RequestMapping("/api/webhooks")
public class RazorpayXWebhookController {

    private final RazorpayXWebhookService webhookService;

    public RazorpayXWebhookController(RazorpayXWebhookService webhookService) {
        this.webhookService = webhookService;
    }

    @PostMapping("/razorpayx")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String rawPayload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {

        // Return 200 OK quickly in every branch except a genuine signature
        // failure — RazorpayX retries (and we get duplicate-webhook storms)
        // if we're slow or return anything other than 200/401.
        return webhookService.process(rawPayload, signature);
    }
}

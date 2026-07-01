package com.ideaspark.controller;

import com.ideaspark.service.RazorpayWebhookService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Receives webhook events from Razorpay. THIS IS THE MOST IMPORTANT
 * ENDPOINT in the payment system — it is the only source of truth for
 * "did a payment actually happen". The frontend's checkout callback can be
 * faked by a malicious client; this endpoint, gated by HMAC-SHA256
 * signature verification, cannot.
 *
 * No @AuthenticationPrincipal here on purpose — Razorpay's servers call
 * this with no JWT, only the X-Razorpay-Signature header. This path is
 * permitAll() in SecurityConfig; the signature check below is what
 * actually protects it.
 */
@RestController
@RequestMapping("/api/webhooks")
public class RazorpayWebhookController {

    private final RazorpayWebhookService webhookService;

    public RazorpayWebhookController(RazorpayWebhookService webhookService) {
        this.webhookService = webhookService;
    }

    @PostMapping("/razorpay")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String rawPayload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {

        // Return 200 OK quickly in every branch except a genuine signature
        // failure — Razorpay retries (and we get duplicate-webhook storms)
        // if we're slow or return anything other than 200/401.
        return webhookService.process(rawPayload, signature);
    }
}

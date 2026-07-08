package com.ideaspark.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.Refund;
import com.razorpay.Utils;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

// Thin wrapper around the Razorpay server SDK: server-authoritative pricing,
// test-mode order creation, and HMAC payment-signature verification.
@Service
public class RazorpayService {

    @Value("${razorpay.key-id:}")
    private String keyId;

    @Value("${razorpay.key-secret:}")
    private String keySecret;

    /** Keys must be present before any order can be created / verified. */
    public boolean isConfigured() {
        return keyId != null && !keyId.isBlank()
                && keySecret != null && !keySecret.isBlank();
    }

    public String getKeyId() {
        return keyId;
    }

    /**
     * Server-side source of truth for the charge amount, in paise.
     * Mirrors the display prices on the Membership page.
     */
    public int amountPaiseFor(String plan, String billing) {
        boolean yearly = "yearly".equalsIgnoreCase(billing);
        if ("creator".equalsIgnoreCase(plan)) {
            return yearly ? 99900 : 19900;   // ₹999 / ₹199
        }
        if ("reader".equalsIgnoreCase(plan)) {
            return yearly ? 79900 : 9900;    // ₹799 / ₹99
        }
        throw new IllegalArgumentException("Unknown plan: " + plan);
    }

    /** Create a Razorpay order and return its id (e.g. "order_ABC123"). */
    public String createOrder(int amountPaise, String receipt) throws Exception {
        RazorpayClient client = new RazorpayClient(keyId, keySecret);
        JSONObject req = new JSONObject();
        req.put("amount", amountPaise);
        req.put("currency", "INR");
        req.put("receipt", receipt);
        req.put("payment_capture", true);
        Order order = client.orders.create(req);
        return order.get("id");
    }

    /**
     * Initiate a refund against a captured payment. Pass amountPaise &lt;= 0 to
     * refund the full amount, or a smaller value for a partial refund.
     *
     * This only KICKS OFF the refund — Razorpay processes it asynchronously and
     * confirms via a refund.processed / refund.failed webhook. The webhook
     * (see RazorpayRefundWebhookHandler) is the source of truth for whether the
     * money actually moved; this method just returns the new refund id
     * (e.g. "rfnd_ABC123") so the caller can log it.
     */
    public String refund(String paymentId, int amountPaise) throws Exception {
        RazorpayClient client = new RazorpayClient(keyId, keySecret);
        JSONObject req = new JSONObject();
        if (amountPaise > 0) {
            req.put("amount", amountPaise);
        }
        req.put("speed", "normal");
        Refund refund = client.payments.refund(paymentId, req);
        return refund.get("id");
    }

    /** Verify the order/payment/signature triple returned by the checkout. */
    public boolean verifySignature(String orderId, String paymentId, String signature) {
        try {
            JSONObject attrs = new JSONObject();
            attrs.put("razorpay_order_id", orderId);
            attrs.put("razorpay_payment_id", paymentId);
            attrs.put("razorpay_signature", signature);
            return Utils.verifyPaymentSignature(attrs, keySecret);
        } catch (Exception e) {
            return false;
        }
    }
}

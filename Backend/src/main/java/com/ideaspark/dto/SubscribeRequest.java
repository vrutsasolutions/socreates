package com.ideaspark.dto;

import lombok.Data;

// Sent after a successful gateway charge to grant premium. For Razorpay the
// orderId/paymentId/signature triple is verified server-side before the
// membership is created (API_CONTRACT.md §8).
@Data
public class SubscribeRequest {
    private String plan;       // "reader" | "creator"
    private String billing;    // "monthly" | "yearly"
    private String gateway;    // "razorpay" | "stripe"
    private String planLabel;  // display, e.g. "Creators Pro"
    private String price;      // display, e.g. "₹999"

    private String paymentId;  // razorpay_payment_id
    private String orderId;    // razorpay_order_id
    private String signature;  // razorpay_signature
}

package com.ideaspark.dto;

import lombok.Data;

@Data
public class SubscribeRequest {
    private String plan;       // "monthly" | "yearly"
    private String paymentId;  // from Stripe/Razorpay
}

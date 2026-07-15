package com.ideaspark.dto;

import lombok.Data;

// What the frontend sends to start a purchase (see API_CONTRACT.md §8).
// The server is the source of truth for the real charge amount — `price` here
// is only a display string and is never trusted for the gateway amount.
@Data
public class CheckoutRequest {
    private String plan;       // "reader" | "creator"
    private String billing;    // "monthly" | "yearly"
    private String gateway;    // "razorpay" (only supported gateway)
    private String planLabel;  // display, e.g. "Creators Pro"
    private String price;      // display, e.g. "₹999"
}

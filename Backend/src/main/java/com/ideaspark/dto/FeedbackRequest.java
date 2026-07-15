package com.ideaspark.dto;

import lombok.Data;

@Data
public class FeedbackRequest {
    private int rating;   // 1–5, validated server-side in FeedbackController
    private String review; // optional free-text
}

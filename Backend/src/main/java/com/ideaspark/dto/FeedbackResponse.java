package com.ideaspark.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class FeedbackResponse {
    private int rating;
    private String review;
    private LocalDateTime updatedAt;
}

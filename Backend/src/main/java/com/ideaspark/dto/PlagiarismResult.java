package com.ideaspark.dto;

import lombok.Data;

@Data
public class PlagiarismResult {
    private boolean isPlagiarized;
    private double similarityScore;
    private String message;
}

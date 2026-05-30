package com.ideaspark.dto;

import lombok.Data;

@Data
public class CreateIdeaRequest {
    private String title;
    private String description;
    private String category;
    private boolean isPremium;
}

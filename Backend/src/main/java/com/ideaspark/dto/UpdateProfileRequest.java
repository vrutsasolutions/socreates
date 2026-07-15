package com.ideaspark.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String name;
    private String username; // optional — legacy users can set theirs
    private String bio;
}

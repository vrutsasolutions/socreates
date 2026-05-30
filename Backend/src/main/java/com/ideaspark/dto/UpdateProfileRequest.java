package com.ideaspark.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String name;
    private String bio;
    private String password; // optional new password
}

package com.ideaspark.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DeviceTokenRequest {
    @NotBlank
    private String deviceToken;

    // "android" | "ios" (only android is used today, ios reserved for later)
    private String platform = "android";
}
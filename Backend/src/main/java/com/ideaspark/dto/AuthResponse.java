package com.ideaspark.dto;

import lombok.Data;

@Data
public class AuthResponse {
    private String token;
    private UserDTO user;
}

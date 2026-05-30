package com.ideaspark.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class UserDTO {
    private UUID id;
    private String name;
    private String email;
    private String profileImage;
    private String bio;
    private boolean isPremium;
}

package com.ideaspark.controller;

import com.ideaspark.service.RevenueDistributionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/pools")
@RequiredArgsConstructor
public class AdminRevenueController {

    private final RevenueDistributionService revenueDistributionService;

    private static final String ADMIN_EMAIL = "vrutsasolutions@gmail.com";

    @PostMapping("/{month}/distribute")
    public ResponseEntity<?> distribute(
            @PathVariable String month,
            Authentication authentication
    ) {
        if (authentication == null || !ADMIN_EMAIL.equalsIgnoreCase(authentication.getName())) {
            return ResponseEntity.status(403).body("Forbidden");
        }

        return ResponseEntity.ok(revenueDistributionService.distribute(month));
    }
}
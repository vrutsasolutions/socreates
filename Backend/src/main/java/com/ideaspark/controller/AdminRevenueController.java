package com.ideaspark.controller;

import com.ideaspark.service.RevenueDistributionService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/pools")
@RequiredArgsConstructor
public class AdminRevenueController {

    private final RevenueDistributionService revenueDistributionService;

    @Value("${admin.distribution.secret}")
    private String adminSecret;

    @PostMapping("/{month}/distribute")
    public ResponseEntity<?> distribute(
            @PathVariable String month,
            @RequestHeader(value = "X-Admin-Secret", required = false) String providedSecret
    ) {
        if (providedSecret == null || !providedSecret.equals(adminSecret)) {
            return ResponseEntity.status(403).body("Forbidden");
        }

        return ResponseEntity.ok(revenueDistributionService.distribute(month));
    }
}
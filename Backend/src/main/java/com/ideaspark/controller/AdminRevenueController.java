package com.ideaspark.controller;

import com.ideaspark.service.RevenueDistributionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/pools")
@RequiredArgsConstructor
public class AdminRevenueController {

    private final RevenueDistributionService revenueDistributionService;

    // Primary gate: SecurityConfig requires ROLE_ADMIN (via hasRole("ADMIN"))
    // for all of /api/admin/pools/**, and only app.admin.email is granted
    // that role (see UserDetailsServiceImpl). This annotation is a second,
    // independent check on the method itself so the endpoint stays locked
    // down even if the SecurityConfig matcher above it is ever loosened or
    // reordered by mistake.
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{month}/distribute")
    public ResponseEntity<?> distribute(@PathVariable String month) {
        return ResponseEntity.ok(revenueDistributionService.distribute(month));
    }
}

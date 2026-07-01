package com.ideaspark.controller;

import com.ideaspark.service.RevenueDistributionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/admin/pools")
@RequiredArgsConstructor
public class AdminRevenueController {

    private final RevenueDistributionService revenueDistributionService;

     @PostMapping("/{month}/distribute")
    public ResponseEntity<?> distribute(@PathVariable String month) {
        return ResponseEntity.ok(revenueDistributionService.distribute(month));
    }
    
}

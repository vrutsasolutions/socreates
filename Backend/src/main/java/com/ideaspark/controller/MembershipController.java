package com.ideaspark.controller;

import com.ideaspark.dto.*;
import com.ideaspark.service.MembershipService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payment")
public class MembershipController {

    @Autowired
    private MembershipService membershipService;

    // POST /api/payment/subscribe
    @PostMapping("/subscribe")
    public ResponseEntity<MembershipDTO> subscribe(
            @RequestBody SubscribeRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(membershipService.subscribe(req, user.getUsername()));
    }

    // GET /api/payment/status
    @GetMapping("/status")
    public ResponseEntity<?> getStatus(
            @AuthenticationPrincipal UserDetails user) {
        MembershipDTO dto = membershipService.getStatus(user.getUsername());
        if (dto == null) {
            return ResponseEntity.ok(new ApiResponse(false, "No active membership"));
        }
        return ResponseEntity.ok(dto);
    }
}

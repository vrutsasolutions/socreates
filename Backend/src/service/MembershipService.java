package com.ideaspark.service;

import com.ideaspark.dto.*;
import com.ideaspark.model.*;
import com.ideaspark.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class MembershipService {

    private final MembershipRepository membershipRepository;
    private final UserRepository userRepository;

    // Subscribe to a plan
    @Transactional
    public MembershipDTO subscribe(SubscribeRequest req, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Calculate end date
        LocalDateTime endDate = req.getPlan().equals("yearly")
                ? LocalDateTime.now().plusYears(1)
                : LocalDateTime.now().plusMonths(1);

        Membership membership = Membership.builder()
                .user(user)
                .plan(req.getPlan())
                .status("active")
                .paymentId(req.getPaymentId())
                .endDate(endDate)
                .build();

        membershipRepository.save(membership);

        // Mark user as premium
        user.setPremium(true);
        userRepository.save(user);

        return toDTO(membership);
    }

    // Check membership status
    public MembershipDTO getStatus(String userEmail) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        return membershipRepository
                .findTopByUserIdAndStatusOrderByEndDateDesc(user.getId(), "active")
                .map(this::toDTO)
                .orElse(null);
    }

    // ── Mapper ───────────────────────────────────────────────
    private MembershipDTO toDTO(Membership m) {
        MembershipDTO dto = new MembershipDTO();
        dto.setId(m.getId());
        dto.setPlan(m.getPlan());
        dto.setStatus(m.getStatus());
        dto.setStartDate(m.getStartDate());
        dto.setEndDate(m.getEndDate());
        return dto;
    }
}

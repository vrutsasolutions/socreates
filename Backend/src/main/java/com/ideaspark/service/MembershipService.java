package com.ideaspark.service;

import com.ideaspark.dto.*;
import com.ideaspark.model.*;
import com.ideaspark.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MembershipService {

    private final MembershipRepository membershipRepository;
    private final UserRepository userRepository;

    // Subscribe to a plan. Returns { user: {...isPremium, membership} } so the
    // frontend can persist the premium user via login(user, token).
    @Transactional
    public Map<String, Object> subscribe(SubscribeRequest req, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // End date is driven by the BILLING period (monthly/yearly), not the
        // plan tier (reader/creator) — the previous code conflated the two.
        LocalDateTime endDate = "yearly".equalsIgnoreCase(req.getBilling())
                ? LocalDateTime.now().plusYears(1)
                : LocalDateTime.now().plusMonths(1);

        Membership membership = Membership.builder()
                .user(user)
                .plan(req.getPlan())
                .billing(req.getBilling())
                .gateway(req.getGateway())
                .planLabel(req.getPlanLabel())
                .price(req.getPrice())
                .status("active")
                .paymentId(req.getPaymentId())
                .endDate(endDate)
                .build();

        membershipRepository.save(membership);

        // Mark user as premium
        user.setPremium(true);
        userRepository.save(user);

        return Map.of("user", toUserPayload(user, membership));
    }

    // Cancel the active membership; returns { user: {...isPremium:false, membership:null} }.
    @Transactional
    public Map<String, Object> cancel(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        membershipRepository
                .findTopByUserIdAndStatusOrderByEndDateDesc(user.getId(), "active")
                .ifPresent(m -> {
                    m.setStatus("canceled");
                    membershipRepository.save(m);
                });

        user.setPremium(false);
        userRepository.save(user);

        return Map.of("user", toUserPayload(user, null));
    }

    // Check membership status
    public MembershipDTO getStatus(String userEmail) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        return membershipRepository
                .findTopByUserIdAndStatusOrderByEndDateDesc(user.getId(), "active")
                .map(this::toDTO)
                .orElse(null);
    }

    // ── Mappers ──────────────────────────────────────────────
    private MembershipDTO toDTO(Membership m) {
        MembershipDTO dto = new MembershipDTO();
        dto.setId(m.getId());
        dto.setPlan(m.getPlan());
        dto.setStatus(m.getStatus());
        dto.setStartDate(m.getStartDate());
        dto.setEndDate(m.getEndDate());
        return dto;
    }

    // Full user shape the frontend persists after a purchase/cancel. Keys match
    // what AuthContext.login + the Membership Active view read (isPremium,
    // membership.{plan,billing,gateway,planLabel,price,status,startedAt,renewsAt,stats}).
    private Map<String, Object> toUserPayload(User user, Membership m) {
        Map<String, Object> u = new LinkedHashMap<>();
        u.put("id", user.getId());
        u.put("name", user.getName());
        u.put("username", user.getUsername());
        u.put("email", user.getEmail());
        u.put("profileImage", user.getProfileImage());
        u.put("bio", user.getBio());
        u.put("isPremium", user.isPremium());
        u.put("membership", m == null ? null : toMembershipShape(m));
        return u;
    }

    private Map<String, Object> toMembershipShape(Membership m) {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("read", 0);
        stats.put("saved", 0);
        stats.put("shared", 0);

        Map<String, Object> shape = new LinkedHashMap<>();
        shape.put("plan", m.getPlan());
        shape.put("billing", m.getBilling());
        shape.put("gateway", m.getGateway());
        shape.put("planLabel", m.getPlanLabel());
        shape.put("price", m.getPrice());
        shape.put("status", m.getStatus());
        shape.put("startedAt", m.getStartDate() == null ? null : m.getStartDate().toString());
        shape.put("renewsAt", m.getEndDate() == null ? null : m.getEndDate().toString());
        shape.put("stats", stats);
        return shape;
    }
}

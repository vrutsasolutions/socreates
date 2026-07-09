package com.ideaspark.controller;

import com.ideaspark.model.BlockedUser;
import com.ideaspark.model.User;
import com.ideaspark.repository.BlockedUserRepository;
import com.ideaspark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/blocks")
@RequiredArgsConstructor
public class BlockController {

    private final BlockedUserRepository blockedUserRepository;
    private final UserRepository userRepository;

    @PostMapping("/{userId}")
    public ResponseEntity<?> blockUser(
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User blocker = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Logged-in user not found"));

        User blocked = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User to block not found"));

        if (blocker.getId().equals(blocked.getId())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "You cannot block yourself"
            ));
        }

        if (blockedUserRepository.existsByBlockerAndBlocked(blocker, blocked)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "User already blocked"
            ));
        }

        BlockedUser blockedUser = BlockedUser.builder()
                .blocker(blocker)
                .blocked(blocked)
                .build();

        blockedUserRepository.save(blockedUser);

        return ResponseEntity.ok(Map.of(
                "message", "User blocked successfully"
        ));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<?> unblockUser(
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User blocker = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Logged-in user not found"));

        User blocked = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User to unblock not found"));

        BlockedUser blockedUser = blockedUserRepository
                .findByBlockerAndBlocked(blocker, blocked)
                .orElseThrow(() -> new RuntimeException("Block record not found"));

        blockedUserRepository.delete(blockedUser);

        return ResponseEntity.ok(Map.of(
                "message", "User unblocked successfully"
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMyBlockedUsers(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User currentUser = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Logged-in user not found"));

        List<Map<String, Object>> blockedUsers = blockedUserRepository
                .findByBlocker(currentUser)
                .stream()
                .map(block -> Map.<String, Object>of(
                        "id", block.getBlocked().getId(),
                        "name", block.getBlocked().getName(),
                        "email", block.getBlocked().getEmail(),
                        "username", block.getBlocked().getUsername()
                ))
                .toList();

        return ResponseEntity.ok(blockedUsers);
    }
}
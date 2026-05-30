package com.ideaspark.service;

import com.ideaspark.dto.AuthResponse;
import com.ideaspark.dto.LoginRequest;
import com.ideaspark.dto.RegisterRequest;
import com.ideaspark.dto.UserDTO;
import com.ideaspark.model.User;
import com.ideaspark.repository.UserRepository;
import com.ideaspark.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    // ── Register ─────────────────────────────────────────────
    public AuthResponse register(RegisterRequest req) {
        if (req.getName() == null || req.getName().isBlank())
            throw new RuntimeException("Name is required");
        if (req.getEmail() == null || req.getEmail().isBlank())
            throw new RuntimeException("Email is required");
        if (req.getPassword() == null || req.getPassword().length() < 6)
            throw new RuntimeException("Password must be at least 6 characters");

        String email = req.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email))
            throw new RuntimeException("An account with this email already exists");

        User user = User.builder()
                .name(req.getName().trim())
                .email(email)
                .password(passwordEncoder.encode(req.getPassword()))
                .isPremium(false)
                .build();

        userRepository.save(user);
        return buildResponse(user);
    }

    // ── Login ────────────────────────────────────────────────
    public AuthResponse login(LoginRequest req) {
        String email = req.getEmail() == null ? "" : req.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Wrong email or password"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword()))
            throw new RuntimeException("Wrong email or password");

        return buildResponse(user);
    }

    // ── Build AuthResponse (token + user) ────────────────────
    private AuthResponse buildResponse(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setProfileImage(user.getProfileImage());
        dto.setBio(user.getBio());
        dto.setPremium(user.isPremium());

        AuthResponse res = new AuthResponse();
        res.setToken(jwtUtil.generateToken(user.getEmail()));
        res.setUser(dto);
        return res;
    }
}

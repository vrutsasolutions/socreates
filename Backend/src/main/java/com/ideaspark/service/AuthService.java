package com.ideaspark.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.ideaspark.dto.AuthResponse;
import com.ideaspark.dto.LoginRequest;
import com.ideaspark.dto.RegisterRequest;
import com.ideaspark.dto.UserDTO;
import com.ideaspark.model.User;
import com.ideaspark.repository.UserRepository;
import com.ideaspark.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Value("${google.client.id}")
    private String googleClientId;

    private static final java.util.regex.Pattern USERNAME_PATTERN =
            java.util.regex.Pattern.compile("^[a-z0-9._]{3,30}$");

    public AuthResponse register(RegisterRequest req) {
        if (req.getName() == null || req.getName().isBlank())
            throw new RuntimeException("Name is required");
        if (req.getEmail() == null || req.getEmail().isBlank())
            throw new RuntimeException("Email is required");
        if (req.getPassword() == null || req.getPassword().length() < 6)
            throw new RuntimeException("Password must be at least 6 characters");

        String username = normalizeUsername(req.getUsername());

        String email = req.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email))
            throw new RuntimeException("An account with this email already exists");

        if (userRepository.existsByUsername(username))
            throw new RuntimeException("Username '" + username + "' is already taken");

        User user = User.builder()
                .name(req.getName().trim())
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(req.getPassword()))
                .isPremium(false)
                .isVerified(false)
                .build();

        userRepository.save(user);
        return buildResponse(user);
    }

    public AuthResponse googleLogin(String token) {
        if (token == null || token.isBlank()) {
            throw new RuntimeException("Google token is required");
        }

        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    GsonFactory.getDefaultInstance()
            )
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(token);

            if (idToken == null) {
                throw new RuntimeException("Invalid Google token");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();

            String email = payload.getEmail();
            String name = (String) payload.get("name");
            String picture = (String) payload.get("picture");

            if (email == null || email.isBlank()) {
                throw new RuntimeException("Google email not found");
            }

            String normalizedEmail = email.trim().toLowerCase();

            User user = userRepository.findByEmail(normalizedEmail)
                    .orElseGet(() -> {
                        String username = createGoogleUsername(normalizedEmail);

                        User newUser = User.builder()
                                .name(name != null && !name.isBlank() ? name : normalizedEmail.split("@")[0])
                                .username(username)
                                .email(normalizedEmail)
                                .password(passwordEncoder.encode("GOOGLE_AUTH_USER"))
                                .profileImage(picture)
                                .isPremium(false)
                                .isVerified(false)
                                .build();

                        return userRepository.save(newUser);
                    });

            return buildResponse(user);

        } catch (Exception e) {
            throw new RuntimeException("Google authentication failed: " + e.getMessage());
        }
    }

    public boolean isUsernameAvailable(String rawUsername) {
        try {
            String username = normalizeUsername(rawUsername);
            return !userRepository.existsByUsername(username);
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    public String normalizeUsername(String raw) {
        if (raw == null || raw.isBlank())
            throw new RuntimeException("Username is required");

        String username = raw.trim().toLowerCase();

        if (!USERNAME_PATTERN.matcher(username).matches())
            throw new RuntimeException(
                    "Username must be 3–30 characters and may only contain lowercase letters, numbers, '.' and '_'");

        return username;
    }

    public AuthResponse login(LoginRequest req) {
        String email = req.getEmail() == null ? "" : req.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Wrong email or password"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword()))
            throw new RuntimeException("Wrong email or password");

        return buildResponse(user);
    }

    private String createGoogleUsername(String email) {
        String base = email.split("@")[0]
                .toLowerCase()
                .replaceAll("[^a-z0-9._]", "");

        if (base.length() < 3) {
            base = "user" + System.currentTimeMillis();
        }

        if (base.length() > 20) {
            base = base.substring(0, 20);
        }

        String username = base;
        int count = 1;

        while (userRepository.existsByUsername(username)) {
            username = base + count;
            count++;
        }

        return username;
    }

    private AuthResponse buildResponse(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setUsername(user.getUsername());
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
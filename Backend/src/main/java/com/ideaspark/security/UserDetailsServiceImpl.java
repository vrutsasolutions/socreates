package com.ideaspark.security;

import com.ideaspark.model.User;
import com.ideaspark.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

// ── UserDetailsService ───────────────────────────────────────
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    // Single source of truth for who counts as "admin" — same property backs
    // the hasRole("ADMIN") check in SecurityConfig for /api/admin/pools/**.
    @Value("${app.admin.email}")
    private String adminEmail;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        List<GrantedAuthority> authorities = adminEmail.equalsIgnoreCase(user.getEmail())
                ? List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
                : Collections.emptyList();

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                authorities
        );
    }
}

package com.ideaspark.config;

import com.ideaspark.security.JwtFilter;
import com.ideaspark.security.JwtUtil;
import com.ideaspark.security.UserDetailsServiceImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.*;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;

    public SecurityConfig(JwtUtil jwtUtil, UserDetailsServiceImpl userDetailsService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }

    @Value("${cors.allowed-origins}")
    private String allowedOriginsRaw;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .formLogin(fl -> fl.disable())
            .httpBasic(hb -> hb.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(sm ->
                sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
    // Allow all CORS preflight requests
    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
    // Razorpay calls this with no JWT — only X-Razorpay-Signature.
    // RazorpayWebhookService's HMAC check is what actually guards it.
    .requestMatchers("/api/webhooks/**").permitAll()
    // Revenue-pool distribution is an ops/admin trigger, not something any
    // logged-in user should be able to call. Previously this sat under
    // anyRequest().authenticated(), which let ANY authenticated user kick
    // off a distribution run for any month. Now it requires a valid JWT
    // *and* the ROLE_ADMIN authority, which UserDetailsServiceImpl only
    // grants to app.admin.email. AdminRevenueController also carries
    // @PreAuthorize("hasRole('ADMIN')") as defense in depth.
    .requestMatchers("/api/admin/pools/**").hasRole("ADMIN")
    // Moderation actions (ban + delete a user's account) — same reasoning
    // as /api/admin/pools/** above: gated at both the URL and method level.
    .requestMatchers("/api/admin/users/**").hasRole("ADMIN")
    // Public endpoints — no token needed
    .requestMatchers("/api/auth/**").permitAll()
    // AI endpoints burn Groq quota per call — must be logged in to use them,
    // so anonymous callers can't run up the bill. See AiController.
    .requestMatchers("/api/ai/**").authenticated()
    .requestMatchers("/api/ideas").permitAll()
    .requestMatchers("/api/ideas/{id}").permitAll()
    .requestMatchers("/api/search").permitAll()
    .requestMatchers("/api/plagiarism/**").permitAll()
    .requestMatchers("/ws/**").permitAll()
    .requestMatchers("/api/ideas/*/comments").permitAll()
    // Read-tracking is public (anonymous readers count too)
    .requestMatchers(HttpMethod.POST, "/api/creator/ideas/*/read").permitAll()
    // Creator dashboard & earnings require authentication
    .requestMatchers("/api/creator/**").authenticated()
    // Authenticated endpoints
    .requestMatchers("/api/notifications/**").authenticated()
    .requestMatchers("/api/follow/**").authenticated()  // ✅ Added
    .requestMatchers("/api/ideas/*/like").authenticated()  // ✅ Added
    .requestMatchers("/api/ideas/*/unlike").authenticated()  // ✅ Added
    // All other endpoints require authentication
    .anyRequest().authenticated()
)
            .addFilterBefore(new JwtFilter(jwtUtil, userDetailsService), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList(allowedOriginsRaw.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}

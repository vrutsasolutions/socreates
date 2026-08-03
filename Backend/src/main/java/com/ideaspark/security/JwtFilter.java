package com.ideaspark.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class JwtFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtFilter.class);

    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;

    public JwtFilter(JwtUtil jwtUtil, UserDetailsServiceImpl userDetailsService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        // Let CORS preflight requests pass through without JWT check
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            chain.doFilter(request, response);
            return;
        }

        String token = extractToken(request);

        if (token != null) {
            if (jwtUtil.isTokenValid(token)) {
                String email = jwtUtil.extractEmail(token);
                try {
                    UserDetails userDetails = userDetailsService.loadUserByUsername(email);

                    // Revocation check: this token was signed with a
                    // tokenVersion snapshot from whenever it was issued.
                    // If the account's tokenVersion has moved on since —
                    // password change, forgot-password reset, or explicit
                    // logout — treat an otherwise cryptographically valid,
                    // unexpired token as dead. Without this, none of those
                    // actions could ever actually invalidate a token
                    // already in an attacker's hands.
                    if (userDetails instanceof AppUserPrincipal principal
                            && principal.getTokenVersion() != jwtUtil.extractTokenVersion(token)) {
                        log.debug("JWT tokenVersion mismatch (revoked) for {}", email);
                        SecurityContextHolder.clearContext();
                        chain.doFilter(request, response);
                        return;
                    }

                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                } catch (UsernameNotFoundException ex) {
                    // The JWT signature/expiry is valid, but the account it
                    // points at no longer exists — deleted, or banned via
                    // UserAccountService.deleteAndBan(). Previously this
                    // exception propagated straight out of the filter chain
                    // (filters run before GlobalExceptionHandler's
                    // @RestControllerAdvice, which only catches exceptions
                    // thrown inside controller methods), so every request a
                    // banned/deleted user made with their old token blew up
                    // as a raw 500 instead of a clean 401. Leave the
                    // SecurityContext unauthenticated instead and let
                    // Spring Security's normal access-denied handling take
                    // over downstream — the request is treated exactly like
                    // any other unauthenticated call.
                    log.debug("JWT valid but user no longer exists: {}", email);
                    SecurityContextHolder.clearContext();
                }
            }
        }
        chain.doFilter(request, response);
    }

    // Prefer the Authorization header (used by the Capacitor native app and
    // any non-browser API client); fall back to the httpOnly auth_token
    // cookie the web app now relies on instead of localStorage.
    private String extractToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        jakarta.servlet.http.Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (jakarta.servlet.http.Cookie cookie : cookies) {
                if (CookieUtil.COOKIE_NAME.equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
}
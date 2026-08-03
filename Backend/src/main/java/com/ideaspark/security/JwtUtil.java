package com.ideaspark.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @PostConstruct
   public void validateSecret() {
       if (secret == null || secret.isBlank() || secret.length() < 32) {
           throw new IllegalStateException("JWT_SECRET is missing or too short. Refusing to start.");
       }
   }

    @Value("${jwt.expiration}")
    private long expiration;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    private static final String CLAIM_TOKEN_VERSION = "tv";

    public long getExpirationMillis() {
        return expiration;
    }

    // Generate token from email + the account's current tokenVersion, so
    // JwtFilter can reject this token later without needing a blacklist
    // table — see User.tokenVersion.
    public String generateToken(String email, int tokenVersion) {
        return Jwts.builder()
                .setSubject(email)
                .claim(CLAIM_TOKEN_VERSION, tokenVersion)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    // Extract email from token
    public String extractEmail(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    // Extract the tokenVersion this token was issued with. Tokens minted
    // before this claim existed have no "tv" claim at all — treat those as
    // version 0, which matches the DB default for every existing user, so
    // the rollout doesn't force a mass logout.
    public int extractTokenVersion(String token) {
        Object claim = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .get(CLAIM_TOKEN_VERSION);
        return claim == null ? 0 : ((Number) claim).intValue();
    }

    // Check if token is valid
    public boolean isTokenValid(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
package com.ideaspark.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

import java.util.Collection;

/**
 * Spring Security's built-in {@link User} principal has no room for
 * app-specific fields. JwtFilter needs the account's current
 * {@code tokenVersion} to decide whether the presented JWT has been revoked
 * (password change, forgot-password reset, or logout — see
 * com.ideaspark.model.User#tokenVersion), so UserDetailsServiceImpl returns
 * this subclass instead, piggy-backing on the same DB row it already loads.
 */
public class AppUserPrincipal extends User {

    private final int tokenVersion;

    public AppUserPrincipal(String email, String password,
                             Collection<? extends GrantedAuthority> authorities,
                             int tokenVersion) {
        super(email, password, authorities);
        this.tokenVersion = tokenVersion;
    }

    public int getTokenVersion() {
        return tokenVersion;
    }
}
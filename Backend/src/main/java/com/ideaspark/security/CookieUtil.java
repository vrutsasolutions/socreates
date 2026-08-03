package com.ideaspark.security;

import org.springframework.http.ResponseCookie;

import java.time.Duration;

/**
 * Centralizes the auth cookie's attributes so login/register/google-login/
 * change-password/logout can't drift out of sync with each other.
 *
 * The JWT is still also returned in the JSON response body (AuthResponse) —
 * that's what the Capacitor native app's WebView reads, since a
 * cross-origin cookie isn't guaranteed to round-trip the same way there.
 * The web app, however, no longer persists that body token to localStorage
 * (see AuthContext.jsx) — it relies on this cookie instead, so a stolen
 * body token from a single intercepted response can't be replayed
 * indefinitely from JS-accessible storage.
 */
public final class CookieUtil {

    public static final String COOKIE_NAME = "auth_token";

    private CookieUtil() {
    }

    public static ResponseCookie buildAuthCookie(String token, long maxAgeMillis) {
        return ResponseCookie.from(COOKIE_NAME, token)
                .httpOnly(true)
                .secure(true)
                // "None" because the SPA (socreate.in) and API (api.socreate.in)
                // are different subdomains — Lax would silently drop the cookie
                // on the cross-site XHR. Requires Secure=true, which is already
                // set above (browsers reject SameSite=None without it).
                .sameSite("None")
                .path("/")
                .maxAge(Duration.ofMillis(maxAgeMillis))
                .build();
    }

    /** Overwrites the cookie with an immediately-expired one so the browser drops it. */
    public static ResponseCookie clearAuthCookie() {
        return ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(true)
                .sameSite("None")
                .path("/")
                .maxAge(0)
                .build();
    }
}
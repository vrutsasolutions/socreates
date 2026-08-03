package com.ideaspark.controller;

import com.ideaspark.dto.*;
import com.ideaspark.security.CookieUtil;
import com.ideaspark.security.JwtUtil;
import com.ideaspark.service.AuthService;
import com.ideaspark.service.RateLimiterService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final RateLimiterService rateLimiterService;
    private final JwtUtil jwtUtil;

    public AuthController(AuthService authService, RateLimiterService rateLimiterService, JwtUtil jwtUtil) {
        this.authService = authService;
        this.rateLimiterService = rateLimiterService;
        this.jwtUtil = jwtUtil;
    }

    // Every endpoint that hands out a token also sets it as an httpOnly
    // cookie, in addition to the JSON body — the web app no longer stores
    // the body token in localStorage (see AuthContext.jsx) and relies on
    // this cookie for subsequent requests instead, so an XSS reading
    // page/JS-accessible storage can't lift a live session token anymore.
    private void setAuthCookie(HttpServletResponse response, String token) {
        response.addHeader(HttpHeaders.SET_COOKIE,
                CookieUtil.buildAuthCookie(token, jwtUtil.getExpirationMillis()).toString());
    }

    // POST /api/auth/register
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest req, HttpServletResponse response) {
        AuthResponse res = authService.register(req);
        setAuthCookie(response, res.getToken());
        return ResponseEntity.ok(res);
    }

    // POST /api/auth/login
    //
    // Rate-limited per email (5 attempts / 15 min) — unlike the OTP-based
    // register/forgot-password flows, this plain password check previously
    // had no brute-force protection at all. Checked here, before
    // AuthService touches the DB, same pattern as AiController's refine/chat
    // endpoints.
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req, HttpServletResponse response) {
        String email = req.getEmail() == null ? "" : req.getEmail().trim().toLowerCase();

        if (!rateLimiterService.allowLogin(email)) {
            return ResponseEntity.status(429)
                    .body(new ApiResponse(false,
                            "Too many login attempts. Please wait a few minutes and try again."));
        }

        AuthResponse res = authService.login(req);
        setAuthCookie(response, res.getToken());
        return ResponseEntity.ok(res);
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@RequestBody GoogleAuthRequest request, HttpServletResponse response) {
        AuthResponse res = authService.googleLogin(request.getToken());
        setAuthCookie(response, res.getToken());
        return ResponseEntity.ok(res);
    }

    // POST /api/auth/logout
    //
    // Previously didn't exist at all — the frontend already called it
    // (authApi.jsx) and silently ignored the 404. Now it actually revokes
    // the token: bumps the account's tokenVersion (see
    // AuthService#invalidateAllTokens), so the token — wherever else it
    // might be sitting, e.g. lifted via XSS before this fix — stops working
    // on its very next request instead of quietly remaining valid until its
    // 24h expiry. Also clears the cookie so the browser drops it locally.
    // No-ops safely if called with no/an already-invalid session.
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse> logout(@AuthenticationPrincipal UserDetails userDetails,
                                               HttpServletResponse response) {
        if (userDetails != null) {
            authService.invalidateAllTokens(userDetails.getUsername());
        }
        response.addHeader(HttpHeaders.SET_COOKIE, CookieUtil.clearAuthCookie().toString());
        return ResponseEntity.ok(new ApiResponse(true, "Logged out"));
    }

    // GET /api/auth/session-token
    //
    // The WebSocket STOMP CONNECT (see WebSocketAuthConfig) authenticates
    // via a native "Authorization" STOMP header that the browser can't
    // attach automatically the way it does the auth cookie for normal HTTP
    // requests — SockJS/STOMP has no equivalent of withCredentials for that
    // header. So the frontend calls this endpoint (cookie-authenticated,
    // via JwtFilter's cookie fallback) right before opening the socket, and
    // holds the returned token only in memory for that connection — it is
    // never written to localStorage, so it isn't sitting around for an XSS
    // to read the way the old standing localStorage token was.
    @GetMapping("/session-token")
    public ResponseEntity<?> sessionToken(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(new ApiResponse(false, "Not authenticated"));
        }
        return ResponseEntity.ok(java.util.Map.of("token", authService.getSessionToken(userDetails.getUsername())));
    }

    // GET /api/auth/check-username?username=mayank
    // success=true → available; success=false → taken or invalid.
    @GetMapping("/check-username")
    public ResponseEntity<ApiResponse> checkUsername(@RequestParam String username) {
        boolean available = authService.isUsernameAvailable(username);
        return ResponseEntity.ok(new ApiResponse(
                available,
                available ? "Username is available" : "Username is not available"));
    }
}
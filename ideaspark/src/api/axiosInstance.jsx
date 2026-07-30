import axios from "axios";

const axiosInstance = axios.create({
  // Env-driven so the app works from a phone on the LAN (set VITE_API_BASE_URL
  // to http://<your-pc-ip>:8081/api). Falls back to localhost for desktop dev.
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8081/api",
});

const TOKEN_KEYS = ["token", "authToken", "jwt", "accessToken"];

const getToken = () => {
  for (const k of TOKEN_KEYS) {
    const v = localStorage.getItem(k);
    if (v) return v;
  }
  return null;
};

axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Clears the session and bounces to /login. Callers decide WHEN a failure
// actually means "dead session" (see the response interceptor below and
// notificationApi.jsx's onStompError for the two current callers) — this
// function just performs the clear + redirect unconditionally once called.
//
// This used to also re-check the JWT's decoded `exp` claim before doing
// anything, to avoid hijacking a *genuine* authorization error (valid
// session, action just isn't allowed) as if it were a dead session. But
// decoding a JWT client-side only reads the payload — it can't verify the
// signature. A token with a tampered/invalid signature still decodes to a
// perfectly normal, unexpired `exp`, so that check silently let a truly
// dead session (bad signature — same as expired/missing, from the server's
// point of view) loop 401s/403s forever instead of ever redirecting. The
// server's response status is the only trustworthy signal here; see the
// callers below for how they decide.
export const forceLogout = () => {
  localStorage.clear();
  const path = window.location.pathname;
  const onPublicPage = ["/", "/login", "/register", "/forgot-password"].includes(path);
  if (!onPublicPage) {
    const redirect = encodeURIComponent(path + window.location.search);
    // Full navigation so the React tree re-reads the now-cleared auth state.
    window.location.replace(`/login?session=expired&redirect=${redirect}`);
  }
};

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    // Login/register own their own error UX — never hijack them.
    const isAuthEndpoint = url.includes("/auth/");
    // The ONLY endpoints in this app with a real role-based 403 for a
    // genuinely logged-in user (see SecurityConfig: hasRole("ADMIN")).
    // Every other authenticated route in this app is a plain
    // .authenticated() check with no finer-grained permission layer, so a
    // 401 *or* 403 anywhere else means the request was never authenticated
    // in the first place — same root cause as a dead session, regardless of
    // what the client-decoded token looks like.
    const isAdminEndpoint = url.includes("/admin/");

    if ((status === 401 || status === 403) && !isAuthEndpoint && !isAdminEndpoint) {
      forceLogout();
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
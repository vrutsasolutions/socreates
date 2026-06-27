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

// True when the JWT is missing, malformed, or its `exp` is in the past.
// Used to tell a *dead session* (token expired/gone) apart from a genuine
// authorization failure (valid token, but the action isn't allowed).
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const { exp } = JSON.parse(atob(token.split(".")[1]));
    return !exp || exp * 1000 <= Date.now();
  } catch {
    return true; // unparseable token — treat as dead
  }
};

axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global auth-failure handler. The backend returns 401/403 for requests that
// reach an authenticated endpoint without a usable token. Because every
// browseable page (feed, idea detail, comments) is public, an expired session
// stays invisible until the first authenticated call — historically surfacing
// as a confusing error (e.g. "User not found" on a profile tap).
//
// When such a failure coincides with a missing/expired token, the session is
// dead: clear it and bounce to /login. A 401/403 while the token is still valid
// is a real authorization error, so we leave those for the calling page.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    // Login/register own their own error UX — never hijack them.
    const isAuthEndpoint = url.includes("/auth/");

    if (
      (status === 401 || status === 403) &&
      !isAuthEndpoint &&
      isTokenExpired(getToken())
    ) {
      localStorage.clear();
      const path = window.location.pathname;
      const onPublicPage = ["/", "/login", "/register", "/forgot-password"].includes(path);
      if (!onPublicPage) {
        const redirect = encodeURIComponent(path + window.location.search);
        // Full navigation so the React tree re-reads the now-cleared auth state.
        window.location.replace(`/login?session=expired&redirect=${redirect}`);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

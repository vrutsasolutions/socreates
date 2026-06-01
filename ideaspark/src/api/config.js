// ════════════════════════════════════════════════════════════════════════
//  API mock switch
//  ----------------------------------------------------------------------
//  Each domain has a flag. `true`  = use local dummy data (feature still
//  under development on the backend). `false` = call the real endpoint.
//
//  WORKFLOW: When Vishakha confirms an endpoint is live and matches
//  API_CONTRACT.md, flip its flag to `false` and re-test. No other code
//  changes are needed — every api module reads these flags.
// ════════════════════════════════════════════════════════════════════════

export const USE_MOCK = {
  auth:          false, // ✅ backend ready  — /api/auth/login,/register
  otp:           true,  // ⏳ under dev      — /api/auth/send-otp,/verify-otp (Vishakha)
  users:         false, // ✅ backend ready  — /api/users/*
  ideas:         false, // ✅ backend ready  — /api/ideas/*
  search:        false, // ✅ backend ready  — /api/search
  ai:            true,  // ⏳ under dev      — /api/ai/*       (Vishakha)
  images:        true,  // ⏳ under dev      — /api/images/*   (Vishakha)
  notifications: true,  // ⏳ under dev      — /api/notifications/* (Vishakha)
};

// Simulate network latency so loading states are exercised during dev.
export const MOCK_DELAY_MS = 600;

// Wrap dummy data in an axios-shaped response: pages keep using
// `const { data } = await someApiCall()` unchanged.
export const mockResponse = (data, delay = MOCK_DELAY_MS) =>
  new Promise((resolve) => setTimeout(() => resolve({ data }), delay));

// Simulate a rejected request (for testing error states).
export const mockError = (status = 500, message = 'Mock error', delay = MOCK_DELAY_MS) =>
  new Promise((_, reject) =>
    setTimeout(
      () => reject({ response: { status, data: { message } }, message }),
      delay,
    ),
  );

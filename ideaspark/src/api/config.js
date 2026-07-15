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
  otp:           false,  // ✅ backend ready  — /api/auth/(send|verify)-otp + /forgot-password/* (OtpController)
  users:         false, // ✅ backend ready  — /api/users/*
  ideas:         false, // ✅ backend ready  — /api/ideas/*
  search:        false, // ✅ backend ready  — /api/search
  ai:            false, // ✅ backend ready — /api/ai/*       (Aparna)
  images:        false, // ✅ backend ready  — /api/images/*   (Vishakha)
  messaging:     false,  // ✅ backend ready      — /api/messages/* (DM/inbox feature; backend TBD) (Aparna)
  payment:       false, // ✅ live sandbox   — /api/payment/*  (Razorpay test keys in Backend/.env)
  feedback:      false, // ✅ backend ready  — /api/feedback/* (Settings > Support > Feedback popup)

  // Notifications are SPLIT, because the backend only shipped part of the contract:
  //   • realtime push  → ✅ LIVE  (STOMP/SockJS, see notificationApi.subscribeToNotifications)
  //   • REST list/unread/mark-read → ⏳ still mock — those endpoints don't exist yet
  //     (backend only has POST /api/notifications/send). Flip when Vishakha adds them.
  notifications:         false,  // ⏳ REST CRUD still mock — /api/notifications GET,read,read-all
  notificationsRealtime: false, // ✅ live STOMP push at ws://localhost:8081/ws → /topic/notifications
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
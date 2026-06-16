import api from './axiosInstance'
import { USE_MOCK, mockResponse } from './config'

export const registerUser = (data) => api.post('/auth/register', data)
export const loginUser    = (data) => api.post('/auth/login',    data)
export const logoutUser   = ()     => api.post('/auth/logout')
export const fetchMe      = ()     => api.get('/users/me')

// GET /api/auth/check-username?username= → { success, message }
// success=true → available; false → taken or invalid.
// MOCK: a few reserved handles are treated as taken so the UI can be exercised.
const MOCK_TAKEN = ['admin', 'mayank', 'vishakha', 'ideaspark']
export const checkUsername = (username) => {
  if (USE_MOCK.auth) {
    const u = String(username || '').trim().toLowerCase()
    const valid = /^[a-z0-9._]{3,30}$/.test(u)
    const available = valid && !MOCK_TAKEN.includes(u)
    return mockResponse({
      success: available,
      message: !valid
        ? 'Username must be 3–30 chars: a–z, 0–9, . or _'
        : available ? 'Username is available' : 'Username is not available',
    })
  }
  return api.get('/auth/check-username', { params: { username } })
}

// ── OTP verification ────────────────────────────────────────────────────────
// Backend: ⏳ under development (Vishakha). Mock-backed until live.
// Flip USE_MOCK.otp → false in config.js when the endpoints are ready.
// MOCK: any 6-digit code is accepted (use 123456 by convention).

// POST /api/auth/send-otp  { email } → { message }
export const sendOtp = (email) =>
  USE_MOCK.otp
    ? mockResponse({ message: 'OTP sent (mock — use 123456)' }, 400)
    : api.post('/auth/send-otp', { email })

// POST /api/auth/verify-otp  { email, code } → { verified: true }
export const verifyOtp = (email, code) => {
  if (USE_MOCK.otp) {
    const ok = /^\d{6}$/.test(String(code))
    return ok
      ? mockResponse({ verified: true })
      : Promise.reject({ response: { status: 400, data: { message: 'Invalid code. Enter the 6-digit code (mock: 123456).' } } })
  }
  return api.post('/auth/verify-otp', { email, otp: code })
}

// ── Forgot-password flow ────────────────────────────────────────────────────
// LIVE on the backend (OtpController). Mirrors USE_MOCK.otp so the wizard also
// works against dummy data (any 6-digit code accepted) while developing.

// POST /api/auth/forgot-password/send-otp   { email } → { message }
export const forgotPasswordSendOtp = (email) =>
  USE_MOCK.otp
    ? mockResponse({ message: 'OTP sent (mock — use 123456)' })
    : api.post('/auth/forgot-password/send-otp', { email })

// POST /api/auth/forgot-password/verify-otp { email, otp } → { message }
export const forgotPasswordVerifyOtp = (email, otp) => {
  if (USE_MOCK.otp) {
    return /^\d{6}$/.test(String(otp))
      ? mockResponse({ message: 'OTP verified successfully' })
      : Promise.reject({ response: { status: 400, data: { message: 'Invalid or expired OTP (mock: 123456).' } } })
  }
  return api.post('/auth/forgot-password/verify-otp', { email, otp })
}

// POST /api/auth/forgot-password/reset      { email, newPassword } → { message }
export const forgotPasswordReset = (email, newPassword) =>
  USE_MOCK.otp
    ? mockResponse({ message: 'Password reset successfully' })
    : api.post('/auth/forgot-password/reset', { email, newPassword })

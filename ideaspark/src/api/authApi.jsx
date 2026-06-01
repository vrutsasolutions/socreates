import api from './axiosInstance'
import { USE_MOCK, mockResponse } from './config'

export const registerUser = (data) => api.post('/auth/register', data)
export const loginUser    = (data) => api.post('/auth/login',    data)
export const logoutUser   = ()     => api.post('/auth/logout')
export const fetchMe      = ()     => api.get('/users/me')

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
  return api.post('/auth/verify-otp', { email, code })
}

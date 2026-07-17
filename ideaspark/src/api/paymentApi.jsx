// ════════════════════════════════════════════════════════════════════════
//  paymentApi — membership / subscription endpoints
//  ----------------------------------------------------------------------
//  Mock-first: while USE_MOCK.payment is true these simulate a successful
//  gateway round-trip (no real Razorpay call) and return a premium
//  `user` object with a populated `membership`. Flip USE_MOCK.payment to
//  false once Vishakha ships /api/payment/* per API_CONTRACT.md.
//  Razorpay is the only supported gateway — Stripe was never implemented.
//
//  July 2026 — Scheduled payouts migration:
//  Self-service withdrawals are GONE. requestPayout() has been removed —
//  payouts now fire automatically via a backend cron on the 15th of every
//  month (with daily retries on failure, per HR). This module now only
//  manages the payout DESTINATION (getPayoutDetails / savePayoutDetails);
//  the actual money movement is entirely backend-driven.
// ════════════════════════════════════════════════════════════════════════

import api from './axiosInstance';
import { USE_MOCK, mockResponse } from './config';

const readUser = () => {
  try { return JSON.parse(localStorage.getItem('user')) || {}; }
  catch { return {}; }
};

/** True when the user holds an active Creator Pro subscription. */
export const hasCreatorPro = (user) =>
  !!(user?.creatorPro || (user?.isPremium && user?.membership?.plan === 'creator'));

/**
 * The verified badge is now earned by paying for ANY membership (Premium or
 * Creator Pro). There is no separate verification flow — buying a plan IS the
 * verification. Use this everywhere the "Verified" tag/gate is shown.
 */
export const isVerified = (user) => !!user?.isPremium;

/** Build a membership descriptor from the checkout payload. */
export function buildMembership({ plan, billing, gateway, planLabel, price }) {
  const now    = new Date();
  const renews = new Date(now);
  if (billing === 'yearly') renews.setFullYear(now.getFullYear() + 1);
  else                      renews.setMonth(now.getMonth() + 1);

  return {
    plan,                       // 'reader' | 'creator'
    billing,                    // 'monthly' | 'yearly'
    gateway,                    // 'razorpay'
    planLabel: planLabel ?? 'Premium',
    price:     price ?? '',
    status:    'active',
    startedAt: now.toISOString(),
    renewsAt:  renews.toISOString(),
    stats:     { read: 47, saved: 12, shared: 8 },
  };
}

/** Create a payment order (amount in paise for Razorpay). The live response
 *  also carries `keyId` so the checkout can open without a frontend env var. */
export const createOrder = (payload) =>
  USE_MOCK.payment
    ? mockResponse({
        orderId:  'order_mock_' + Date.now(),
        amount:   (payload.amountPaise ?? 79900),
        currency: 'INR',
      })
    : api.post('/payment/create-order', payload);

/** Confirm the subscription after a successful gateway charge. */
export const subscribe = (payload) =>
  USE_MOCK.payment
    ? mockResponse({
        user: { ...readUser(), isPremium: true, membership: buildMembership(payload) },
      })
    : api.post('/payment/subscribe', payload);

/** Cancel an active membership. */
export const cancelMembership = () =>
  USE_MOCK.payment
    ? mockResponse({ user: { ...readUser(), isPremium: false, membership: null } })
    : api.post('/payment/cancel', {});

/** Request a refund of the most recent captured payment. Reverses the charge
 *  via Razorpay AND revokes premium access immediately — returns the same
 *  { user: {...isPremium:false, membership:null} } shape as cancel, so callers
 *  persist it with login(user, token) identically. The refund.processed webhook
 *  finalizes the money side server-side; no extra frontend step is needed. */
export const refundMembership = () =>
  USE_MOCK.payment
    ? mockResponse({ user: { ...readUser(), isPremium: false, membership: null } })
    : api.post('/payment/refund', {});

/** Fetch current subscription status fresh from the server.
 *  GET /api/payment/status → MembershipDTO { id, plan, status, startDate, endDate }
 *  when a membership is active, or { success:false, message } when there is none. */
export const fetchMySubscription = () =>
  api.get('/payment/status');

/** Fetch historical monthly creator earnings.
 *  Each row: { month, score, earning, status, scheduledFor, paidAt,
 *              destination, failureReason, rolledFrom }
 *  status ∈ Estimating | Scheduled | Processing | Paid | Setup_Missing |
 *           Failed | Rolled_Over | Absorbed */
export const fetchCreatorEarnings = () =>
  api.get('/creator/earnings');

// ── Creator payout destination (RazorpayX) ────────────────────────────────
//  Flow: creator fills out the Payout Setup form once (Personal + Bank/UPI +
//  Tax details). Backend creates a RazorpayX contact + fund account and
//  stores the destination. Money movement is fully automatic afterwards —
//  a monthly cron pays out on the 15th, retries on failure for 3 days, then
//  alerts the creator + admin by email if it still hasn't gone through.

/** Get the creator's saved payout destination (masked).
 *  Response when configured: { configured:true, method, legalName,
 *    maskedPan, maskedMobile, bankName, maskedAccountNumber, ifsc, vpa,
 *    destination, verified }
 *  Response when not set up: { configured:false } */
export const getPayoutDetails = () =>
  USE_MOCK.payment
    ? mockResponse({ configured: false })
    : api.get('/creator/payout-details');

/** Save/replace the payout destination. Creating a new one deactivates the
 *  previous fund account in RazorpayX (best-effort) — full history is kept
 *  server-side for audit, the creator only ever sees the current one.
 *
 *  payload (common, always required):
 *    { legalName, pan, mobile, confirmOwnership: true, method }
 *  payload (method === 'vpa'):
 *    { ...common, vpa }
 *  payload (method === 'bank_account'):
 *    { ...common, accountNumber, confirmAccountNumber, ifsc, bankName }
 */
export const savePayoutDetails = (payload) =>
  USE_MOCK.payment
    ? mockResponse({
        configured: true,
        method: payload.method,
        legalName: payload.legalName,
        maskedPan: 'XXXXX' + String(payload.pan || '').slice(5, 9) + 'X',
        maskedMobile: 'XXXXXX' + String(payload.mobile || '').slice(-4),
        bankName: payload.bankName ?? null,
        maskedAccountNumber: payload.method === 'bank_account'
          ? 'XXXXXXXX' + String(payload.accountNumber || '').slice(-4)
          : null,
        ifsc: payload.ifsc ?? null,
        vpa: payload.method === 'vpa' ? payload.vpa : null,
        destination: payload.method === 'vpa'
          ? payload.vpa
          : `${payload.bankName || 'BANK'} XXXXXXXX${String(payload.accountNumber || '').slice(-4)}`,
        verified: true,
      })
    : api.put('/creator/payout-details', payload);

/**
 * Update ONLY the bank destination for a creator who already has payout
 * details on file — the lighter "Update bank account" flow (Figma screen 4).
 * Does not re-collect legalName / pan / mobile since those don't change per
 * bank swap; the backend is expected to carry them forward from the
 * existing active row.
 *
 * ⚠️ NEEDS BACKEND SUPPORT — targets PUT /creator/payout-details/bank-account,
 * which does not exist on the currently-delivered contract. The existing
 * PUT /creator/payout-details (savePayoutDetails above) requires legalName +
 * pan + mobile on every call, which this screen intentionally doesn't ask
 * for. Flag for Vishakha: add a service method that looks up the creator's
 * current active PayoutAccount row, reuses its legalName/pan/mobile/
 * razorpay_contact_id, and only swaps accountHolderName/accountNumber/ifsc/
 * bankName — otherwise following the exact same insert-new-row +
 * deactivate-old-fund-account flow already built into savePayoutDetails().
 *
 * payload: { accountHolderName, accountNumber, confirmAccountNumber, ifsc, bankName }
 */
export const updateBankAccount = (payload) =>
  USE_MOCK.payment
    ? mockResponse({
        configured: true,
        method: 'bank_account',
        bankName: payload.bankName || 'BANK',
        maskedAccountNumber: 'XXXXXXXX' + String(payload.accountNumber || '').slice(-4),
        ifsc: payload.ifsc ?? null,
        destination: `${payload.bankName || 'BANK'} XXXXXXXX${String(payload.accountNumber || '').slice(-4)}`,
        verified: true,
      })
    : api.put('/creator/payout-details/bank-account', payload);

/** Run the monthly revenue distribution for a month (admin action).
 *  Builds the revenue pool from captured membership payments and writes a
 *  Scheduled (or Rolled_Over, if under ₹500) earnings row per eligible
 *  creator. `month` = ISO 1st-of-month, e.g. '2026-07-01'. Returns
 *  { message, month, totalRevenuePaise, creatorPoolPaise,
 *    socreateSharePaise, earningsCreated, rolledOver, rolledIn }. */
export const distributeRevenue = (month) =>
  api.post(`/admin/pools/${month}/distribute`);

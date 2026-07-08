// ════════════════════════════════════════════════════════════════════════
//  paymentApi — membership / subscription endpoints
//  ----------------------------------------------------------------------
//  Mock-first: while USE_MOCK.payment is true these simulate a successful
//  gateway round-trip (no real Razorpay/Stripe call) and return a premium
//  `user` object with a populated `membership`. Flip USE_MOCK.payment to
//  false once Vishakha ships /api/payment/* per API_CONTRACT.md.
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
    gateway,                    // 'razorpay' | 'stripe'
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

/** Start a Stripe Checkout session (returns a redirect URL on the live API). */
export const stripeCheckout = (payload) =>
  USE_MOCK.payment
    ? mockResponse({
        mock: true,
        user: { ...readUser(), isPremium: true, membership: buildMembership(payload) },
      })
    : api.post('/payment/stripe/checkout', payload);

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

/** Fetch historical monthly creator earnings. */
export const fetchCreatorEarnings = () =>
  api.get('/creator/earnings');

// ── Creator payouts (RazorpayX, test mode) ────────────────────────────────
//  Flow: creator saves payout details once (creates a RazorpayX contact +
//  fund account on the backend), then withdraws a Pending earnings row, which
//  fires a RazorpayX payout and flips the row to "Paid". Gated behind the same
//  USE_MOCK.payment flag as the rest of this module.

/** Get the creator's saved payout destination (masked). */
export const getPayoutDetails = () =>
  USE_MOCK.payment
    ? mockResponse({ configured: false })
    : api.get('/creator/payout-details');

/** Save/update the payout destination.
 *  payload: { method:'vpa', vpa } | { method:'bank_account', accountName, accountNumber, ifsc } */
export const savePayoutDetails = (payload) =>
  USE_MOCK.payment
    ? mockResponse({
        configured: true,
        method: payload.method,
        destination: payload.method === 'vpa'
          ? payload.vpa
          : `${(payload.ifsc || 'BANK').slice(0, 4)} ****${String(payload.accountNumber || '').slice(-4)}`,
        accountName: payload.accountName ?? null,
      })
    : api.put('/creator/payout-details', payload);

/** Withdraw one Pending earnings row. payload: { month: '2026-05-01' } */
export const requestPayout = (payload) =>
  USE_MOCK.payment
    ? mockResponse({
        month: payload.month,
        status: 'Paid',
        payoutId: 'pout_mock_' + Date.now(),
        payoutStatus: 'processing',
      })
    : api.post('/creator/payouts', payload);

/** Run the monthly revenue distribution for a month (admin action).
 *  Builds the revenue pool from captured membership payments and writes a
 *  Pending earnings row per eligible creator. `month` = ISO 1st-of-month, e.g.
 *  '2026-07-01'. Returns { message, month, totalRevenuePaise, creatorPoolPaise,
 *  socreateSharePaise, earningsCreated }. */
export const distributeRevenue = (month) =>
  api.post(`/admin/pools/${month}/distribute`);

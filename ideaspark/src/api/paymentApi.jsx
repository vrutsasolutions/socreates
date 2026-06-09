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

/** Create a payment order (amount in paise for Razorpay). */
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

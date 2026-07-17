// ════════════════════════════════════════════════════════════════════════
// paymentApi — membership, subscription and creator payout destination
//
// Scheduled payout model:
// - Creators no longer request withdrawals.
// - The frontend only manages payout setup/destination.
// - The backend distributes and processes payouts automatically.
// ════════════════════════════════════════════════════════════════════════

import api from "./axiosInstance";
import { USE_MOCK, mockResponse } from "./config";

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
};

/**
 * True when a user has an active Creator Pro subscription.
 */
export const hasCreatorPro = (user) =>
  Boolean(
    user?.creatorPro ||
      (user?.isPremium &&
        user?.membership?.plan === "creator")
  );

/**
 * Membership purchase acts as verification.
 */
export const isVerified = (user) =>
  Boolean(user?.isPremium);

/**
 * Builds a local mock membership descriptor.
 */
export function buildMembership({
  plan,
  billing,
  gateway,
  planLabel,
  price,
}) {
  const now = new Date();
  const renews = new Date(now);

  if (billing === "yearly") {
    renews.setFullYear(now.getFullYear() + 1);
  } else {
    renews.setMonth(now.getMonth() + 1);
  }

  return {
    plan,
    billing,
    gateway,
    planLabel: planLabel ?? "Premium",
    price: price ?? "",
    status: "active",
    startedAt: now.toISOString(),
    renewsAt: renews.toISOString(),
    stats: {
      read: 47,
      saved: 12,
      shared: 8,
    },
  };
}

/**
 * Creates a Razorpay payment order.
 */
export const createOrder = (payload) =>
  USE_MOCK.payment
    ? mockResponse({
        orderId: `order_mock_${Date.now()}`,
        amount: payload.amountPaise ?? 79900,
        currency: "INR",
      })
    : api.post("/payment/create-order", payload);

/**
 * Confirms membership after successful payment.
 */
export const subscribe = (payload) =>
  USE_MOCK.payment
    ? mockResponse({
        user: {
          ...readUser(),
          isPremium: true,
          membership: buildMembership(payload),
        },
      })
    : api.post("/payment/subscribe", payload);

/**
 * Cancels an active membership.
 */
export const cancelMembership = () =>
  USE_MOCK.payment
    ? mockResponse({
        user: {
          ...readUser(),
          isPremium: false,
          membership: null,
        },
      })
    : api.post("/payment/cancel", {});

/**
 * Requests a refund of the latest eligible payment.
 */
export const refundMembership = () =>
  USE_MOCK.payment
    ? mockResponse({
        user: {
          ...readUser(),
          isPremium: false,
          membership: null,
        },
      })
    : api.post("/payment/refund", {});

/**
 * Fetches the authenticated user's membership status.
 */
export const fetchMySubscription = () =>
  api.get("/payment/status");

/**
 * Fetches creator earnings history.
 *
 * Row fields may include:
 * month, score, earning, status, scheduledFor, paidAt,
 * destination, failureReason, retryCount.
 */
export const fetchCreatorEarnings = () =>
  api.get("/creator/earnings");

// ── Creator payout destination ───────────────────────────────────────────

/**
 * Gets the currently active payout destination.
 *
 * Live response:
 * {
 *   configured,
 *   method,
 *   accountHolderName,
 *   bankName,
 *   destination,
 *   maskedPan,
 *   maskedMobile,
 *   active,
 *   verified
 * }
 */
export const getPayoutDetails = () =>
  USE_MOCK.payment
    ? mockResponse({
        configured: false,
        active: false,
        verified: false,
      })
    : api.get("/creator/payout-details");

/**
 * Creates or replaces a payout destination.
 *
 * Common required payload:
 * {
 *   method,
 *   legalName,
 *   mobileNumber,
 *   panNumber,
 *   ownershipConfirmed
 * }
 *
 * VPA:
 * {
 *   ...common,
 *   vpa
 * }
 *
 * Bank:
 * {
 *   ...common,
 *   accountHolderName,
 *   accountNumber,
 *   confirmAccountNumber,
 *   ifscCode,
 *   bankName
 * }
 */
export const savePayoutDetails = (payload) =>
  USE_MOCK.payment
    ? mockSavePayoutDetails(payload)
    : api.put("/creator/payout-details", payload);

/**
 * Admin distribution endpoint.
 */
export const distributeRevenue = (month) =>
  api.post(`/admin/pools/${month}/distribute`);

function mockSavePayoutDetails(payload) {
  const isBank =
    payload.method === "bank_account";

  const accountNumber =
    String(payload.accountNumber ?? "");

  const mobileNumber =
    String(payload.mobileNumber ?? "");

  const panNumber =
    String(payload.panNumber ?? "").toUpperCase();

  const destination = isBank
    ? `${payload.bankName || "BANK"} ****${accountNumber.slice(-4)}`
    : maskVpa(payload.vpa);

  return mockResponse({
    configured: true,
    method: payload.method,
    accountHolderName:
      payload.accountHolderName ||
      payload.legalName ||
      null,
    bankName: isBank
      ? payload.bankName || null
      : null,
    destination,
    maskedPan: maskPan(panNumber),
    maskedMobile: maskMobile(mobileNumber),
    active: true,
    verified: true,
  });
}

function maskPan(pan) {
  if (!pan) {
    return null;
  }

  if (pan.length < 6) {
    return "****";
  }

  return `${pan.slice(0, 5)}****${pan.slice(-1)}`;
}

function maskMobile(mobile) {
  const digits =
    String(mobile).replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  if (digits.length <= 4) {
    return "****";
  }

  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

function maskVpa(vpa) {
  if (!vpa) {
    return null;
  }

  const atIndex = vpa.indexOf("@");

  if (atIndex <= 0) {
    return vpa;
  }

  const prefix = vpa.slice(0, atIndex);
  const provider = vpa.slice(atIndex);

  const visiblePrefix =
    prefix.length <= 2
      ? prefix.slice(0, 1)
      : prefix.slice(0, 2);

  return `${visiblePrefix}***${provider}`;
}
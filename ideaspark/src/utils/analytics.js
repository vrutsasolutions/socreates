// ══════════════════════════════════════════════════════════════════════════
// File: src/utils/analytics.js
//
// Thin wrapper around @capacitor-firebase/analytics so the rest of the app
// never touches the plugin directly. Two things this buys us:
//
//   1. A single place to no-op on web. The plugin's web implementation
//      needs a full Firebase JS SDK config (apiKey, appId, etc.) which we
//      don't have wired up — only the Android `google-services.json` is
//      configured today (see android/app/google-services.json). Until a
//      web Firebase config exists, every call here is a silent no-op off
//      native, same guard pattern as usePushNotifications.js / useDeepLinks.js.
//   2. A single place to swallow errors. Analytics must never crash or
//      block a user-facing flow (login, signup, purchase) — every call is
//      fire-and-forget.
//
// Event naming follows Firebase's reserved/recommended event conventions
// where one exists (login, sign_up, screen_view, purchase); anything
// SoCreate-specific uses snake_case, e.g. idea_created.
// ══════════════════════════════════════════════════════════════════════════

import { Capacitor } from '@capacitor/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

const IS_NATIVE = Capacitor.isNativePlatform();

// Screen names can arrive as raw route paths like "/idea/:id" — Firebase
// caps screen_class/screen_name length and dislikes params, so keep this
// simple and just strip a leading slash; callers pass a clean name anyway.
function safeParams(params) {
  if (!params) return undefined;
  // Firebase Analytics event params must be string/number/boolean — drop
  // anything else (objects, functions, undefined) rather than let a bad
  // call silently fail plugin-side.
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    const t = typeof value;
    if (t === 'string' || t === 'number' || t === 'boolean') {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Log a Firebase Analytics event. Fire-and-forget, never throws.
 * @param {string} name - event name, e.g. 'login', 'sign_up', 'idea_created'
 * @param {Record<string, string|number|boolean>} [params]
 */
export function logEvent(name, params) {
  if (!IS_NATIVE) return;
  FirebaseAnalytics.logEvent({ name, params: safeParams(params) }).catch((err) => {
    console.warn(`[analytics] logEvent(${name}) failed`, err);
  });
}

/**
 * Log a screen view. Wraps Firebase's reserved screen_view event.
 * @param {string} screenName - e.g. 'Login', 'IdeaDetail'
 * @param {string} [screenClass] - defaults to screenName
 */
export function logScreenView(screenName, screenClass) {
  if (!IS_NATIVE) return;
  FirebaseAnalytics.setCurrentScreen({
    screenName,
    screenClass: screenClass || screenName,
  }).catch((err) => {
    console.warn(`[analytics] logScreenView(${screenName}) failed`, err);
  });
}

/**
 * Associate all subsequent events with a logged-in user. Call on
 * login/signup; call setUserId(null) on logout so events after sign-out
 * aren't misattributed to the previous account.
 * @param {string|null} userId
 */
export function setAnalyticsUserId(userId) {
  if (!IS_NATIVE) return;
  FirebaseAnalytics.setUserId({ userId: userId || null }).catch((err) => {
    console.warn('[analytics] setUserId failed', err);
  });
}

/**
 * Set a user property (e.g. creator tier, membership plan) for segmentation
 * in the Firebase console. Firebase caps this at 25 distinct property names
 * per project — keep additions deliberate.
 * @param {string} key
 * @param {string|null} value
 */
export function setAnalyticsUserProperty(key, value) {
  if (!IS_NATIVE) return;
  FirebaseAnalytics.setUserProperty({ key, value: value == null ? null : String(value) }).catch((err) => {
    console.warn(`[analytics] setUserProperty(${key}) failed`, err);
  });
}
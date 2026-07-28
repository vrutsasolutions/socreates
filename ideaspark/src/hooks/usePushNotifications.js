// ════════════════════════════════════════════════════════════════════════
//  usePushNotifications
//  ----------------------------------------------------------------------
//  Phase 4 of the push notifications rollout (see
//  SoCreate_Push_Notifications_Guide.docx). Covers all four steps:
//    1. Request permission + register with FCM, once the user is logged in.
//    2. Listen for the "registration" event to get the device's FCM token.
//    3. Send that token to the backend (POST /api/device-token — Phase 5).
//    4. Listen for a notification tap and navigate to the relevant screen.
//
//  This does NOT replace NotificationContext's WebSocket connection — that
//  keeps handling live in-app updates while the app is open. This hook only
//  covers the background/closed-app path (FCM → system tray).
//
//  Only runs on native Android/iOS (via Capacitor). It's a no-op in a
//  regular browser tab (`npm run dev`, desktop preview) — @capacitor/push-
//  notifications has no meaningful behavior on the web, and Capacitor.
//  isNativePlatform() is the standard guard for this.
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { useAuth } from '../context/AuthContext';
import { registerDeviceToken } from '../api/pushNotificationApi';

export default function usePushNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Avoid re-registering on every re-render — only (re)run the whole flow
  // when we go from "no user" to "user", not on every AuthContext update.
  const registeredForUserId = useRef(null);

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return;
    if (registeredForUserId.current === user.id) return; // already set up this session
    registeredForUserId.current = user.id;

    let cancelled = false;

    const setup = async () => {
      // Step 1 — request permission, then register with FCM.
      // On Android 13+ this is what actually triggers the POST_NOTIFICATIONS
      // system prompt. If the user denies it, register() below simply never
      // fires a token — we fail silently and the app carries on using
      // WebSocket-only (open-app) notifications, same as today.
      console.log('[push] setup() starting, isNativePlatform=', Capacitor.isNativePlatform());
      try {
        const perm = await PushNotifications.checkPermissions();
        console.log('[push] checkPermissions result:', JSON.stringify(perm));
        if (perm.receive !== 'granted') {
          const req = await PushNotifications.requestPermissions();
          console.log('[push] requestPermissions result:', JSON.stringify(req));
          if (req.receive !== 'granted') {
            console.log('[push] permission NOT granted — stopping here');
            return; // user said no — nothing more to do
          }
        }
        if (cancelled) return;
        console.log('[push] calling register()');
        await PushNotifications.register();
        console.log('[push] register() call completed (token arrives via listener)');
      } catch (err) {
        console.error('[push] setup() threw an error:', err);
      }
    };

    // Step 2 — the device token arrives here, asynchronously, once
    // register() succeeds.
    const registrationListener = PushNotifications.addListener('registration', (token) => {
      // Step 3 — hand it to the backend so it knows where to deliver
      // future pushes for this user. Fire-and-forget: a failure here just
      // means this device won't get background pushes until the next
      // successful registration (e.g. next login) — not worth blocking
      // app startup over.
      registerDeviceToken(token.value, Capacitor.getPlatform())
        .catch((err) => console.error('[push] failed to register device token', err));
    });

    const registrationErrorListener = PushNotifications.addListener('registrationError', (err) => {
      console.error('[push] registration error', err);
    });

    // Foreground receive — the app is open when a push arrives. We
    // deliberately do NOT show anything here: NotificationContext's
    // WebSocket already delivers the same event live while the app is
    // open, so surfacing this too would show a duplicate toast. This
    // listener exists just so the event doesn't go unhandled.
    const receivedListener = PushNotifications.addListener('pushNotificationReceived', () => {});

    // Step 4 — the user tapped a system-tray notification (app was in the
    // background or closed). `notification.notification.data` is whatever
    // the backend attached when it called FirebaseMessaging.send(...) —
    // by convention this should mirror the same `link` shape the in-app
    // notifications already use (e.g. "/ideas/123", "/users/45",
    // "/chat/9"), so this can reuse it directly, same as
    // NotificationToasts does for in-app taps.
    const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const link = action?.notification?.data?.link;
      if (link) navigate(link);
    });

    setup();

    return () => {
      cancelled = true;
      registrationListener.remove();
      registrationErrorListener.remove();
      receivedListener.remove();
      actionListener.remove();
    };
  }, [user, navigate]);
}
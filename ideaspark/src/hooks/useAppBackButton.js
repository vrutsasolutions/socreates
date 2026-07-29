// ════════════════════════════════════════════════════════════════════════
//  useAppBackButton
//  ----------------------------------------------------------------------
//  Makes the Android hardware back button AND the system back gesture
//  (swipe-from-edge on gesture-nav phones — Capacitor's `backButton` event
//  fires for both) behave like a normal native app instead of the default
//  Capacitor behavior, which is: go back in WebView history if there is
//  any, otherwise close the app immediately.
//
//  Priority, checked in order, first match wins:
//    1. An overlay is open (modal/sheet/popover registered via
//       backOverlayStack) → close it. Nothing else happens.
//    2. We're on an individual chat screen (/messages/:id) → go to Inbox
//       (/messages), regardless of how the chat was opened.
//    3. We're anywhere else EXCEPT Home → go straight to Home. This is a
//       fixed destination, not "one step back through history" — e.g.
//       Search, Profile, Settings, and Inbox itself all go directly to
//       Home on a single back press.
//    4. We're already on Home → require a second press within 2s, showing
//       a small "Press back again to exit" toast on the first press.
//       Second press within the window calls App.exitApp().
//
//  Net effect: Chat → Inbox → Home → (confirm) → exit. Every other screen
//  is just → Home → (confirm) → exit.
//
//  Only runs on native Android/iOS via Capacitor — no-op in a regular
//  browser tab, same guard pattern as usePushNotifications.
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { consumeBack } from "../utils/backOverlayStack";

// The only screen where back requires a confirming second press before
// actually exiting the app. Every other screen redirects here first.
const HOME_PATH = "/home";

const EXIT_CONFIRM_WINDOW_MS = 2000;

// Matches an individual chat screen, e.g. "/messages/abc123" — but NOT
// "/messages", "/messages/new", or "/messages/requests" (those fall
// through to the "go to Home" rule below like any other screen).
const CHAT_DETAIL_PATTERN = /^\/messages\/(?!new$|requests$)[^/]+$/;

export default function useAppBackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showExitToast, setShowExitToast] = useState(false);

  // Kept in refs (not state) so the listener closure below always reads
  // the latest values without needing to re-subscribe on every navigation.
  const locationRef = useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);
  const exitArmedRef = useRef(false);
  const exitTimerRef = useRef(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const armExit = () => {
      exitArmedRef.current = true;
      setShowExitToast(true);
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = setTimeout(() => {
        exitArmedRef.current = false;
        setShowExitToast(false);
      }, EXIT_CONFIRM_WINDOW_MS);
    };

    const listenerPromise = CapacitorApp.addListener("backButton", () => {
      // 1. A modal/sheet/popover is open — let it claim the back press.
      if (consumeBack()) return;

      const path = locationRef.current.pathname;

      // 2. On an individual chat screen — always land on Inbox, regardless
      // of how the chat was opened (Inbox row, a profile's "Message"
      // button, a notification tap, etc.).
      if (CHAT_DETAIL_PATTERN.test(path)) {
        navigate("/messages");
        return;
      }

      // 3. Anywhere except Home — go straight to Home. Fixed destination,
      // not a step back through history (so Inbox, Search, Profile,
      // Settings, etc. all land on Home in one press).
      if (path !== HOME_PATH) {
        navigate(HOME_PATH);
        return;
      }

      // 4. Already on Home — require a confirming second press.
      if (exitArmedRef.current) {
        clearTimeout(exitTimerRef.current);
        CapacitorApp.exitApp();
        return;
      }
      armExit();
    });

    return () => {
      clearTimeout(exitTimerRef.current);
      listenerPromise.then((l) => l.remove());
    };
    // navigate is stable from react-router; re-subscribing per-route isn't
    // needed since locationRef.current always has the latest path.
  }, [navigate]);

  return { showExitToast };
}
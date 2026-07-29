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
//    2. We're not on one of the bottom-tab root screens → navigate back
//       one step in-app (React Router, not raw WebView history).
//    3. We ARE on a root screen → require a second press within 2s,
//       showing a small "Press back again to exit" toast on the first
//       press. Second press within the window calls App.exitApp().
//
//  Only runs on native Android/iOS via Capacitor — no-op in a regular
//  browser tab, same guard pattern as usePushNotifications.
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { consumeBack } from "../utils/backOverlayStack";

// Bottom-tab roots + other screens a user commonly lands on directly
// (e.g. after a deep link) where there's nothing meaningful left to go
// "back" to in-app — these are the screens where back should ask for
// confirmation instead of silently exiting.
const EXIT_ROOTS = [
  "/home",
  "/search",
  "/add-idea",
  "/premium",
  "/profile",
  "/messages",
];

const EXIT_CONFIRM_WINDOW_MS = 2000;

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
      const isRoot = EXIT_ROOTS.includes(path);

      // 2. Not on a root screen — just go back a step in-app.
      if (!isRoot) {
        navigate(-1);
        return;
      }

      // 3. On a root screen — require a confirming second press.
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

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
//    2. We're already on Home → require a second press within 2s,
//       showing a small "Press back again to exit" toast on the first
//       press. Second press within the window calls App.exitApp().
//    3. Anywhere else (bottom-tab screens like Explore/Premium/Profile/
//       Messages, or any deeper page like Settings, Creator Dashboard,
//       etc.) → go straight to Home. This is intentionally NOT
//       navigate(-1)/history-based — the product requirement is that
//       back always lands on Home from anywhere, not "one step up
//       wherever you came from."
//
//  Only runs on native Android/iOS via Capacitor — no-op in a regular
//  browser tab, same guard pattern as usePushNotifications.
// ════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { consumeBack } from "../utils/backOverlayStack";

// Only Home requires the "press back again to exit" confirmation.
// Every other screen's back gesture goes straight to Home.
const EXIT_ROOTS = ["/home"];

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
      const isHome = EXIT_ROOTS.includes(path);

      // 2. Not on Home — go straight to Home, from anywhere.
      if (!isHome) {
        navigate("/home");
        return;
      }

      // 3. Already on Home — require a confirming second press to exit.
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
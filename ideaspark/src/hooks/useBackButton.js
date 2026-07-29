// ════════════════════════════════════════════════════════════════════════
//  useBackButton
//  -----------------------------------------------------------------------
//  Handles the Android hardware / gesture back button inside Capacitor.
//
//  Without this, pressing Back on Android immediately exits the app
//  (the WebView has no native navigation stack). This hook intercepts the
//  event and does one of two things:
//
//    • If the user is on a "root" page (one of the bottom-nav tabs), it
//      minimizes the app — same behavior as most native Android apps.
//
//    • Otherwise it navigates back through React Router history, exactly
//      like a browser back button would.
//
//  Only active on native platforms (Android/iOS via Capacitor). It's a
//  complete no-op in a regular browser tab (`npm run dev`).
// ════════════════════════════════════════════════════════════════════════
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

// Pages that live on the bottom navigation bar. Pressing back here should
// minimize the app rather than navigate (there's nowhere useful to go).
const ROOT_PATHS = new Set([
  '/home',
  '/search',
  '/messages',
  '/premium',
  '/profile',
]);

export default function useBackButton() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener('backButton', ({ canGoBack }) => {
      const currentPath = location.pathname;

      // On a root tab → minimize instead of exiting.
      if (ROOT_PATHS.has(currentPath)) {
        App.minimizeApp();
        return;
      }

      // Welcome / login / register — nowhere to go back to, minimize.
      if (['/', '/login', '/register', '/forgot-password'].includes(currentPath)) {
        App.minimizeApp();
        return;
      }

      // Anywhere else → normal back navigation.
      if (canGoBack) {
        window.history.back();
      } else {
        // Safety net: if somehow there's no history, go home.
        navigate('/home', { replace: true });
      }
    });

    return () => {
      listener.remove();
    };
  }, [location.pathname, navigate]);
}

// ════════════════════════════════════════════════════════════════════════
//  useDeepLinks
//  ----------------------------------------------------------------------
//  Handles Android App Links: when someone taps a https://www.socreate.in/...
//  or https://socreate.in/... link (from an email, a shared message, etc.)
//  and the SoCreate app is installed, Android hands the URL to the app
//  instead of opening a browser (see AndroidManifest.xml's autoVerify
//  intent-filter + the assetlinks.json hosted on the website — that pairing
//  is what makes Android trust the app to own these links at all).
//
//  Capacitor surfaces that as an `appUrlOpen` event containing the full
//  URL the OS was asked to open. Without this listener, the WebView just
//  sits on whatever screen it already had open (usually the splash/home
//  screen) — the link tap would otherwise silently do nothing useful.
//  This pulls the path back out of the full URL and hands it to React
//  Router so the app lands on the actual shared idea/profile/etc., the
//  same way a normal deep link works on any native app.
//
//  Covers both cases:
//    - App already running in the background → fires immediately.
//    - App was closed and this link is what launched it → Capacitor
//      queues the event until listeners are attached, so this still
//      catches it once the app finishes mounting.
//
//  Only runs on native Android/iOS via Capacitor — no-op in a regular
//  browser tab, same guard pattern as useAppBackButton/usePushNotifications.
// ════════════════════════════════════════════════════════════════════════
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

export default function useDeepLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listenerPromise = CapacitorApp.addListener("appUrlOpen", ({ url }) => {
      let target;
      try {
        // url looks like "https://www.socreate.in/ideas/abc123?ref=email" —
        // we only want the in-app part: "/ideas/abc123?ref=email".
        const parsed = new URL(url);
        target = parsed.pathname + parsed.search + parsed.hash;
      } catch {
        console.warn("[deep-link] could not parse incoming URL", url);
        return;
      }

      // Guard against a stray custom-scheme callback (e.g. Google Sign-In's
      // own redirect) ever reaching here and navigating somewhere odd —
      // this listener should only ever act on our own http(s) links.
      if (!target || !target.startsWith("/")) return;

      console.log("[deep-link] opening", target);
      navigate(target);
    });

    return () => {
      listenerPromise.then((l) => l.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

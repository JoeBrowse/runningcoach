// Resolved defensively, the same way capPrefs() resolves Preferences —
// true only inside a packaged Capacitor app, so billing code never runs
// (and never needs to work) during `npm run dev` in a plain browser.
export function isNativeRuntime() {
  try {
    return !!(
      typeof window !== "undefined" &&
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === "function" &&
      window.Capacitor.isNativePlatform()
    );
  } catch (e) {
    return false;
  }
}

/* Registers the PWA service worker, which is what lets an installed
   home-screen copy open with no signal.

   Deliberately not registered in the APK. Capacitor already serves the
   bundle from the device, so a cache in front of it buys nothing and can
   only pin someone to a stale build after an update. Also skipped when
   the page is not secure, since registration throws outside HTTPS and
   localhost.

   Failure here is never fatal: no worker means no offline launch, which
   is a worse app but still a working one. */
export function registerServiceWorker() {
  if (isNativeRuntime()) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (typeof window !== "undefined" && !window.isSecureContext) return;
  // Relative, so it registers under whatever subdirectory the app is
  // served from and takes that path as its scope.
  navigator.serviceWorker.register("./sw.js").catch((e) => {
    console.warn("service worker registration failed", e);
  });
}

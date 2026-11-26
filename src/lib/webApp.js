import { isNativeRuntime } from "./platform.js";

/* ---------------------------------------------------------------
   WEB VERSION

   Skid Marks also runs as a website (GitHub Pages). People can install
   it from the browser: Chrome on Android shows an install prompt, and
   Safari on iPhone uses Share > Add to Home Screen.

   This file holds:
   - the platform checks (browser or app, installed or not, iPhone or
     Android);
   - the install prompt that Chrome sends (beforeinstallprompt);
   - WEB_LIMITS: the honest list of what does not work in a browser.
     The app (Settings, first open) and docs/index.html show this list.
     Change both places together.
--------------------------------------------------------------- */

export const SOURCE_URL = "https://github.com/JoeBrowse/skidmarks";
export const APK_URL = "https://github.com/JoeBrowse/skidmarks/releases/latest/download/skid-marks.apk";
export const INSTALL_HINT_DISMISSED_KEY = "install-hint-dismissed";

/** True in a browser, false in the Android app. */
export function isWebApp() {
  return !isNativeRuntime();
}

/** True when the web app runs from the home screen (installed). */
export function isStandalone() {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
  } catch (e) {
    /* old browser */
  }
  return !!(typeof navigator !== "undefined" && navigator.standalone);
}

/** "ios", "android" or "other", from the user agent. */
export function webPlatform(ua) {
  const s = ua != null ? String(ua) : typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  // iPadOS 13+ says "Macintosh"; a touch screen tells it apart from a Mac.
  const touchMac = /Macintosh/.test(s) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(s) || touchMac) return "ios";
  if (/Android/.test(s)) return "android";
  return "other";
}

/** True on a phone or tablet (a touch screen is the main input). */
export function isTouchDevice() {
  try {
    return !!(typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  } catch (e) {
    return false;
  }
}

/* ---------- Install prompt (Chrome, Edge, Samsung Internet) ---------- */

let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

/** Call once at start-up. Keeps Chrome's install prompt for the Install button. */
export function captureInstallPrompt() {
  if (typeof window === "undefined" || isNativeRuntime()) return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

export function canPromptInstall() {
  return !!deferredPrompt;
}

/** Shows the browser's install dialog. Returns "accepted", "dismissed" or "unavailable". */
export async function promptInstall() {
  if (!deferredPrompt) return "unavailable";
  const e = deferredPrompt;
  deferredPrompt = null;
  notify();
  try {
    await e.prompt();
    const choice = await e.userChoice;
    return choice && choice.outcome === "accepted" ? "accepted" : "dismissed";
  } catch (err) {
    return "unavailable";
  }
}

/** Calls fn when the install prompt becomes available or is used. Returns an unsubscribe function. */
export function onInstallPromptChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ---------- Install steps for each platform ---------- */

export function installSteps(platform) {
  if (platform === "ios") {
    return [
      "Open this page in Safari.",
      "Tap the Share button (the square with an arrow).",
      "Tap Add to Home Screen, then Add.",
      "Open Skid Marks from the home screen.",
    ];
  }
  if (platform === "android") {
    return [
      "Open the Chrome menu (three dots).",
      "Tap Install app or Add to Home screen.",
      "Open Skid Marks from the home screen.",
      "For the full app (reminders and the watch link), install the APK.",
    ];
  }
  return [
    "In Chrome or Edge, click the install icon in the address bar.",
    "On a phone, open this page and add it to the home screen.",
  ];
}

/* ---------- Limits of the web version ----------
   Keep this list honest and short. Each item: what fails, and what to do. */

export const WEB_LIMITS = [
  {
    id: "gps",
    title: "GPS needs the screen on",
    body: "The browser stops GPS when the screen locks or when you open another app. Keep Skid Marks open with the screen on during a run. The app keeps the screen on when the phone allows it.",
  },
  {
    id: "voice",
    title: "Voice cues need the screen on",
    body: "Voice cues stop when the screen locks. On an iPhone, they can also stop when other audio plays.",
  },
  {
    id: "reminders",
    title: "No reminders",
    body: "The night-before reminders work only in the Android app. A website cannot send them without a server.",
  },
  {
    id: "watch",
    title: "No watch link",
    body: "The Wear OS watch app needs the Android app on the phone to get the plan and to send runs back.",
  },
  {
    id: "storage",
    title: "Save backups often",
    body: "Your data stays in this browser on this device. If you clear the browser data, it is gone. Safari can delete the data of a website that is not on the home screen after 7 days without use. Add the app to the home screen and save a backup each week (Settings > Backup).",
  },
  {
    id: "vibration",
    title: "No vibration on iPhone",
    body: "iPhone browsers cannot vibrate. On an iPhone, the rest timer uses sound only.",
  },
  {
    id: "devices",
    title: "One device at a time",
    body: "There is no account and no sync. To move to another device, save a backup and restore it on the other device.",
  },
];

/** The short form for the first-open card. */
export const WEB_LIMITS_SHORT =
  "This is the web version. In a browser, GPS and voice cues stop when the screen locks. Reminders and the watch link work only in the Android app. Your data stays in this browser, so save a backup often. Settings shows all the limits.";

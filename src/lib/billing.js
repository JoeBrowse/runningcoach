import { isNativeRuntime } from "./platform.js";
import { safeGet, safeSet } from "./storage.js";

/* ---------------------------------------------------------------
   LICENSING — SUBSCRIPTION WITH A GOOGLE-RUN FREE TRIAL

   Iron Log is a free listing with one subscription behind it. The free
   trial is Google's, not ours: a base-plan offer configured in Play
   Console, which Play enforces at one per Google account, server-side.
   That is the whole reason for the subscription. A device-local trial
   timestamp — which is what this used to be — resets on reinstall, on
   "clear data", and on a rolled-back clock, and nothing short of a
   server can stop that. Play can, so Play does it.

   The price is deliberately NOT in this file. Play Console owns it, per
   country, and the paywall renders whatever the store hands back in the
   user's own currency. Changing what Iron Log costs is a Play Console
   edit and no app release at all.

   Billing plugin: capacitor-plugin-cdv-purchase (the maintained
   Capacitor build of cordova-plugin-purchase / "CdvPurchase", which is
   what Capacitor's own docs point at). Deliberately NOT RevenueCat: that
   needs an account, an API key, and routes every entitlement check
   through a third-party server, which is a strange dependency for an app
   whose pitch is that nothing leaves your phone.

   GOOGLE PLAY CONSOLE SETUP (by hand — the app cannot do this for you):
   1. Monetize -> Subscriptions -> create a subscription with product ID
      exactly "ironlog_pro" (must match SUBSCRIPTION_ID below).
   2. Add two base plans, auto-renewing, with IDs exactly "monthly" and
      "annual" (must match BASE_PLANS). Set a price for each; the annual
      one is the one worth making obviously good value.
   3. On each base plan add a FREE TRIAL offer of 7 days. Play allows one
      trial per Google account per subscription and enforces it itself —
      this is the bit that replaces the old local timestamp.
   4. Activate the subscription. The app must have been uploaded to at
      least an internal testing track before Play returns anything for it.
   5. Setup -> License testing: add your own account and any testers, so
      test subscriptions don't take real money.
--------------------------------------------------------------- */

export const LICENSE_KEY = "license";
export const SUBSCRIPTION_ID = "ironlog_pro";
export const BASE_PLANS = { monthly: "monthly", annual: "annual" };

/* How long a confirmed subscription keeps working with no word from Play.

   This is not a grace period for people who stopped paying — Play tells us
   soon enough. It is for the gym in the basement with no signal, which is
   most of them. Entitlement is confirmed against Play whenever the app can
   reach it, and the answer is cached; between confirmations the app stays
   unlocked. Locking someone out of their own workout because the building
   has thick walls would be a far worse bug than a fortnight of unpaid use. */
export const OFFLINE_GRACE_DAYS = 14;

// Build-time switch for copies that are given away rather than sold: the
// side-loaded debug APK and any self-hosted web build. Google Play Billing
// only serves apps Play itself installed, matching a package name and
// signature it knows, so a side-loaded build could never subscribe — it
// would simply lock itself with a button that cannot work. This makes those
// builds unlocked outright.
//
// Set by VITE_UNLOCKED=1 at build time. The release workflow never sets it,
// so the Play Store bundle keeps the paywall exactly as it is. Deliberately
// derived, never written to storage: an unlocked build must not leave an
// "entitled" record behind that would carry over if a paid build were later
// installed on top of it.
export const UNLOCKED_BUILD = (() => {
  try {
    return import.meta.env && import.meta.env.VITE_UNLOCKED === "1";
  } catch (e) {
    return false;
  }
})();

/* The cached answer to "is this person subscribed". Shape:
     { entitled: boolean, checkedAt: ISO string }
   `checkedAt` is only ever moved forward by a real reply from Play, so a
   rolled-back device clock can extend the offline window but never
   manufacture an entitlement that Play never gave. */
export async function loadLicense() {
  const existing = await safeGet(LICENSE_KEY);
  if (existing && typeof existing.entitled === "boolean") return existing;
  // Anyone who bought the old one-time lifetime unlock keeps it, forever,
  // whatever Play later says about subscriptions. They paid for exactly
  // that and changing the business model is not their problem. The flag is
  // sticky from here on — see setLicenseEntitled.
  const lifetime = !!(existing && existing.purchased);
  const fresh = { entitled: lifetime, lifetime, checkedAt: null };
  await safeSet(LICENSE_KEY, fresh);
  return fresh;
}

export async function setLicenseEntitled(entitled) {
  const current = (await safeGet(LICENSE_KEY)) || {};
  const lifetime = !!current.lifetime;
  const next = { entitled: lifetime || !!entitled, lifetime, checkedAt: new Date().toISOString() };
  await safeSet(LICENSE_KEY, next);
  return next;
}

// Days of offline grace still standing, for the banner on Home. Null when
// there is nothing to count down — not subscribed, or freshly confirmed.
export function offlineGraceDaysLeft(license) {
  if (!license || license.lifetime || !license.entitled || !license.checkedAt) return null;
  const elapsed = (Date.now() - new Date(license.checkedAt).getTime()) / 86400000;
  if (elapsed < 1) return null;
  return Math.max(0, Math.ceil(OFFLINE_GRACE_DAYS - elapsed));
}

export function isLicenseUnlocked(license) {
  if (UNLOCKED_BUILD) return true;
  if (!license) return false;
  // A lifetime buyer is never subject to the offline window either — there
  // is no subscription behind them for Play to have an opinion about.
  if (license.lifetime) return true;
  if (!license.entitled) return false;
  // Entitled and never yet confirmed against Play (the migrated one-time
  // buyers) stays unlocked; there is no check to have gone stale.
  if (!license.checkedAt) return true;
  const elapsed = (Date.now() - new Date(license.checkedAt).getTime()) / 86400000;
  return elapsed <= OFFLINE_GRACE_DAYS;
}

// Screens reachable without a subscription. Everything else redirects to
// the paywall — see setScreen() in App(). Kept as an allowlist (rather than
// a list of gated screens) so a future screen is locked-by-default.
// Home, Settings and the feature list stay open deliberately: someone has
// to be able to see what Iron Log is, and get at Backup to take their data
// with them, whether or not they are paying for it.
export const ALLOWED_WHEN_LOCKED_SCREENS = new Set(["home", "settings", "paywall", "featureList"]);

// Dynamically imports the billing plugin — never at the top of the file —
// so a plain browser session (which never satisfies isNativeRuntime())
// never even attempts to load it. This is what keeps `npm run dev` and any
// non-Capacitor preview working with zero risk of a crash.
export let billingModulePromise = null;
export function loadBillingModule() {
  if (!isNativeRuntime()) return Promise.resolve(null);
  if (!billingModulePromise) {
    billingModulePromise = import("capacitor-plugin-cdv-purchase").catch((e) => {
      console.error("billing plugin unavailable", e);
      return null;
    });
  }
  return billingModulePromise;
}

// What the store currently says the two plans cost, in the user's own
// currency, so the paywall never has to guess. Null until receipts load.
export let cachedOffers = null;

export function readOffers(store) {
  try {
    const product = store.get(SUBSCRIPTION_ID);
    if (!product || !product.offers) return null;
    const out = {};
    for (const [key, planId] of Object.entries(BASE_PLANS)) {
      // An offer's id carries its base plan; the trial offer and the plain
      // offer share one, and either will quote the recurring price.
      const offer = product.offers.find((o) => String(o.id || "").includes(planId));
      if (!offer) continue;
      const phases = offer.pricingPhases || [];
      // The last phase is the one that recurs — earlier phases are the
      // free trial, priced at zero, which is not what to put on a button.
      const recurring = phases[phases.length - 1];
      const trial = phases.find((p) => p && Number(p.priceMicros) === 0);
      out[key] = {
        planId,
        price: recurring ? recurring.price : null,
        trialDays: trial ? isoPeriodToDays(trial.billingPeriod) : 0,
      };
    }
    return Object.keys(out).length ? out : null;
  } catch (e) {
    return null;
  }
}

// Play quotes trial lengths as ISO-8601 durations ("P7D", "P1W", "P1M").
export function isoPeriodToDays(period) {
  const m = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/.exec(String(period || ""));
  if (!m) return 0;
  const [, y, mo, w, d] = m.map((x) => (x ? Number(x) : 0));
  return y * 365 + mo * 30 + w * 7 + d;
}

export let billingInitialized = false;
/* Wires up the store once. onEntitlement fires with the current answer
   whenever Play gives one — right after a subscription starts, and also on
   every launch once receipts finish loading, so a reinstall or a new phone
   unlocks itself without anyone needing to tap "Restore".

   It fires with `false` too. That is the point: a lapsed or cancelled
   subscription has to be able to re-lock the app, which a purchase-only
   callback could never do. */
export async function initBilling(onEntitlement, onOffers) {
  const mod = await loadBillingModule();
  if (!mod || billingInitialized) return;
  billingInitialized = true;
  try {
    const { store, ProductType, Platform } = mod;
    store.register([{ id: SUBSCRIPTION_ID, platform: Platform.GOOGLE_PLAY, type: ProductType.PAID_SUBSCRIPTION }]);
    const report = () => {
      // owned() covers the free-trial period as well as paid renewals —
      // Play treats a trial as an active subscription, which is exactly the
      // behaviour that made this worth moving to.
      onEntitlement(store.owned(SUBSCRIPTION_ID));
      const offers = readOffers(store);
      if (offers) {
        cachedOffers = offers;
        onOffers(offers);
      }
    };
    store
      .when()
      .approved((transaction) => transaction.verify())
      .verified((receipt) => {
        receipt.finish();
        report();
      })
      .receiptsReady(report)
      .productUpdated(report);
    await store.initialize([Platform.GOOGLE_PLAY]);
  } catch (e) {
    console.error("billing init failed", e);
  }
}

// Starts the Play purchase sheet for one base plan. Play itself decides
// whether this account gets the free trial — it will not hand out a second
// one, which is the enforcement we came here for.
export async function subscribe(planKey) {
  const mod = await loadBillingModule();
  if (!mod) return { ok: false };
  try {
    const product = mod.store.get(SUBSCRIPTION_ID);
    if (!product) return { ok: false };
    const planId = BASE_PLANS[planKey];
    const offers = product.offers || [];
    // Prefer an offer carrying a free trial, so a first-time subscriber
    // gets the trial rather than being charged immediately.
    const forPlan = offers.filter((o) => String(o.id || "").includes(planId));
    const offer =
      forPlan.find((o) => (o.pricingPhases || []).some((p) => Number(p.priceMicros) === 0)) ||
      forPlan[0] ||
      (product.getOffer && product.getOffer());
    if (!offer) return { ok: false };
    await offer.order();
    return { ok: true };
  } catch (e) {
    console.error("subscribe failed", e);
    return { ok: false };
  }
}

export async function restorePurchases() {
  const mod = await loadBillingModule();
  if (!mod) return false;
  try {
    await mod.store.restorePurchases();
    return true;
  } catch (e) {
    console.error("restore failed", e);
    return false;
  }
}

/* The Android applicationId, which Play needs in order to resolve the
   subscription management deep link below.

   It is set by `npx cap init` in .github/workflows/android.yml, and the two
   have to agree — Play matches on it, and a mismatch sends the user to a
   page for an app that does not exist. It cannot be changed once an app has
   been created in Play Console, so treat it as fixed. */
export const ANDROID_PACKAGE = "com.iron_log_workout_tracker";

// Deep link to Play's own subscription management, which is where Google
// requires cancellation to be handled. An app that hides this gets rejected.
export function manageSubscriptionUrl() {
  return `https://play.google.com/store/account/subscriptions?sku=${SUBSCRIPTION_ID}&package=${ANDROID_PACKAGE}`;
}

import { ACTIVITY_TYPES } from "../data/activities.js";
import { sessionTime } from "./dates.js";
import { safeGet, safeSet } from "./storage.js";

export function activityType(id) {
  return ACTIVITY_TYPES.find((t) => t.id === id) || ACTIVITY_TYPES[0];
}

// RPE 9 is one rep in reserve, which is what wasHardEffort calls hard.
export const HARD_ACTIVITY_RPE = 9;

// Total seconds of an activity, or null when nothing usable was entered.
export function activitySeconds(a) {
  const m = parseInt((a || {}).minutes, 10);
  const s = parseInt((a || {}).seconds, 10);
  const total = (Number.isFinite(m) ? m : 0) * 60 + (Number.isFinite(s) ? s : 0);
  return total > 0 ? total : null;
}

export function formatDuration(totalSeconds) {
  if (!totalSeconds) return "—";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* Pace for the kinds of activity people think about in pace.

   Runners and walkers read minutes per kilometre; cyclists read speed.
   Reporting one as the other is the sort of thing that makes an app feel
   like it was built by someone who does not do the sport. */
export function activityPace(a) {
  const secs = activitySeconds(a);
  const dist = parseFloat((a || {}).distance);
  const type = activityType((a || {}).type);
  if (!secs || !Number.isFinite(dist) || dist <= 0 || !type.pace) return null;
  if (type.pace === "km/h") return `${(dist / (secs / 3600)).toFixed(1)} km/h`;
  // The split is per whatever unit the sport counts in: a kilometre on
  // foot, 500 metres on an erg, 100 in the pool.
  const per = type.pace === "min/500m" ? 500 : type.pace === "min/100m" ? 100 : 1;
  const unitsCovered = dist / per;
  if (unitsCovered <= 0) return null;
  const split = secs / unitsCovered;
  const label = type.pace.replace("min", "");
  return `${Math.floor(split / 60)}:${String(Math.round(split % 60)).padStart(2, "0")} ${label}`;
}

export function activityLabel(a) {
  const type = activityType((a || {}).type);
  const name = ((a || {}).name || "").trim();
  return (type.id === "other" || type.id === "team-sport") && name ? name : type.label;
}

// Iron Log kept 200 activities. Runners import years of runs, so the cap
// is much higher now. Old data is not changed.
export const ACTIVITY_CAP = 5000;

export async function addActivity(activity) {
  const list = (await safeGet("activity-history")) || [];
  const next = [...list, activity]
    .sort((a, b) => (sessionTime(a) || 0) - (sessionTime(b) || 0))
    .slice(-ACTIVITY_CAP);
  await safeSet("activity-history", next);
  return next;
}

/* Replaces an entry in place, keeping the list in date order.

   A moved activity has to be re-sorted, not just overwritten where it
   sat: change a run from Friday to Monday and it belongs earlier in the
   list, and every reader here assumes the order is the order. */
export async function updateActivity(activity) {
  const list = (await safeGet("activity-history")) || [];
  const next = list
    .map((a) => (a.id === activity.id ? activity : a))
    .sort((a, b) => (sessionTime(a) || 0) - (sessionTime(b) || 0));
  await safeSet("activity-history", next);
  return next;
}

export async function removeActivity(id) {
  const list = (await safeGet("activity-history")) || [];
  const next = list.filter((a) => a.id !== id);
  await safeSet("activity-history", next);
  return next;
}

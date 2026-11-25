import * as engine from "../run/engine.js";
import { isNativeRuntime } from "../lib/platform.js";
import { getRunSettings, setRunSettings, getMasterPlan } from "../shared/store.js";
import { onPlanSaved, todayInfoFor, gymLabel, localToday, loadPlanState } from "./planState.js";
import { dayLine } from "./planText.js";

/* ---------------------------------------------------------------
   NIGHT-BEFORE REMINDER

   One local notification on each evening for the next 7 days:
   "Tomorrow: Easy run 5 km. Gym: Legs (heavy)."
   Settings live in run-settings.reminder:
     { on, time: "20:00", quietFrom: "22:00", quietTo: "07:00" }
   A time inside the quiet hours moves to the start of the quiet hours
   minus 30 minutes. Native only (@capacitor/local-notifications).
   In a browser the screen says that reminders work in the Android app.
--------------------------------------------------------------- */

export const DEFAULT_REMINDER = { on: false, time: "20:00", quietFrom: "22:00", quietTo: "07:00" };
const ID_BASE = 7300; // ids 7300-7306

const toMin = (t) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const fromMin = (n) => `${String(Math.floor(((n % 1440) + 1440) % 1440 / 60)).padStart(2, "0")}:${String((((n % 1440) + 1440) % 1440) % 60).padStart(2, "0")}`;

export function inQuiet(time, from, to) {
  const t = toMin(time), a = toMin(from), b = toMin(to);
  if (t === null || a === null || b === null || a === b) return false;
  return a < b ? t >= a && t < b : t >= a || t < b;
}

/* The time that the reminder really uses. */
export function effectiveTime(r) {
  const s = { ...DEFAULT_REMINDER, ...(r || {}) };
  if (!inQuiet(s.time, s.quietFrom, s.quietTo)) return s.time;
  return fromMin(toMin(s.quietFrom) - 30);
}

/* The text for the evening before `iso`. Null when there is nothing. */
export function reminderText(plan, master, iso, units = "km") {
  const info = todayInfoFor(plan, iso, master);
  const parts = [];
  if (info.run) parts.push(dayLine(info.run, units));
  if (info.gym) parts.push(`Gym: ${gymLabel(info.gym)}`);
  if (!parts.length) return null;
  return `Tomorrow: ${parts.join(". ")}.`;
}

/* The notifications for the next 7 evenings: [{id, at: Date, title, body}]. */
export function reminderSchedule(plan, master, settings, now = new Date(), units = "km") {
  const r = { ...DEFAULT_REMINDER, ...(settings || {}) };
  if (!r.on) return [];
  const [hh, mm] = effectiveTime(r).split(":").map(Number);
  const out = [];
  const today = localToday(now);
  for (let k = 0; k < 7; k++) {
    const evening = engine.addDays(today, k);
    const tomorrow = engine.addDays(evening, 1);
    const body = reminderText(plan, master, tomorrow, units);
    if (!body) continue;
    const [y, mo, d] = evening.split("-").map(Number);
    const at = new Date(y, mo - 1, d, hh, mm, 0, 0);
    if (at.getTime() <= now.getTime() + 60000) continue;
    out.push({ id: ID_BASE + k, at, title: "Skid Marks", body });
  }
  return out;
}

async function plugin() {
  if (!isNativeRuntime()) return null;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    return LocalNotifications;
  } catch (e) {
    return null;
  }
}

/* Asks for permission. Returns "granted", "denied" or "web". */
export async function requestReminderPermission() {
  const LN = await plugin();
  if (!LN) return "web";
  try {
    let p = await LN.checkPermissions();
    if (p.display !== "granted") p = await LN.requestPermissions();
    return p.display === "granted" ? "granted" : "denied";
  } catch (e) {
    return "denied";
  }
}

/* Cancels the old reminders and schedules the next 7. Returns the count. */
export async function rescheduleReminders(state) {
  const LN = await plugin();
  if (!LN) return 0;
  try {
    const rs = (await getRunSettings()) || {};
    const plan = state ? state.plan : (await loadPlanState()).plan;
    const master = await getMasterPlan();
    await LN.cancel({ notifications: Array.from({ length: 7 }, (_, k) => ({ id: ID_BASE + k })) });
    const list = reminderSchedule(plan, master, rs.reminder);
    if (!list.length) return 0;
    await LN.schedule({ notifications: list.map((n) => ({ id: n.id, title: n.title, body: n.body, schedule: { at: n.at, allowWhileIdle: true } })) });
    return list.length;
  } catch (e) {
    return 0;
  }
}

export async function getReminder() {
  const rs = (await getRunSettings()) || {};
  return { ...DEFAULT_REMINDER, ...(rs.reminder || {}) };
}

export async function saveReminder(next) {
  const rs = (await getRunSettings()) || {};
  await setRunSettings({ ...rs, reminder: next });
  return rescheduleReminders();
}

// Schedule again each time the plan changes.
onPlanSaved((state) => {
  rescheduleReminders(state);
});

import { useState, useEffect } from "react";
import { ChevronRight, Plus, Trash2, Pencil, ChevronDown, Footprints, Bike, Activity } from "lucide-react";
import { ACTIVITY_TYPES, ACTIVITY_GROUPS } from "../data/activities.js";
import { activityType, HARD_ACTIVITY_RPE, activitySeconds, formatDuration, activityPace, activityLabel, addActivity, updateActivity, removeActivity } from "../lib/activities.js";
import { dateStrOf, todayStr, nowTimeStr, atFromDateTime, sessionTime } from "../lib/dates.js";
import { safeGet } from "../lib/storage.js";
import { COLORS, effortColor } from "../theme.js";

const ACTIVITY_ICONS = {
  run: <Footprints size={14} />,
  walk: <Footprints size={14} />,
  hike: <Footprints size={14} />,
  treadmill: <Footprints size={14} />,
  "incline-walk": <Footprints size={14} />,
  "stair-climber": <Footprints size={14} />,
  "jump-rope": <Footprints size={14} />,
  cycle: <Bike size={14} />,
  "stationary-bike": <Bike size={14} />,
  spin: <Bike size={14} />,
  "assault-bike": <Bike size={14} />,
  elliptical: <Bike size={14} />,
  swim: <Activity size={14} />,
  football: <Activity size={14} />,
  "team-sport": <Activity size={14} />,
  rower: <Activity size={14} />,
  other: <Activity size={14} />,
};

/* The cardio panel at the foot of Home.

   Collapsed to a single line until it is wanted, because most days it is
   not: the app is a lifting log and this is the thing that sits beside
   it. Opening it shows the last few activities and the form, and the
   form is deliberately four fields — type, time, distance, effort —
   rather than a second workout screen. */
export function ActivityPanel({ onChanged }) {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState("run");
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [distance, setDistance] = useState("");
  const [rpe, setRpe] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  // Defaulted to now, because most entries are logged straight after —
  // but editable, because the other half are logged that evening, and a
  // run stamped six hours late tells the readiness map the wrong thing.
  const [date, setDate] = useState(todayStr);
  // A date in the future is not a log. The max on the field stops most of
  // them; this also catches a typed date.
  const dateOk = !!date && date <= todayStr();
  const [time, setTime] = useState(nowTimeStr);
  // The id being edited, or null when the form is adding a new one. The
  // same form does both: an edit is the same four fields, and a second
  // one that drifted out of step with the first would be worse than the
  // little state this costs.
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    safeGet("activity-history").then((rows) => {
      if (!cancelled) setList(rows || []);
    });
    return () => { cancelled = true; };
  }, []);

  const chosen = activityType(type);
  const draft = { type, minutes, seconds, distance };
  const secs = activitySeconds(draft);
  const pace = activityPace(draft);
  const recent = [...list].sort((a, b) => (sessionTime(a) || 0) - (sessionTime(b) || 0)).reverse();

  function reset() {
    setAdding(false);
    setEditingId(null);
    setType("run");
    setName("");
    setMinutes("");
    setSeconds("");
    setDistance("");
    setRpe(null);
    setDate(todayStr());
    setTime(nowTimeStr());
  }

  // Load an existing entry back into the form. The time comes off the
  // stored timestamp in local terms, so what you see is the clock time
  // you logged rather than its UTC shadow.
  function edit(a) {
    const when = a.at ? new Date(a.at) : null;
    setEditingId(a.id);
    setAdding(true);
    setConfirmId(null);
    setType(a.type || "run");
    setName(a.name || "");
    setMinutes(a.minutes === null || a.minutes === undefined ? "" : String(a.minutes));
    setSeconds(a.seconds === null || a.seconds === undefined ? "" : String(a.seconds));
    setDistance(a.distance === null || a.distance === undefined ? "" : String(a.distance));
    setRpe(a.rpe === null || a.rpe === undefined ? null : Number(a.rpe));
    setDate(a.date || (when ? dateStrOf(when) : todayStr()));
    setTime(when && !Number.isNaN(when.getTime())
      ? `${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}`
      : nowTimeStr());
  }

  async function save() {
    if (!secs || !dateOk) return;
    const record = {
      // Keep the id when editing, so this replaces the entry rather than
      // adding a second copy of it.
      id: editingId || `act-${Date.now()}`,
      // The date the user picked, not at.slice(0,10): `at` is UTC, so a
      // late-evening run east of Greenwich would file itself tomorrow.
      date,
      at: atFromDateTime(date, time),
      type,
      name: name.trim() || null,
      minutes: minutes === "" ? null : Number(minutes),
      seconds: seconds === "" ? null : Number(seconds),
      distance: distance === "" ? null : Number(distance),
      rpe: rpe === null ? null : Number(rpe),
    };
    setList(editingId ? await updateActivity(record) : await addActivity(record));
    reset();
    // The readiness map above just changed, so Home has to redraw it.
    if (onChanged) onChanged();
  }

  async function remove(id) {
    setList(await removeActivity(id));
    setConfirmId(null);
    if (onChanged) onChanged();
  }

  const field = {
    background: COLORS.surfaceRaised,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 8,
    color: COLORS.text,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
    padding: "9px 10px",
    boxSizing: "border-box",
    minWidth: 0,
  };
  const legend = { color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 };

  return (
    <div data-tour="activity-panel" style={{ borderTop: `1px solid ${COLORS.line}`, paddingTop: 24, marginBottom: 40 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "transparent", border: "none", padding: 0, marginBottom: open ? 14 : 0, textAlign: "left" }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <Footprints size={15} color={COLORS.accent} />
          <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, textTransform: "uppercase", letterSpacing: 0.5, color: COLORS.text }}>
            Cardio &amp; Activity
          </span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {recent.length > 0 && (
            <span style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
              {recent.length}
            </span>
          )}
          {open ? <ChevronDown size={16} color={COLORS.accent} /> : <ChevronRight size={16} color={COLORS.textDim} />}
        </span>
      </button>

      {open && (
        <>
          {recent.length === 0 && !adding && (
            <div style={{ color: COLORS.textDim, fontSize: 12.5, lineHeight: 1.5, marginBottom: 12 }}>
              Log runs, rides, swims, football and other activities with a date, a time and an effort. Activities are not part of your lifting stats. They count for your streak. The readiness map above shows the muscles that they made tired.
            </div>
          )}

          {recent.slice(0, 4).map((a) => {
            const p = activityPace(a);
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "11px 13px", marginBottom: 8 }}>
                <span style={{ color: COLORS.accent, flexShrink: 0, display: "flex" }}>{ACTIVITY_ICONS[a.type] || ACTIVITY_ICONS.other}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 13.5, textTransform: "uppercase", lineHeight: 1.2 }}>
                    {activityLabel(a)}
                  </span>
                  <span style={{ display: "block", color: COLORS.textDim, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", marginTop: 3 }}>
                    {a.date} · {formatDuration(activitySeconds(a))}
                    {a.distance ? ` · ${a.distance}${activityType(a.type).distanceUnit || ""}` : ""}
                    {p ? ` · ${p}` : ""}
                    {a.rpe ? ` · RPE ${a.rpe}` : ""}
                  </span>
                </span>
                {confirmId === a.id ? (
                  <span style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setConfirmId(null)} style={{ padding: "6px 9px", borderRadius: 8, border: `1px solid ${COLORS.line}`, background: COLORS.surface, color: COLORS.textDim, fontSize: 11, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}>
                      Cancel
                    </button>
                    <button onClick={() => remove(a.id)} style={{ padding: "6px 9px", borderRadius: 8, border: "none", background: COLORS.bad, color: "#fff", fontSize: 11, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}>
                      Delete
                    </button>
                  </span>
                ) : (
                  <span style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => edit(a)}
                      title="Edit activity"
                      aria-label={`Edit ${activityLabel(a)}`}
                      style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${editingId === a.id ? COLORS.accent : COLORS.line}`, background: COLORS.surface, color: editingId === a.id ? COLORS.accent : COLORS.textDim, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setConfirmId(a.id)}
                      title="Delete activity"
                      aria-label={`Delete ${activityLabel(a)}`}
                      style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${COLORS.line}`, background: COLORS.surface, color: COLORS.textDim, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                )}
              </div>
            );
          })}

          {!adding ? (
            <button
              onClick={() => { reset(); setAdding(true); }}
              style={{ width: "100%", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "transparent", border: `1px dashed ${COLORS.line}`, borderRadius: 12, padding: "12px 0", color: COLORS.textDim, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              <Plus size={14} /> Log an activity
            </button>
          ) : (
            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.accent}`, borderRadius: 14, padding: 14, marginTop: 4 }}>
              {editingId && (
                <div style={{ color: COLORS.accent, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
                  Editing
                </div>
              )}
              <div style={legend}>Activity</div>
              {/* A native select, not a grid of buttons: fifteen options
                  will not fit at 412px, and the OS picker is one tap and
                  already scrolls, searches and reads out properly. The
                  optgroups are the indoor/outdoor split. */}
              <div style={{ position: "relative", marginBottom: 12 }}>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    // The new activity may count distance in different
                    // units, or not at all, so a figure typed under the
                    // old one would silently change meaning.
                    setDistance("");
                  }}
                  aria-label="Activity"
                  style={{
                    ...field,
                    width: "100%",
                    appearance: "none",
                    WebkitAppearance: "none",
                    paddingRight: 34,
                    fontFamily: "'Oswald', sans-serif",
                    fontSize: 14,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                    borderColor: COLORS.accent,
                    color: COLORS.text,
                  }}
                >
                  {ACTIVITY_GROUPS.map((g) => (
                    <optgroup key={g} label={g}>
                      {ACTIVITY_TYPES.filter((t) => t.group === g).map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown
                  size={15}
                  color={COLORS.accent}
                  style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                />
              </div>

              <div style={legend}>When</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  type="date"
                  value={date}
                  max={todayStr()}
                  onChange={(e) => setDate(e.target.value)}
                  aria-label="Date"
                  style={{ ...field, flex: 3 }}
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  aria-label="Time"
                  style={{ ...field, flex: 2 }}
                />
              </div>

              {(type === "other" || type === "team-sport") && (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-label="Activity name"
                  placeholder={type === "team-sport" ? "Sport name, for example Rugby" : "Activity name, for example Climbing"}
                  style={{ ...field, width: "100%", marginBottom: 12 }}
                />
              )}

              <div style={legend}>Time{chosen.distanceUnit ? " and distance" : ""}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <input type="number" inputMode="numeric" placeholder="min" value={minutes} onChange={(e) => setMinutes(e.target.value)} style={{ ...field, flex: 1 }} />
                <input type="number" inputMode="numeric" placeholder="sec" value={seconds} onChange={(e) => setSeconds(e.target.value)} style={{ ...field, flex: 1 }} />
                {chosen.distanceUnit && (
                  <input type="number" inputMode="decimal" placeholder={chosen.distanceUnit} value={distance} onChange={(e) => setDistance(e.target.value)} style={{ ...field, flex: 1 }} />
                )}
              </div>
              {pace && (
                <div style={{ color: COLORS.accent, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", marginTop: -6, marginBottom: 12 }}>
                  {formatDuration(secs)} · {pace}
                </div>
              )}

              <div style={legend}>Effort (RPE)</div>
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                  const active = rpe === n;
                  return (
                    <button
                      key={n}
                      onClick={() => setRpe(active ? null : n)}
                      aria-label={`RPE ${n}`}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        height: 32,
                        borderRadius: 8,
                        padding: 0,
                        border: `1.5px solid ${active ? effortColor() : COLORS.line}`,
                        background: active ? effortColor() : "transparent",
                        color: active ? "#10142B" : COLORS.textDim,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11.5,
                      }}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              <div style={{ color: COLORS.textDim, fontSize: 11, lineHeight: 1.45, marginBottom: 12 }}>
                {chosen.primary.length || chosen.secondary.length
                  ? `${rpe >= HARD_ACTIVITY_RPE ? "At RPE 9 or 10, this counts as hard work" : "Below RPE 9, this counts as work that is not at full effort"} on ${[...chosen.primary, ...chosen.secondary].join(", ")}.`
                  : "The app logs this activity and its time. The readiness map does not change, because the app cannot know which muscles this activity used."}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={reset}
                  style={{ flex: 1, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "11px 0", color: COLORS.textDim, fontFamily: "'Oswald', sans-serif", fontSize: 12.5, textTransform: "uppercase" }}
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={!secs}
                  style={{ flex: 2, background: secs ? COLORS.accent : COLORS.surfaceRaised, border: secs ? "none" : `1px solid ${COLORS.line}`, borderRadius: 10, padding: "11px 0", color: secs ? COLORS.onAccent : COLORS.textDim, fontFamily: "'Oswald', sans-serif", fontSize: 12.5, textTransform: "uppercase" }}
                >
                  {!secs ? "Enter a time" : editingId ? `Save changes · ${formatDuration(secs)}` : `Save ${formatDuration(secs)}`}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { COLORS } from "../theme.js";
import { isNativeRuntime } from "../lib/platform.js";
import { Card, Toggle, Field, Row, st } from "./ui.jsx";
import { getReminder, saveReminder, requestReminderPermission, effectiveTime, inQuiet } from "./reminders.js";

/* Night-before reminder settings: on/off, time, quiet hours. */
export function RemindersCard({ nav }) {
  const [r, setR] = useState(null);
  const [msg, setMsg] = useState("");
  const native = isNativeRuntime();
  useEffect(() => {
    getReminder().then(setR);
  }, [nav && nav.reloadKey]);
  if (!r) return null;

  async function update(next) {
    setR(next);
    if (!native) return saveReminder(next);
    if (next.on && !r.on) {
      const p = await requestReminderPermission();
      if (p === "denied") {
        setMsg("The phone did not allow notifications. You can allow them in the phone settings for Skid Marks.");
        const off = { ...next, on: false };
        setR(off);
        return saveReminder(off);
      }
    }
    const n = await saveReminder(next);
    setMsg(next.on ? `${n} reminder${n === 1 ? "" : "s"} set for the next 7 evenings.` : "Reminders are off.");
  }

  const timeInput = (key) => (
    <input
      data-testid={`reminder-${key}`}
      type="time"
      value={r[key]}
      onChange={(e) => update({ ...r, [key]: e.target.value })}
      style={st.field()}
    />
  );

  return (
    <Card testId="reminders-card">
      <Row style={{ marginBottom: 4 }}>
        <Bell size={16} color={COLORS.accent} />
        <div style={st.title(14)}>Night-before reminder</div>
      </Row>
      <Toggle testId="reminder-on" on={r.on} onChange={(on) => update({ ...r, on })} label="Remind me the evening before" detail='For example: "Tomorrow: Easy run. Gym: Legs (heavy)."' />
      {r.on && (
        <>
          <Field label="Time">{timeInput("time")}</Field>
          <Row gap={10}>
            <div style={{ flex: 1 }}>
              <Field label="Quiet from">{timeInput("quietFrom")}</Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Quiet to">{timeInput("quietTo")}</Field>
            </div>
          </Row>
          {inQuiet(r.time, r.quietFrom, r.quietTo) && <div style={{ ...st.body(), fontSize: 12 }}>This time is in your quiet hours. The reminder comes at {effectiveTime(r)}.</div>}
        </>
      )}
      {!native && <div data-testid="reminder-web-note" style={{ ...st.body(), fontSize: 12, marginTop: 6 }}>Reminders work in the Android app. This browser does not show them.</div>}
      {msg && <div style={{ ...st.body(), fontSize: 12, marginTop: 6, color: COLORS.text }}>{msg}</div>}
    </Card>
  );
}

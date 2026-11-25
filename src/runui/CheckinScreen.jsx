import { useEffect, useState } from "react";
import * as engine from "../run/engine.js";
import { COLORS } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";
import { appendReadiness, getReadinessLog } from "../shared/store.js";
import { applyEvent } from "../plan/planState.js";
import { getRunPrefs, getWellnessToday, saveRunPrefs, today } from "./runData.js";
import { Btn, Loading, MONO, Note, S, Segmented, Toggle } from "./ui.jsx";

/* ---------------------------------------------------------------
   CHECK-IN (run:checkin, params { afterRun? })

   Sleep, soreness, stress and heavy legs. Resting heart rate, HRV and
   sleep come from Intervals.icu ("wellness") when it is linked. One tap
   to confirm. The score goes to the plan as a readiness event. The
   daily check-in is optional and off by default.
--------------------------------------------------------------- */

const SCALE = (words) => words.map((w, i) => ({ value: i + 1, label: w }));
const QUALITY = SCALE(["Bad", "Poor", "OK", "Good", "Great"]);
const SORE = SCALE(["None", "A little", "Some", "Much", "Very"]);
const STRESS = SCALE(["None", "Low", "Some", "High", "Very"]);

export function CheckinScreen({ nav }) {
  const afterRun = !!(nav.params && nav.params.afterRun);
  const [ctx, setCtx] = useState(null);
  const [sleepH, setSleepH] = useState(7);
  const [sleepQ, setSleepQ] = useState(3);
  const [soreness, setSoreness] = useState(2);
  const [stress, setStress] = useState(2);
  const [legsHeavy, setLegsHeavy] = useState(false);
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const iso = today();

  useEffect(() => {
    let live = true;
    Promise.all([getWellnessToday(iso), getRunPrefs(), getReadinessLog()]).then(([w, prefs, log]) => {
      if (!live) return;
      setCtx({ w, prefs, already: (log || []).find((r) => r.date === iso) || null });
      if (w.today && w.today.sleepSecs) setSleepH(Math.round((w.today.sleepSecs / 3600) * 2) / 2);
    });
    return () => {
      live = false;
    };
  }, [iso]);

  if (!ctx) {
    return (
      <div data-testid="checkin-screen" style={S.page()}>
        <TopBar title="Check-in" onBack={nav.back} />
        <Loading />
      </div>
    );
  }

  const w = ctx.w;
  const hrvDelta = w.today && w.today.hrv && w.baseline && w.baseline.hrv ? ((w.today.hrv - w.baseline.hrv) / w.baseline.hrv) * 100 : 0;
  const rhrDelta = w.today && w.today.restingHR && w.baseline && w.baseline.restingHR ? w.today.restingHR - w.baseline.restingHR : 0;
  const r = engine.readiness({ sleepH, sleepQ, soreness, stress, hrvDelta: Math.max(-20, Math.min(20, hrvDelta)), rhrDelta: Math.max(-10, Math.min(10, rhrDelta)) });

  async function confirm() {
    if (busy) return;
    setBusy(true);
    const out = { score: r.score, label: r.label, advice: r.advice, plan: null, legs: null };
    try {
      await appendReadiness({ date: iso, score: r.score, sleepH, sleepQ, soreness, stress, legsHeavy });
      const { result } = await applyEvent({ type: "readiness", score: r.score });
      out.plan = result && !result.refused ? result : null;
      if (legsHeavy) {
        const { result: lr } = await applyEvent({ type: "legHeavyDay", iso });
        out.legs = lr || null;
      }
    } catch (e) {
      out.error = "The check-in is saved. The plan did not change.";
    }
    nav.reload();
    setDone(out);
    setBusy(false);
  }

  async function applySwap() {
    setBusy(true);
    try {
      const { result } = await applyEvent({ type: "legHeavyDay", iso, apply: true });
      setDone({ ...done, legs: { ...result, applied: true } });
      nav.reload();
    } catch (e) {
      /* no change */
    }
    setBusy(false);
  }

  const toggleDaily = async () => {
    const prefs = await saveRunPrefs({ dailyCheckin: !ctx.prefs.dailyCheckin });
    setCtx({ ...ctx, prefs });
  };

  const finish = () => (afterRun ? nav.home() : nav.back());

  if (done) {
    return (
      <div data-testid="checkin-screen" style={S.page()}>
        <TopBar title="Check-in" onBack={finish} />
        <div data-testid="checkin-done" style={S.card()}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: MONO, fontSize: 34, color: COLORS.accent }}>{done.score}</span>
            <span style={{ ...S.title(), marginBottom: 0 }}>{done.label}</span>
          </div>
          <div style={{ ...S.text(), marginTop: 4 }}>{done.advice}</div>
          {done.plan && done.plan.message && <div style={{ ...S.body(), marginTop: 8 }}>{done.plan.message}</div>}
          {done.plan && done.plan.changes && done.plan.changes.map((c, i) => <div key={i} style={{ ...S.body(), marginTop: 4 }}>{c.reason}</div>)}
          {done.legs && (
            <div style={{ marginTop: 10 }}>
              <Note>
                <div style={{ color: COLORS.text }}>{done.legs.applied ? done.legs.message || "The plan changed." : done.legs.message || done.legs.reason || "No change is necessary for heavy legs today."}</div>
                {!done.legs.applied && done.legs.offers && done.legs.offers.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Btn kind="primary" onClick={applySwap} disabled={busy} testId="apply-swap">
                      Make this change
                    </Btn>
                  </div>
                )}
              </Note>
            </div>
          )}
          {done.error && (
            <div style={{ marginTop: 10 }}>
              <Note tone="warn">{done.error}</Note>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <Btn onClick={finish} testId="checkin-finish">
              Done
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="checkin-screen" style={S.page()}>
      <TopBar title="Check-in" onBack={finish} />
      {ctx.already && (
        <div style={{ padding: "0 20px 12px" }}>
          <Note>You checked in today already (score {ctx.already.score}). A new check-in adds a second entry.</Note>
        </div>
      )}
      {(w.today && (w.today.restingHR || w.today.hrv || w.today.sleepSecs)) ? (
        <div style={{ padding: "0 20px 12px" }}>
          <Note testId="wellness-prefill">
            From Intervals.icu:{w.today.sleepSecs ? ` sleep ${Math.round((w.today.sleepSecs / 3600) * 10) / 10} h` : ""}
            {w.today.restingHR ? ` · resting heart rate ${w.today.restingHR}` : ""}
            {w.today.hrv ? ` · HRV ${Math.round(w.today.hrv)}` : ""}. Check the values and confirm.
          </Note>
        </div>
      ) : null}
      <div style={S.card()}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={S.label()}>Sleep last night</span>
          <span style={{ fontFamily: MONO, fontSize: 13, color: COLORS.text }}>{sleepH} h</span>
        </div>
        <input data-testid="sleep-hours" type="range" min={3} max={11} step={0.5} value={sleepH} onChange={(e) => setSleepH(Number(e.target.value))} style={{ width: "100%", height: 32, accentColor: COLORS.accent }} />
        <div style={{ ...S.label(), margin: "10px 0 6px" }}>Sleep quality</div>
        <Segmented value={sleepQ} options={QUALITY} onChange={setSleepQ} testId="sleep-quality" />
        <div style={{ ...S.label(), margin: "12px 0 6px" }}>Sore muscles</div>
        <Segmented value={soreness} options={SORE} onChange={setSoreness} testId="soreness" />
        <div style={{ ...S.label(), margin: "12px 0 6px" }}>Stress</div>
        <Segmented value={stress} options={STRESS} onChange={setStress} testId="stress" />
        <Toggle label="My legs feel heavy" desc="For example after a leg day or football." value={legsHeavy} onToggle={() => setLegsHeavy(!legsHeavy)} testId="legs-heavy" />
      </div>
      <div style={{ padding: "0 20px", display: "grid", gap: 10 }}>
        <Btn kind="primary" onClick={confirm} disabled={busy} testId="checkin-confirm" style={{ minHeight: 56, fontSize: 16 }}>
          Confirm · {r.label} ({r.score})
        </Btn>
        <div style={S.body()}>The score is information for today. It does not diagnose anything.</div>
      </div>
      <div style={S.card({ marginTop: 14 })}>
        <Toggle label="Ask me each day" desc="Show a check-in on the Run home and after each run. Off by default." value={!!ctx.prefs.dailyCheckin} onToggle={toggleDaily} testId="daily-checkin" />
      </div>
    </div>
  );
}

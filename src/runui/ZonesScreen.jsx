import { useEffect, useState } from "react";
import * as engine from "../run/engine.js";
import { COLORS } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";
import { listActivities, setRunProfile } from "../shared/store.js";
import { applyEvent, currentPlan } from "../plan/planState.js";
import { fromUnit, getProfile, jargonOn, today, unitsOf } from "./runData.js";
import { Btn, Chip, ChipRow, Loading, MONO, Note, NumField, S, Segmented, parseTime } from "./ui.jsx";

/* ---------------------------------------------------------------
   ZONES AND PREDICTION (run:zones)

   Running fitness score (Advanced; never called VDOT), pace table,
   heart-rate zones (saved to run-profile), race predictor (fitness
   model and Riegel) with "Update my plan from this result", and the
   "too hard / too easy" feedback.
--------------------------------------------------------------- */

const PACE_ROWS = [
  ["easy", "Easy", "Most of your running. You can talk in full sentences."],
  ["long", "Long run", "Easy and steady."],
  ["marathon", "Marathon", "Steady. Long-run finish."],
  ["threshold", "Threshold", "Comfortably hard. About 1 hour race effort."],
  ["interval", "Intervals", "Hard reps of 3 to 5 minutes."],
  ["rep", "Fast reps", "Short, fast and relaxed. Not a sprint."],
];

const DISTS = [
  { id: "5", label: "5K", km: 5 },
  { id: "10", label: "10K", km: 10 },
  { id: "21", label: "Half", km: 21.0975 },
  { id: "42", label: "Marathon", km: 42.195 },
  { id: "other", label: "Other", km: null },
];

const METHODS = [
  { value: "karvonen", label: "Reserve" },
  { value: "lthr", label: "Threshold" },
  { value: "max", label: "Maximum" },
];
const METHOD_TEXT = {
  karvonen: "Heart rate reserve (Karvonen). It needs your maximum and resting heart rate.",
  lthr: "Threshold heart rate: your average heart rate in a hard 30-minute effort.",
  max: "Percent of maximum heart rate. It is the simplest method.",
};

function ResultBox({ result }) {
  if (!result) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <Note tone={result.ok ? "ok" : "warn"} testId="zones-result">
        <div style={{ color: COLORS.text }}>{result.text}</div>
        {result.changes && result.changes.length > 0 && (
          <div style={{ marginTop: 6 }}>
            {[...result.changes].sort((a, b) => String(a.iso || "").localeCompare(String(b.iso || ""))).slice(0, 4).map((c, i) => (
              <div key={i}>
                {c.iso ? `${engine.fmtDate(c.iso)}: ` : ""}
                {c.reason}
              </div>
            ))}
            {result.changes.length > 4 && <div>And {result.changes.length - 4} more changes. See "What changed" in Plan.</div>}
          </div>
        )}
      </Note>
    </div>
  );
}

export function ZonesScreen({ nav }) {
  const [data, setData] = useState(null);
  const [showAnyway, setShowAnyway] = useState(false);
  const [hr, setHr] = useState({ maxHR: "", restHR: "", lthr: "", method: "karvonen" });
  const [hrSaved, setHrSaved] = useState(false);
  const [dist, setDist] = useState("5");
  const [otherKm, setOtherKm] = useState("");
  const [timeText, setTimeText] = useState("");
  const [result, setResult] = useState(null);
  const [planMsg, setPlanMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [plan, profile, acts] = await Promise.all([currentPlan(), getProfile(), listActivities(nav.settings)]);
    setData({ plan, profile, acts });
    setHr({ maxHR: profile.maxHR || "", restHR: profile.restHR || "", lthr: profile.lthr || "", method: profile.hrMethod || "karvonen" });
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.reloadKey]);

  if (!data) {
    return (
      <div data-testid="zones-screen" style={S.page()}>
        <TopBar title="Zones and prediction" onBack={nav.back} />
        <Loading />
      </div>
    );
  }
  const { plan, profile, acts } = data;
  const units = unitsOf(profile);
  const adv = jargonOn(nav.settings, plan, acts) || showAnyway;
  const score = plan && engine.isValidScore(plan.score) ? plan.score : engine.isValidScore(Number(profile.score)) ? Number(profile.score) : null;
  const p = score ? engine.paces(score) : null;
  const zones = engine.hrZones({ maxHR: Number(hr.maxHR) || undefined, restHR: Number(hr.restHR) || undefined, lthr: Number(hr.lthr) || undefined }, hr.method);
  const d = DISTS.find((x) => x.id === dist);
  const km = d.km || fromUnit(otherKm, units);
  const tSec = parseTime(timeText);

  async function saveHr() {
    const next = { ...profile, maxHR: Number(hr.maxHR) || null, restHR: Number(hr.restHR) || null, lthr: Number(hr.lthr) || null, hrMethod: hr.method };
    await setRunProfile(next);
    setData({ ...data, profile: next });
    setHrSaved(true);
    nav.reload();
  }

  function predict() {
    setPlanMsg(null);
    if (!(km > 0) || !tSec) {
      setResult({ ok: false, error: "Type a distance and a time, for example 25:30 or 1:52:00." });
      return;
    }
    const r = engine.checkResult(km, tSec);
    if (!r.ok) {
      setResult({ ok: false, error: r.error });
      return;
    }
    const rows = engine.RACE_DISTANCES.map(([name, D]) => ({ name, km: D, model: Math.round(engine.predict(r.score, D)), riegel: Math.round(engine.riegel(tSec, km, D)) }));
    setResult({ ok: true, score: r.score, rows, km, tSec });
  }

  async function updatePlan() {
    if (!result || !result.ok || busy) return;
    setBusy(true);
    try {
      if (!plan) {
        await setRunProfile({ ...profile, score: result.score });
        setPlanMsg({ ok: true, text: "There is no plan yet. The app keeps this result for your next plan." });
      } else {
        const { result: r } = await applyEvent({ type: "race", distKm: Math.round(result.km * 1000) / 1000, timeSec: Math.round(result.tSec), iso: today() });
        setPlanMsg({ ok: !r.refused, text: r.refused ? r.reason || r.message : r.message, changes: r.changes });
      }
      await load();
      nav.reload();
    } catch (e) {
      setPlanMsg({ ok: false, text: "The app cannot change the plan now. Try again." });
    }
    setBusy(false);
  }

  async function feedback(kind) {
    if (busy) return;
    setBusy(true);
    try {
      const { result: r } = await applyEvent({ type: "feedback", kind });
      setPlanMsg({ ok: !r.refused, text: r.refused ? r.reason || r.message : `${r.message} ${kind === "tooHard" ? "Paces are about 2% slower." : "Paces are about 2% faster."}`, changes: [] });
      await load();
      nav.reload();
    } catch (e) {
      setPlanMsg({ ok: false, text: "The app cannot change the plan now. Try again." });
    }
    setBusy(false);
  }

  return (
    <div data-testid="zones-screen" style={S.page()}>
      <TopBar title="Zones and prediction" onBack={nav.back} />
      {!adv && (
        <div style={S.card()}>
          <div style={S.title()}>Run by feel first</div>
          <div style={{ ...S.body(), marginBottom: 10 }}>
            In Simple mode the app uses effort words: "slow enough to talk" is easy. Paces, zones and predictions show after 4 weeks of runs, or in Advanced mode (Settings).
          </div>
          <Btn onClick={() => setShowAnyway(true)} testId="show-numbers">
            Show the numbers now
          </Btn>
        </div>
      )}

      {adv && (
        <div data-testid="paces-card" style={S.card()}>
          {score ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={S.title()}>Running fitness score</div>
                <span data-testid="fitness-score" style={{ fontFamily: MONO, fontSize: 22, color: COLORS.accent }}>
                  {score.toFixed(1)}
                </span>
              </div>
              <div style={{ ...S.body(), marginBottom: 10 }}>From the published Daniels and Gilbert equations. It is an estimate, not a lab test.</div>
              <div style={S.label()}>Training paces</div>
              {PACE_ROWS.map(([k, name, desc]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "7px 0", borderBottom: `1px solid ${COLORS.line}` }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ ...S.text(), fontSize: 13 }}>{name}</div>
                    <div style={{ ...S.body(), fontSize: 11 }}>{desc}</div>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 13, color: COLORS.text, whiteSpace: "nowrap" }}>{k === "easy" ? `${engine.fmtPace(p.easyLo, units).split(" ")[0]}–${engine.fmtPace(p.easyHi, units)}` : engine.fmtPace(p[k], units)}</span>
                </div>
              ))}
            </>
          ) : (
            <div style={S.body()}>There is no fitness value yet. Type a recent race or time trial below.</div>
          )}
        </div>
      )}

      {adv && (
        <div data-testid="hr-card" style={S.card()}>
          <div style={S.title()}>Heart-rate zones</div>
          <Segmented value={hr.method} options={METHODS} onChange={(m) => setHr({ ...hr, method: m })} testId="hr-method" />
          <div style={{ ...S.body(), margin: "6px 0 10px" }}>{METHOD_TEXT[hr.method]}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            <NumField label="Max" value={hr.maxHR} onChange={(v) => { setHr({ ...hr, maxHR: v }); setHrSaved(false); }} inputMode="numeric" testId="hr-max" placeholder="-" />
            <NumField label="Resting" value={hr.restHR} onChange={(v) => { setHr({ ...hr, restHR: v }); setHrSaved(false); }} inputMode="numeric" testId="hr-rest" placeholder="-" />
            <NumField label="Threshold" value={hr.lthr} onChange={(v) => { setHr({ ...hr, lthr: v }); setHrSaved(false); }} inputMode="numeric" testId="hr-lthr" placeholder="-" />
          </div>
          {zones ? (
            <div data-testid="hr-zone-table" style={{ marginTop: 10 }}>
              {zones.map((z) => (
                <div key={z.z} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: `1px solid ${COLORS.line}` }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ ...S.text(), fontSize: 13 }}>
                      Zone {z.z} · {z.name}
                    </div>
                    <div style={{ ...S.body(), fontSize: 11 }}>{z.purpose}</div>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 13, color: COLORS.text, whiteSpace: "nowrap" }}>
                    {z.lo}–{z.hi}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ ...S.body(), marginTop: 10 }}>Type the values for this method. Leave them empty if you do not know them.</div>
          )}
          <div style={{ marginTop: 10 }}>
            <Btn onClick={saveHr} testId="save-hr">
              {hrSaved ? "Saved" : "Save heart-rate values"}
            </Btn>
          </div>
        </div>
      )}

      <div data-testid="predictor" style={S.card()}>
        <div style={S.title()}>{adv ? "Race predictor" : "Enter a race result"}</div>
        <ChipRow>
          {DISTS.map((x) => (
            <Chip key={x.id} active={dist === x.id} onClick={() => setDist(x.id)} testId={`dist-${x.id}`}>
              {x.label}
            </Chip>
          ))}
        </ChipRow>
        <div style={{ display: "grid", gridTemplateColumns: dist === "other" ? "1fr 1fr" : "1fr", gap: 8, marginTop: 10 }}>
          {dist === "other" && <NumField label={`Distance (${units})`} value={otherKm} onChange={setOtherKm} testId="other-km" />}
          <label style={{ display: "block" }}>
            <div style={{ ...S.label(), marginBottom: 4 }}>Time (h:mm:ss or mm:ss)</div>
            <input data-testid="result-time" value={timeText} onChange={(e) => setTimeText(e.target.value)} placeholder="25:30" inputMode="numeric" style={S.field()} />
          </label>
        </div>
        <div style={{ marginTop: 10 }}>
          <Btn onClick={predict} testId="predict">
            {adv ? "Predict" : "Check the result"}
          </Btn>
        </div>
        {result && !result.ok && (
          <div style={{ marginTop: 10 }}>
            <Note tone="warn">{result.error}</Note>
          </div>
        )}
        {result && result.ok && (
          <div data-testid="predictions" style={{ marginTop: 10 }}>
            {adv ? (
              <>
                <div style={{ ...S.body(), marginBottom: 6 }}>Running fitness score from this result: {result.score.toFixed(1)}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: 4, ...S.label() }}>
                  <span>Race</span>
                  <span style={{ textAlign: "right" }}>Fitness</span>
                  <span style={{ textAlign: "right" }}>Riegel</span>
                </div>
                {result.rows.map((r) => (
                  <div key={r.name} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: 4, padding: "6px 0", borderBottom: `1px solid ${COLORS.line}` }}>
                    <span style={{ ...S.text(), fontSize: 13 }}>{r.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 12.5, color: COLORS.text, textAlign: "right" }}>{engine.fmtTime(r.model)}</span>
                    <span style={{ fontFamily: MONO, fontSize: 12.5, color: COLORS.textDim, textAlign: "right" }}>{engine.fmtTime(r.riegel)}</span>
                  </div>
                ))}
                <div style={{ ...S.body(), marginTop: 6 }}>Predictions assume training for that distance. Longer races need long runs.</div>
              </>
            ) : (
              <div style={S.body()}>The result is valid. The plan can use it for your paces.</div>
            )}
            <div style={{ marginTop: 10 }}>
              <Btn kind="primary" onClick={updatePlan} disabled={busy} testId="update-plan">
                Update my plan from this result
              </Btn>
            </div>
          </div>
        )}
        <ResultBox result={planMsg} />
      </div>

      {plan && (
        <div data-testid="feedback-card" style={S.card()}>
          <div style={S.title()}>How do the sessions feel?</div>
          <div style={{ ...S.body(), marginBottom: 10 }}>Tell the plan. It changes all future paces by about 2%. A race or time trial gives a better update.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Btn onClick={() => feedback("tooHard")} disabled={busy} testId="too-hard">
              Too hard
            </Btn>
            <Btn onClick={() => feedback("tooEasy")} disabled={busy} testId="too-easy">
              Too easy
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

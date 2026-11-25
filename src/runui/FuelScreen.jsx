import { useEffect, useState } from "react";
import * as engine from "../run/engine.js";
import { COLORS } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";
import { getRaces } from "../shared/store.js";
import { currentPlan } from "../plan/planState.js";
import { getProfile, today, unitsOf } from "./runData.js";
import { Chip, ChipRow, Loading, MONO, Note, NumField, S, Stat, Toggle, parseTime } from "./ui.jsx";

/* ---------------------------------------------------------------
   FUEL AND RACE DAY (run:fuel)

   Fuel and fluid for a run (engine.fuel), carbohydrate loading
   (engine.carbLoad) and an even race-day pacing table.
--------------------------------------------------------------- */

const CHECKLIST = [
  "Lay out your kit the night before. Pin on your number.",
  "Eat a breakfast that you know, 2 to 3 hours before the start.",
  "Use only gels and drinks that you used in training.",
  "Arrive early. Go to the toilet before the warm-up.",
  "Start slower than you want. The first kilometres feel easy.",
  "Drink at the stations from the start, a little each time.",
];

function gelTimes(min, carbsPerHour) {
  if (!carbsPerHour) return [];
  const every = carbsPerHour >= 60 ? 25 : 40;
  const out = [];
  for (let t = 35; t <= min - 10; t += every) out.push(t);
  return out;
}

export function FuelScreen({ nav }) {
  const [data, setData] = useState(null);
  const [min, setMin] = useState("90");
  const [weight, setWeight] = useState("70");
  const [hard, setHard] = useState(false);
  const [raceKm, setRaceKm] = useState(10);
  const [goalText, setGoalText] = useState("");
  const [raceId, setRaceId] = useState(null);

  useEffect(() => {
    let live = true;
    Promise.all([getProfile(), getRaces(), currentPlan()]).then(([profile, races, plan]) => {
      if (!live) return;
      const iso = today();
      const upcoming = (races || []).filter((r) => r.date >= iso).sort((a, b) => a.date.localeCompare(b.date));
      setData({ profile, upcoming, plan });
      if (profile.weightKg) setWeight(String(profile.weightKg));
      const next = plan ? engine.allDays(plan).find((d) => d.iso >= iso && (d.type === "long" || d.type === "longfinish")) : null;
      if (next && next.min) setMin(String(next.min));
      if (upcoming[0]) {
        setRaceId(upcoming[0].id);
        setRaceKm(Number(upcoming[0].distKm) || 10);
        if (upcoming[0].goalTimeSec) setGoalText(engine.fmtTime(upcoming[0].goalTimeSec));
      }
    });
    return () => {
      live = false;
    };
  }, []);

  if (!data) {
    return (
      <div data-testid="fuel-screen" style={S.page()}>
        <TopBar title="Fuel and race day" onBack={nav.back} />
        <Loading />
      </div>
    );
  }
  const units = unitsOf(data.profile);
  const m = Math.max(10, Math.min(1800, Number(min) || 0));
  const w = Math.max(30, Math.min(200, Number(weight) || 70));
  const f = engine.fuel({ min: m, weightKg: w, hard });
  const gels = gelTimes(m, f.carbsPerHour);
  const goalSec = parseTime(goalText);
  const pace = goalSec && raceKm ? goalSec / raceKm : null;
  const unitKm = units === "mi" ? engine.KM_PER_MI : 1;
  const unitsTotal = raceKm / unitKm;
  const step = unitsTotal > 22 ? 5 : 1;
  const rows = [];
  if (pace) {
    for (let u = step; u < unitsTotal; u += step) rows.push({ u, sec: u * unitKm * pace });
    rows.push({ u: Math.round(unitsTotal * 100) / 100, sec: goalSec, finish: true });
  }
  const longRace = goalSec ? goalSec > 90 * 60 : raceKm >= 21;
  const cl = engine.carbLoad(w);

  return (
    <div data-testid="fuel-screen" style={S.page()}>
      <TopBar title="Fuel and race day" onBack={nav.back} />
      <div data-testid="fuel-card" style={S.card()}>
        <div style={S.title()}>Fuel for a run</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <NumField label="Run time" value={min} onChange={setMin} suffix="min" inputMode="numeric" testId="fuel-min" />
          <NumField label="Body weight" value={weight} onChange={setWeight} suffix="kg" testId="fuel-weight" />
        </div>
        <Toggle label="Hard run or race" value={hard} onToggle={() => setHard(!hard)} testId="fuel-hard" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 6 }}>
          <Stat label="Carbs / hour" value={`${f.carbsPerHour} g`} testId="fuel-carbs" />
          <Stat label="Fluid / hour" value={`${f.fluidMlPerHour} ml`} />
          <Stat label="Salt / hour" value={`${f.sodiumMgPerHour} mg`} sub="sodium" />
        </div>
        <div style={{ ...S.text(), marginTop: 10 }}>{f.note}</div>
        {gels.length > 0 && (
          <div style={{ ...S.body(), marginTop: 8 }}>
            About {Math.max(f.gels, gels.length)} gels of 25 g. Take one at: <span style={{ fontFamily: MONO, color: COLORS.text }}>{gels.map((t) => `${t} min`).join(", ")}</span>.
          </div>
        )}
        <div style={{ ...S.body(), marginTop: 8 }}>These are general guides. Your needs can be different. Practise in training.</div>
      </div>

      <div data-testid="race-day-card" style={S.card()}>
        <div style={S.title()}>Race-day pacing</div>
        {data.upcoming.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <ChipRow>
              {data.upcoming.slice(0, 5).map((r) => (
                <Chip
                  key={r.id}
                  active={raceId === r.id}
                  onClick={() => {
                    setRaceId(r.id);
                    setRaceKm(Number(r.distKm) || 10);
                    setGoalText(r.goalTimeSec ? engine.fmtTime(r.goalTimeSec) : "");
                  }}
                >
                  {r.name || "Race"} · {engine.fmtDate(r.date)}
                </Chip>
              ))}
            </ChipRow>
          </div>
        )}
        <ChipRow>
          {[
            [5, "5K"],
            [10, "10K"],
            [21.0975, "Half"],
            [42.195, "Marathon"],
          ].map(([k, l]) => (
            <Chip
              key={l}
              active={Math.abs(raceKm - k) < 0.01}
              onClick={() => {
                setRaceKm(k);
                setRaceId(null);
              }}
              testId={`race-dist-${l}`}
            >
              {l}
            </Chip>
          ))}
        </ChipRow>
        <label style={{ display: "block", marginTop: 10 }}>
          <div style={{ ...S.label(), marginBottom: 4 }}>Goal time (h:mm:ss)</div>
          <input data-testid="goal-time" value={goalText} onChange={(e) => setGoalText(e.target.value)} placeholder="55:00" style={S.field()} />
        </label>
        {pace ? (
          <div data-testid="pacing-table" style={{ marginTop: 10 }}>
            <div style={{ ...S.text(), marginBottom: 6 }}>
              Even pace: <span style={{ fontFamily: MONO }}>{engine.fmtPace(pace, units)}</span>. Run the first 2 {units === "mi" ? "miles" : "km"} about 5 seconds slower. Then hold an even effort.
            </div>
            {rows.map((r) => (
              <div key={r.u} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${COLORS.line}` }}>
                <span style={{ fontFamily: MONO, fontSize: 12.5, color: COLORS.textDim }}>{r.finish ? "Finish" : `${r.u} ${units}`}</span>
                <span style={{ fontFamily: MONO, fontSize: 12.5, color: COLORS.text }}>{engine.fmtTime(r.sec)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ ...S.body(), marginTop: 8 }}>Type a goal time to see the times at each {units === "mi" ? "mile" : "kilometre"}.</div>
        )}
        {longRace && (
          <div style={{ marginTop: 10 }}>
            <Note>
              Before a race of more than 90 minutes, eat more carbohydrate for {cl.days} days: about {cl.gramsPerDay} g a day for {w} kg.
            </Note>
          </div>
        )}
      </div>

      <div style={S.card()}>
        <div style={S.title()}>Race-day checklist</div>
        {CHECKLIST.map((c, i) => (
          <div key={i} style={{ ...S.text(), fontSize: 13, padding: "4px 0" }}>
            {i + 1}. {c}
          </div>
        ))}
      </div>
    </div>
  );
}

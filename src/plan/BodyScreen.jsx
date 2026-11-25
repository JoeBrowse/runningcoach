import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { COLORS } from "../theme.js";
import { loadRecoveryMap } from "../lib/recovery.js";
import { BodyMap } from "../components/BodyMap.jsx";
import { FormGauge } from "../components/FormGauge.jsx";
import { ActivityPanel } from "../components/ActivityPanel.jsx";
import { loadSummary } from "../shared/load.js";
import { listActivities } from "../shared/store.js";
import { Screen, Card, Btn, Loading, st } from "./ui.jsx";

/* ---------------------------------------------------------------
   BODY

   Iron Log's muscle readiness map, the shared body screen. Lift
   sessions, runs and other sports all feed it (lib/recovery.js reads
   workout-history and activity-history). The Form gauge uses the one
   load model (shared/load.js). The activity panel logs other sports.
--------------------------------------------------------------- */

export function BodyScreen({ nav }) {
  const [dates, setDates] = useState(null);
  const [form, setForm] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let off = false;
    (async () => {
      const map = await loadRecoveryMap();
      const all = await listActivities(nav.settings);
      if (off) return;
      setDates(map);
      setForm(loadSummary(all, { settings: nav.settings }));
    })();
    return () => {
      off = true;
    };
  }, [nav.reloadKey, tick]);

  return (
    <Screen title="Body" onBack={nav.back} testId="body-screen">
      <div style={{ ...st.body(), marginBottom: 12 }}>
        Muscle readiness from your lift sessions, runs and other sports. Tap a muscle for detail.
      </div>
      <Card>
        {!dates ? <Loading /> : <BodyMap dates={dates} />}
        {form && <FormGauge summary={form} />}
      </Card>
      <Btn kind="secondary" small testId="train-ready" onClick={() => nav.openLiftScreen("suggested")}>
        <Sparkles size={15} color={COLORS.accent} /> Train ready muscles
      </Btn>
      <div style={{ height: 12 }} />
      <ActivityPanel
        onChanged={() => {
          setTick((n) => n + 1);
          nav.reload();
        }}
      />
      <div style={{ ...st.body(), fontSize: 11.5, marginTop: 10 }}>The map and the load are information only. They cannot predict injury.</div>
    </Screen>
  );
}

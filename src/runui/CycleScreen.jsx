import { useEffect, useState } from "react";
import * as engine from "../run/engine.js";
import { COLORS } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";
import { getCycleLog, setCycleLog } from "../shared/store.js";
import { today } from "./runData.js";
import { Btn, Chip, ChipRow, Confirm, Loading, Note, S } from "./ui.jsx";

/* ---------------------------------------------------------------
   WOMEN'S HEALTH (run:cycle)

   Optional. Stored only on this phone (cycle-log). Tips follow the
   symptoms (engine CYCLE), not a fixed phase rule. Delete all with a
   confirm.
--------------------------------------------------------------- */

const EXTRA = ["Period started", "Period ended", "Headache", "Bloating"];

export function CycleScreen({ nav }) {
  const [log, setLog] = useState(null);
  const [sel, setSel] = useState([]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const iso = today();

  useEffect(() => {
    let live = true;
    getCycleLog().then((l) => {
      if (!live) return;
      const list = l || [];
      setLog(list);
      const t = list.find((e) => e.date === iso);
      if (t) {
        setSel(t.symptoms || []);
        setNote(t.note || "");
      }
    });
    return () => {
      live = false;
    };
  }, [iso]);

  if (!log) {
    return (
      <div data-testid="cycle-screen" style={S.page()}>
        <TopBar title="Women's health" onBack={nav.back} />
        <Loading />
      </div>
    );
  }

  const symptoms = [...engine.CYCLE.tips.map((t) => t.s), ...EXTRA];
  const tips = engine.CYCLE.tips.filter((t) => sel.includes(t.s));

  async function save() {
    const entry = { date: iso, symptoms: sel, note: note.trim() };
    const next = [...log.filter((e) => e.date !== iso), entry].sort((a, b) => a.date.localeCompare(b.date)).slice(-730);
    await setCycleLog(next);
    setLog(next);
    setSaved(true);
  }

  async function deleteAll() {
    await setCycleLog([]);
    setLog([]);
    setSel([]);
    setNote("");
    setConfirm(false);
  }

  const recent = log.slice().reverse().slice(0, 30);
  return (
    <div data-testid="cycle-screen" style={S.page()}>
      <TopBar title="Women's health" onBack={nav.back} />
      <div style={{ padding: "0 20px 12px" }}>
        <Note testId="cycle-note">{engine.CYCLE.note} The app sends nothing to a server.</Note>
      </div>
      <div style={S.card()}>
        <div style={S.title()}>Today · {engine.fmtDate(iso)}</div>
        <div style={{ ...S.body(), marginBottom: 8 }}>Select what is true today. All of this is optional.</div>
        <ChipRow>
          {symptoms.map((s) => (
            <Chip
              key={s}
              active={sel.includes(s)}
              testId="cycle-symptom"
              onClick={() => {
                setSaved(false);
                setSel(sel.includes(s) ? sel.filter((x) => x !== s) : [...sel, s]);
              }}
              style={{ whiteSpace: "normal" }}
            >
              {s}
            </Chip>
          ))}
        </ChipRow>
        <textarea value={note} onChange={(e) => { setNote(e.target.value); setSaved(false); }} rows={2} maxLength={500} placeholder="Note (optional)" style={{ ...S.field(), fontFamily: "inherit", marginTop: 10, resize: "vertical" }} />
        <div style={{ marginTop: 10 }}>
          <Btn kind="primary" onClick={save} testId="cycle-save">
            {saved ? "Saved" : "Save today"}
          </Btn>
        </div>
      </div>
      {tips.length > 0 && (
        <div data-testid="cycle-tips" style={S.card()}>
          <div style={S.title()}>Tips for today</div>
          {tips.map((t) => (
            <div key={t.s} style={{ marginTop: 6 }}>
              <div style={{ ...S.label(), color: COLORS.accent }}>{t.s}</div>
              <div style={S.text()}>{t.t}</div>
            </div>
          ))}
        </div>
      )}
      <div style={S.card()}>
        <div style={S.body()}>Very heavy bleeding, strong pain, or periods that stop: talk to a doctor. Low energy for many weeks can mean that you eat too little for your training.</div>
      </div>
      {recent.length > 0 && (
        <>
          <div style={S.section()}>Your notes</div>
          <div style={S.card()}>
            {recent.map((e) => (
              <div key={e.date} style={{ padding: "6px 0", borderBottom: `1px solid ${COLORS.line}` }}>
                <div style={{ ...S.label() }}>{engine.fmtDate(e.date)}</div>
                <div style={{ ...S.text(), fontSize: 13 }}>{(e.symptoms || []).join(", ") || "No symptoms"}</div>
                {e.note && <div style={{ ...S.body(), fontSize: 12 }}>{e.note}</div>}
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{ padding: "0 20px" }}>
        {!confirm ? (
          <Btn kind="danger" onClick={() => setConfirm(true)} disabled={!log.length} testId="cycle-delete-all">
            Delete all
          </Btn>
        ) : (
          <Confirm text="Delete all women's health notes from this phone? You cannot undo this." yes="Delete all" onYes={deleteAll} onNo={() => setConfirm(false)} testId="cycle-delete-confirm" />
        )}
      </div>
    </div>
  );
}

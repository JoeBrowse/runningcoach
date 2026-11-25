import { useEffect, useState } from "react";
import * as engine from "../run/engine.js";
import { COLORS } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";
import { getShoes, setShoes } from "../shared/store.js";
import { fromUnit, getProfile, newId, unitsOf } from "./runData.js";
import { Btn, Confirm, Loading, MONO, NumField, S } from "./ui.jsx";

/* ---------------------------------------------------------------
   SHOES (run:shoes)

   Shoes with a distance limit. The default shoe is selected after each
   run. Saved runs add their distance to the shoe.
--------------------------------------------------------------- */

function ShoeCard({ shoe, units, onChange, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  const share = shoe.limit > 0 ? Math.min(1, (Number(shoe.km) || 0) / shoe.limit) : 0;
  const near = share >= 0.9;
  return (
    <div data-testid="shoe-card" style={S.card({ opacity: shoe.retired ? 0.65 : 1 })}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ ...S.title(), marginBottom: 0, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{shoe.name}</div>
        {shoe.isDefault && <span style={{ ...S.label(), color: COLORS.accent }}>Default</span>}
        {shoe.retired && <span style={S.label()}>Retired</span>}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 13, color: COLORS.text, margin: "6px 0" }}>
        {engine.fmtKm(Number(shoe.km) || 0, units)} of {engine.fmtKm(shoe.limit || 0, units)}
      </div>
      <div style={{ height: 8, background: COLORS.surfaceRaised, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${Math.round(share * 100)}%`, height: "100%", background: near ? COLORS.bad : COLORS.accent }} />
      </div>
      {near && !shoe.retired && <div style={{ ...S.body(), marginTop: 6, color: COLORS.text }}>This shoe is near its limit. Look at the sole and the foam. Think about a new pair.</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 10 }}>
        <Btn style={{ fontSize: 11.5, padding: "8px 4px" }} disabled={shoe.isDefault || shoe.retired} onClick={() => onChange({ ...shoe, isDefault: true }, true)} testId="shoe-default">
          Default
        </Btn>
        <Btn style={{ fontSize: 11.5, padding: "8px 4px" }} onClick={() => onChange({ ...shoe, retired: !shoe.retired, isDefault: shoe.retired ? shoe.isDefault : false })} testId="shoe-retire">
          {shoe.retired ? "Use again" : "Retire"}
        </Btn>
        <Btn kind="danger" style={{ fontSize: 11.5, padding: "8px 4px" }} onClick={() => setConfirm(true)} testId="shoe-delete">
          Delete
        </Btn>
      </div>
      {confirm && <Confirm text={`Delete "${shoe.name}"? Runs keep their distance.`} yes="Delete" onYes={onDelete} onNo={() => setConfirm(false)} testId="shoe-delete-confirm" />}
    </div>
  );
}

export function ShoesScreen({ nav }) {
  const [shoes, setList] = useState(null);
  const [units, setUnits] = useState("km");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [startKm, setStartKm] = useState("0");
  const [limit, setLimit] = useState("");

  useEffect(() => {
    let live = true;
    Promise.all([getShoes(), getProfile()]).then(([s, p]) => {
      if (!live) return;
      setList(s || []);
      const u = unitsOf(p);
      setUnits(u);
      setLimit(u === "mi" ? "450" : "700");
    });
    return () => {
      live = false;
    };
  }, []);

  async function save(next) {
    setList(next);
    await setShoes(next);
  }

  function change(shoe, makeDefault) {
    save(shoes.map((s) => (s.id === shoe.id ? shoe : makeDefault ? { ...s, isDefault: false } : s)));
  }

  function add() {
    const n = name.trim();
    if (!n) return;
    const shoe = { id: newId("shoe"), name: n.slice(0, 40), km: Math.max(0, Math.round(fromUnit(startKm, units) * 10) / 10), limit: Math.max(50, Math.round(fromUnit(limit || (units === "mi" ? 450 : 700), units))), retired: false, isDefault: !shoes.some((s) => s.isDefault && !s.retired) };
    save([...shoes, shoe]);
    setName("");
    setStartKm("0");
    setAdding(false);
  }

  if (!shoes) {
    return (
      <div data-testid="shoes-screen" style={S.page()}>
        <TopBar title="Shoes" onBack={nav.back} />
        <Loading />
      </div>
    );
  }
  const active = shoes.filter((s) => !s.retired);
  const retired = shoes.filter((s) => s.retired);
  return (
    <div data-testid="shoes-screen" style={S.page()}>
      <TopBar title="Shoes" onBack={nav.back} />
      {shoes.length === 0 && (
        <div style={S.card()}>
          <div style={S.body()}>Add your running shoes. The app adds the distance of each run to the shoe that you choose. Most shoes last 500 to 800 km.</div>
        </div>
      )}
      {active.map((s) => (
        <ShoeCard key={s.id} shoe={s} units={units} onChange={change} onDelete={() => save(shoes.filter((x) => x.id !== s.id))} />
      ))}
      <div style={{ padding: "0 20px 12px" }}>
        {!adding ? (
          <Btn kind="primary" onClick={() => setAdding(true)} testId="add-shoe">
            Add a shoe
          </Btn>
        ) : (
          <div data-testid="add-shoe-form" style={S.card({ margin: 0 })}>
            <label style={{ display: "block" }}>
              <div style={{ ...S.label(), marginBottom: 4 }}>Name</div>
              <input data-testid="shoe-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Daily trainer" style={{ ...S.field(), fontFamily: "inherit" }} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
              <NumField label={`Distance now (${units})`} value={startKm} onChange={setStartKm} testId="shoe-start" />
              <NumField label={`Limit (${units})`} value={limit} onChange={setLimit} testId="shoe-limit" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
              <Btn kind="primary" onClick={add} disabled={!name.trim()} testId="shoe-save">
                Save
              </Btn>
              <Btn onClick={() => setAdding(false)}>Cancel</Btn>
            </div>
          </div>
        )}
      </div>
      {retired.length > 0 && <div style={S.section()}>Retired</div>}
      {retired.map((s) => (
        <ShoeCard key={s.id} shoe={s} units={units} onChange={change} onDelete={() => save(shoes.filter((x) => x.id !== s.id))} />
      ))}
      <div style={{ ...S.body(), padding: "0 24px" }}>Total on active shoes: {engine.fmtKm(active.reduce((t, s) => t + (Number(s.km) || 0), 0), units)}.</div>
    </div>
  );
}

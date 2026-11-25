import { useState } from "react";
import { Plus, Minus, Check, Timer, Play, RotateCcw, Trash2, Pencil, X, ChevronDown, Settings as SettingsIcon, Sparkles } from "lucide-react";
import { ordinal } from "../lib/dates.js";
import { EFFORT_SCALES, effortScaleOf, effortLabel } from "../lib/effort.js";
import { loadingsFor, loadingOf, formatSet, methodsFor, defaultMethodFor, isCableExercise, getCableGrips, isMachineExercise, formVideoUrl } from "../lib/exercises.js";
import { getTopSet, buildLastEntry, setProgressTone } from "../lib/history.js";
import { warmupSets } from "../lib/progression.js";
import { restSecondsFor, formatTime } from "../lib/rest.js";
import { hexToRgba, COLORS, setToneStyle, effortColor } from "../theme.js";

// A circle rather than another box, in a colour of its own, so the row
// still reads as "weight, reps" at a glance and the effort tag is clearly
// a different kind of thing. Tapping pops the four choices out beside it
// instead of opening a dialog — this gets used between sets, one-handed.
function EffortTile({ value, onPick, open, onToggle, scale }) {
  const setOpen = onToggle;
  const sc = scale || EFFORT_SCALES[0];
  const set = value !== null && value !== undefined && value !== "";
  const current = effortLabel(value, sc);

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={sc.full}
        title={current ? `${current.desc}. Tap to change.` : sc.full}
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          border: `1.5px solid ${set ? effortColor() : COLORS.line}`,
          background: set ? hexToRgba(effortColor(), 0.18) : "transparent",
          color: set ? effortColor() : COLORS.textDim,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: set ? 12 : 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
      >
        {set && current ? current.label : sc.name}
      </button>
      {open && (
        <>
          {/* Tapping anywhere else closes it, so the popout never traps. */}
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 36,
              zIndex: 41,
              display: "flex",
              gap: 5,
              background: COLORS.surfaceRaised,
              border: `1px solid ${effortColor()}`,
              borderRadius: 12,
              padding: 6,
              boxShadow: "0 8px 20px rgba(0,0,0,0.45)",
            }}
          >
            {sc.options.map((o) => {
              const active = set && Number(value) === o.value;
              return (
                <button
                  key={o.value}
                  onClick={() => { onPick(o.value); setOpen(false); }}
                  title={o.desc}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    border: `1.5px solid ${active ? effortColor() : COLORS.line}`,
                    background: active ? effortColor() : "transparent",
                    color: active ? "#10142B" : COLORS.text,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12.5,
                    padding: 0,
                  }}
                >
                  {o.label}
                </button>
              );
            })}
            {set && (
              <button
                onClick={() => { onPick(""); setOpen(false); }}
                title="Clear"
                style={{ width: 34, height: 34, borderRadius: "50%", border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.textDim, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function ExerciseCard({
  ex,
  sets,
  onSetChange,
  onAddSet,
  onRemoveSet,
  onToggleSetDone,
  history,
  onStartRest,
  onRemoveExercise,
  settings,
  isFirstForMuscle,
  meta,
  onMetaChange,
  onAddDropset,
  onDropChange,
  onRemoveDrop,
  onStartSuperset,
  onClearWeights,
  onFillFromLast,
  supersetInfo,
}) {
  const isAdvanced = settings.appMode === "advanced";
  // The implement is what everything else on this card hangs off: whether a
  // brand field appears, whether there are grips to pick, and which past
  // sessions "last time" is allowed to compare against.
  const methodOptions = methodsFor(ex.id);
  const method = meta.method || defaultMethodFor(ex.id) || "";
  // Derived here rather than handed down ready-made, so changing the
  // implement or typing a machine name re-points "last time" as you go.
  const last = buildLastEntry(history[ex.id], isAdvanced ? meta.brand : "", isAdvanced ? method : "", ex.id);
  // Compounds only, which is what the setting promises. Ramping up to a
  // 5kg lateral raise is noise, and it was appearing on every isolation
  // lift that happened to be first for its muscle.
  const showWarmupBlock = settings.showWarmups && isFirstForMuscle && ex.type === "compound";
  // Some people tick sets off, some just type and move on. Off, the boxes go
  // from both the set rows and the warm-up ramp; nothing about what gets
  // saved changes, since that has always followed what you typed.
  const showTicks = settings.showSetTicks !== false;
  const warmups = showWarmupBlock ? warmupSets(last && last.weight) : [];
  const [menuOpen, setMenuOpen] = useState(false);
  const isLoggable = ex.type !== "mobility";

  const [confirmRepeat, setConfirmRepeat] = useState(false);

  // The rows to write if the numbers are tapped. Older history predates
  // per-set records and carries one weight and rep count for the whole
  // exercise, so it becomes a single set rather than nothing.
  const lastSets = last && !last.brandMismatch
    ? (last.sets && last.sets.length ? last.sets : (last.weight || last.reps ? [{ weight: last.weight, reps: last.reps }] : []))
    : [];
  const repeatable = isLoggable && !!onFillFromLast && lastSets.length > 0;
  // Anything already entered on this card, including a ticked-off set.
  const hasEntries = (sets || []).some((st) => (st.weight || "") !== "" || (st.reps || "") !== "" || st.done);

  // A single tap when the card is empty, two when it is not — replacing sets
  // someone has already logged is the one way this button could cost them
  // work, so it asks first rather than being clever about merging.
  function handleRepeatLast() {
    if (!repeatable) return;
    if (hasEntries && !confirmRepeat) {
      setConfirmRepeat(true);
      return;
    }
    onFillFromLast(ex.id, lastSets);
    setConfirmRepeat(false);
  }

  const [noteOpen, setNoteOpen] = useState(false);
  const [openEffort, setOpenEffort] = useState(null); // index of the set whose effort popout is open
  // Whichever of RIR and RPE this lifter reads. Only the labels differ —
  // the value written to the set is the same either way.
  const scale = effortScaleOf(settings);
  const [warmupChecked, setWarmupChecked] = useState(() => new Set());
  // Calisthenics get their own dedicated control instead of being buried in
  // the cog menu: how a dip or a pull-up is loaded is a per-session decision
  // made before the first rep, not a setting you go looking for.
  const loadingOptions = loadingsFor(ex.id) || [];
  const calisthenic = loadingOptions.length > 0;
  const loading = calisthenic ? loadingOf(ex.id, method, "") : null;
  const [loadingOpen, setLoadingOpen] = useState(false);
  // Asked once per exercise per session, the first time a weight field is
  // touched. Assistance settings and belt weights barely move week to week,
  // so retyping the same number every session is pure friction — but
  // pre-filling it silently would be worse, because a number you did not
  // enter is a number you will not notice is wrong.
  const [weightPromptAt, setWeightPromptAt] = useState(null);
  const [weightPromptDone, setWeightPromptDone] = useState(false);
  /* The last figure logged at THIS loading, not simply the last figure. An
     assisted session and a weighted one both store a number in the same
     column and they mean opposite things, so offering the wrong one would
     suggest hanging 30kg off someone who needs 30kg of help. */
  const lastLoadingWeight = (() => {
    if (!calisthenic || loading === "Bodyweight") return null;
    const list = history[ex.id] || [];
    for (let i = list.length - 1; i >= 0; i--) {
      const top = getTopSet(list[i].sets) || {};
      if (loadingOf(ex.id, list[i].method, top.weight) !== loading) continue;
      const w = parseFloat(top.weight);
      if (Number.isFinite(w) && w > 0) return w;
    }
    return null;
  })();
  const showMethodPicker = isAdvanced && ex.type !== "mobility" && methodOptions.length > 1 && !calisthenic;
  const cable = isCableExercise(ex, method);
  const machineOnly = !cable && isMachineExercise(ex, method);
  const showMachineBlock = isAdvanced && (cable || machineOnly);
  const grips = cable ? getCableGrips(ex) : [];

  const inputBase = {
    background: COLORS.surfaceRaised,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 8,
    color: COLORS.text,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
  };

  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div>
          <div style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3 }}>
            {ex.type === "compound" ? "Compound" : ex.type === "isolation" ? "Isolation" : "Mobility"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 17, textTransform: "uppercase" }}>
              {ex.name}
            </div>
            {ex.type !== "mobility" && (
              <a
                data-tour="form-video"
                href={formVideoUrl(ex.name, method)}
                target="_blank"
                rel="noreferrer"
                title={`How to do ${ex.name}`}
                aria-label={`Watch how to do ${ex.name}`}
                style={{ width: 22, height: 22, borderRadius: 6, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, color: COLORS.textDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, textDecoration: "none" }}
              >
                <Play size={11} />
              </a>
            )}
          </div>
          <div style={{ color: COLORS.textDim, fontSize: 12 }}>{ex.muscle}</div>
        </div>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          style={{ width: 28, height: 28, borderRadius: 8, background: menuOpen ? COLORS.accent : COLORS.surfaceRaised, border: `1px solid ${menuOpen ? COLORS.accent : COLORS.line}`, color: menuOpen ? COLORS.onAccent : COLORS.textDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >
          <SettingsIcon size={14} />
        </button>
      </div>

      {menuOpen && (
        <div style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: 10, marginBottom: 10 }}>
          {isLoggable && isAdvanced && (
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <button
                onClick={() => {
                  onAddDropset(ex.id);
                  setMenuOpen(false);
                }}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "9px 0", color: COLORS.text, fontSize: 11.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.3 }}
              >
                <ChevronDown size={13} color={COLORS.accent} /> Dropset
              </button>
              <button
                onClick={() => {
                  onStartSuperset();
                  setMenuOpen(false);
                }}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "9px 0", color: COLORS.text, fontSize: 11.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.3 }}
              >
                <Sparkles size={13} color={COLORS.accent} /> Superset
              </button>
            </div>
          )}
          {/* Changing the implement no longer swaps the exercise for a
              different one — it is the same lift loaded another way, so the
              history stays attached and only the comparison narrows. */}
          {showMethodPicker && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                Select the equipment
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {methodOptions.map((opt) => {
                  const active = method === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => {
                        onMetaChange(ex.id, "method", opt);
                        setMenuOpen(false);
                      }}
                      style={{ background: active ? COLORS.accent : COLORS.surface, border: `1px solid ${active ? COLORS.accent : COLORS.line}`, borderRadius: 8, padding: "10px 8px", color: active ? COLORS.onAccent : COLORS.text, fontSize: 12, textAlign: "center", lineHeight: 1.25 }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <button
            onClick={onRemoveExercise}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "transparent", border: `1px solid ${COLORS.bad}`, borderRadius: 8, padding: "8px 0", color: COLORS.bad, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
          >
            <Trash2 size={13} /> Delete Exercise
          </button>
        </div>
      )}

      {supersetInfo && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: hexToRgba(supersetInfo.color, 0.14), border: `1px solid ${supersetInfo.color}`, borderRadius: 999, padding: "3px 10px", marginBottom: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: supersetInfo.color }} />
          <span style={{ color: supersetInfo.color, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase" }}>
            Superset {supersetInfo.label}
          </span>
        </div>
      )}

      {calisthenic && (
        <div data-tour="calisthenic-loading" style={{ marginBottom: 10 }}>
          {!loadingOpen ? (
            <button
              onClick={() => setLoadingOpen(true)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.accent}`, borderRadius: 10, padding: "10px 0", color: COLORS.accent, fontFamily: "'Oswald', sans-serif", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              {loading}
              <ChevronDown size={14} />
            </button>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${loadingOptions.length}, 1fr)`, gap: 6 }}>
              {loadingOptions.map((opt) => {
                const active = loading === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => {
                      onMetaChange(ex.id, "method", opt);
                      // Switching loading changes what the weight column
                      // means, so a number typed under the old meaning is
                      // cleared rather than silently reinterpreted.
                      if (opt !== loading) onClearWeights(ex.id);
                      setLoadingOpen(false);
                    }}
                    style={{ background: active ? COLORS.accent : COLORS.surfaceRaised, border: `1px solid ${active ? COLORS.accent : COLORS.line}`, borderRadius: 10, padding: "11px 4px", color: active ? COLORS.onAccent : COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.3 }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {calisthenic && weightPromptAt !== null && lastLoadingWeight !== null && (
        <div style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.accent}`, borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
          <div style={{ color: COLORS.text, fontSize: 12.5, marginBottom: 8 }}>
            Your last {loading.toLowerCase()} session used{" "}
            <strong>{lastLoadingWeight}{settings.weightUnit}</strong>. Use it again?
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                // Fills every set still blank, because the pin or the belt
                // is set once and then every set of the exercise uses it.
                sets.forEach((st, idx) => {
                  if (!st.weight) onSetChange(ex.id, idx, "weight", String(lastLoadingWeight));
                });
                setWeightPromptDone(true);
                setWeightPromptAt(null);
              }}
              style={{ flex: 1, background: COLORS.accent, border: "none", borderRadius: 8, padding: "9px 0", color: COLORS.onAccent, fontFamily: "'Oswald', sans-serif", fontSize: 12.5, textTransform: "uppercase" }}
            >
              Use {lastLoadingWeight}{settings.weightUnit}
            </button>
            <button
              onClick={() => { setWeightPromptDone(true); setWeightPromptAt(null); }}
              style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "9px 0", color: COLORS.textDim, fontFamily: "'Oswald', sans-serif", fontSize: 12.5, textTransform: "uppercase" }}
            >
              Enter new
            </button>
          </div>
        </div>
      )}

      {settings.showCues && (
        <div style={{ color: COLORS.textDim, fontSize: 12.5, lineHeight: 1.4, marginTop: 8, marginBottom: 10, fontStyle: "italic" }}>
          {ex.cue}
        </div>
      )}

      {ex.targetSets && ex.targetReps && (
        <div data-testid="target-hint" style={{ color: COLORS.accent, fontSize: 12, lineHeight: 1.4, marginTop: 6, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>
          Target: {ex.targetSets} × {ex.targetReps}{ex.targetReps === 1 ? " (hold 30 to 45 seconds)" : ""}
        </div>
      )}

      {showMachineBlock && (
        <div style={{ background: COLORS.surfaceRaised, borderRadius: 8, padding: "9px 10px", marginBottom: 10 }}>
          <div style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
            {cable ? "Machine & grip" : "Machine"}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              placeholder="Machine brand"
              value={meta.brand || ""}
              onChange={(e) => onMetaChange(ex.id, "brand", e.target.value)}
              style={{ ...inputBase, flex: 1, minWidth: 0, padding: "7px 8px", fontFamily: "system-ui, sans-serif", fontSize: 12.5 }}
            />
            {cable && (
              <select
                value={meta.grip || ""}
                onChange={(e) => onMetaChange(ex.id, "grip", e.target.value)}
                style={{ ...inputBase, flex: 1, minWidth: 0, padding: "7px 8px", fontFamily: "system-ui, sans-serif", fontSize: 12.5, appearance: "none", WebkitAppearance: "none" }}
              >
                <option value="">Grip…</option>
                {grips.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* Free text for the things a set and rep count cannot hold: seat
          height, which notch the pin was on, the shoulder that twinged. */}
      {isLoggable && (
        noteOpen || (meta.notes && meta.notes.length) ? (
          <textarea
            autoFocus={noteOpen && !(meta.notes && meta.notes.length)}
            rows={2}
            placeholder="Note: for example, seat height or how the set felt"
            value={meta.notes || ""}
            onChange={(e) => onMetaChange(ex.id, "notes", e.target.value)}
            onBlur={() => setNoteOpen(false)}
            style={{ width: "100%", boxSizing: "border-box", resize: "vertical", background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "8px 10px", marginBottom: 10, color: COLORS.text, fontFamily: "system-ui, sans-serif", fontSize: 12.5, lineHeight: 1.45 }}
          />
        ) : (
          <button
            onClick={() => setNoteOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", padding: "0 0 10px", color: COLORS.textDim, fontSize: 11.5 }}
          >
            <Pencil size={11} /> Add a note
          </button>
        )
      )}

      {settings.showLastSet && (
        last ? (
          <div style={{ background: COLORS.surfaceRaised, borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, gap: 8 }}>
              <span style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase" }}>
                {last.askedBrand ? `Last time on ${last.askedBrand}` : "Last time"}
                {!last.brandMismatch && last.order ? ` · done ${ordinal(last.order)}${last.total ? ` of ${last.total}` : ""}` : ""}
              </span>
              {!last.brandMismatch && (
                <span style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace" }}>{last.date}</span>
              )}
            </div>
            {/* A number set on a different stack is not a target, so when this
                machine has no history the previous session is demoted to a
                footnote rather than presented as something to beat. */}
            {last.brandMismatch ? (
              <>
                <div style={{ color: COLORS.text, fontSize: 12.5, lineHeight: 1.45 }}>
                  You have not logged this exercise this way before.
                </div>
                <div style={{ color: COLORS.textDim, fontSize: 11, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                  {last.date} ·{" "}
                  {(last.sets && last.sets.length ? last.sets : [{ weight: last.weight, reps: last.reps }])
                    .map((s) => formatSet(s.weight, s.reps, settings.weightUnit))
                    .join("  ·  ")}
                  {[last.method, last.brand].filter(Boolean).length ? ` on ${[last.method, last.brand].filter(Boolean).join(" · ")}` : ""}
                </div>
              </>
            ) : (
              <>
                {/* Tapping the numbers writes them onto this exercise. Most
                    sessions are the last one repeated, and typing three
                    identical rows back in is the app's most repeated action.
                    Only offered where the numbers are actually a target —
                    a brandMismatch reading is explicitly not one. */}
                <button
                  onClick={handleRepeatLast}
                  disabled={!repeatable}
                  aria-label={repeatable ? "Use these weights and reps again" : undefined}
                  style={{
                    display: "block", width: "100%", textAlign: "left", background: "transparent",
                    border: "none", padding: 0, cursor: repeatable ? "pointer" : "default",
                  }}
                >
                  <span style={{ display: "block", color: COLORS.text, fontSize: 12.5, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
                    {(last.sets && last.sets.length ? last.sets : [{ weight: last.weight, reps: last.reps }])
                      .map((s) => formatSet(s.weight, s.reps, settings.weightUnit))
                      .join("  ·  ")}
                  </span>
                  {repeatable && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 5, color: confirmRepeat ? COLORS.accent : COLORS.textDim, fontSize: 11 }}>
                      <RotateCcw size={11} />
                      {confirmRepeat ? "Tap again to replace what you have typed" : "Tap to log these again"}
                    </span>
                  )}
                </button>
                {(last.method || last.brand || last.grip) && (
                  <div style={{ color: COLORS.textDim, fontSize: 11, marginTop: 4 }}>
                    on {[last.method, last.brand, last.grip].filter(Boolean).join(" · ")}
                  </div>
                )}
                {last.notes && (
                  <div style={{ color: COLORS.textDim, fontSize: 11.5, marginTop: 5, fontStyle: "italic", lineHeight: 1.4 }}>
                    “{last.notes}”
                  </div>
                )}
              </>
            )}
            {(last.supersetWith && last.supersetWith.length) || last.dropSetCount > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {last.supersetWith && last.supersetWith.length > 0 && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: hexToRgba(COLORS.accent, 0.12), border: `1px solid ${hexToRgba(COLORS.accent, 0.5)}`, borderRadius: 999, padding: "3px 9px", color: COLORS.accent, fontSize: 10.5 }}>
                    <Sparkles size={11} /> In a superset with {last.supersetWith.join(" & ")}
                  </span>
                )}
                {last.dropSetCount > 0 && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: hexToRgba(COLORS.accent, 0.12), border: `1px solid ${hexToRgba(COLORS.accent, 0.5)}`, borderRadius: 999, padding: "3px 9px", color: COLORS.accent, fontSize: 10.5 }}>
                    <ChevronDown size={11} /> Drop set on {last.dropSetCount} set{last.dropSetCount === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            ) : null}
            {last.order > 1 && (
              <div style={{ color: COLORS.textDim, fontSize: 10.5, marginTop: 4, fontStyle: "italic" }}>
                You did this exercise {ordinal(last.order)} last time.
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: COLORS.textDim, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>
            last time: no history yet
          </div>
        )
      )}

      {showWarmupBlock && (
        <div style={{ background: COLORS.surfaceRaised, borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
          <div style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
            Suggested Warm-Up
          </div>
          {warmups.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {warmups.map((w, wi) => {
                const checked = showTicks && warmupChecked.has(wi);
                const label = w.placeholder ? `${w.weight} × ${w.reps}` : `${w.weight}${settings.weightUnit}×${w.reps}`;
                const text = (
                  <span style={{ color: COLORS.textDim, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", textDecoration: checked ? "line-through" : "none" }}>
                    {label}
                  </span>
                );
                // Without its box the row has nothing to toggle, so it stops
                // being a button rather than becoming a dead one.
                if (!showTicks) return <div key={wi}>{text}</div>;
                return (
                  <button
                    key={wi}
                    onClick={() =>
                      setWarmupChecked((prev) => {
                        const next = new Set(prev);
                        if (next.has(wi)) next.delete(wi);
                        else next.add(wi);
                        return next;
                      })
                    }
                    style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", padding: 0 }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        flexShrink: 0,
                        border: `1.5px solid ${checked ? COLORS.accent : COLORS.line}`,
                        background: checked ? COLORS.accent : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {checked && <Check size={11} color={COLORS.onAccent} />}
                    </div>
                    {text}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ color: COLORS.textDim, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
              Do 2-3 light sets before your working weight. Add weight on each set.
            </div>
          )}
        </div>
      )}

      {sets.map((s, i) => {
        // With the boxes hidden there is nothing to tick, so every row reads
        // as done: the dimming exists to show what is left, and a permanently
        // dim list with no way to brighten it would just look broken.
        const isDone = !showTicks || s.done !== false;
        // Older records stored a single set on the record itself rather
        // than in a sets array, so fall back to that for the first row.
        const lastSets = last && last.sets && last.sets.length ? last.sets : last ? [{ weight: last.weight, reps: last.reps }] : [];
        const tone = setToneStyle(setProgressTone(s, lastSets[i]));
        const toneStyle = tone ? { border: `${tone.borderWidth}px solid ${tone.borderColor}` } : null;
        return (
        <div
          key={i}
          style={{
            marginBottom: 8,
            // Dimming an unfinished row also dims anything it opens — opacity
            // composites the whole subtree — so the effort popout would render
            // half transparent with the row beneath showing through it. A row
            // being interacted with goes to full strength, which is the right
            // thing to look at anyway. z-index then keeps the popout above the
            // rows below, since the dimmed ones are their own stacking
            // contexts and would otherwise paint over it.
            opacity: isDone || openEffort === i ? 1 : 0.55,
            position: "relative",
            zIndex: openEffort === i ? 30 : "auto",
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {showTicks && (
              <button
                onClick={() => onToggleSetDone(ex.id, i)}
                title={s.done !== false ? "Mark as not done yet" : "Mark as done"}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  flexShrink: 0,
                  border: `1.5px solid ${s.done !== false ? COLORS.accent : COLORS.line}`,
                  background: s.done !== false ? COLORS.accent : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {s.done !== false && <Check size={13} color={COLORS.onAccent} />}
              </button>
            )}
            <div style={{ width: 18, color: COLORS.textDim, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{i + 1}</div>
            {loading === "Bodyweight" ? (
              // Unloaded: there is no number to enter, and an empty box that
              // must stay empty is just a thing to wonder about.
              <div
                title="Bodyweight. No added weight and no assistance."
                style={{ width: 62, flexGrow: 0, flexShrink: 0, padding: "5px 6px", boxSizing: "border-box", textAlign: "center", borderRadius: 8, border: `1px solid ${COLORS.line}`, background: COLORS.surface, color: COLORS.textDim, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}
              >
                BW
              </div>
            ) : (
              <input
                type="number"
                inputMode="decimal"
                placeholder={loading === "Assisted" ? "−assist" : loading === "Weighted" ? "+wt" : "wt"}
                value={s.weight}
                onFocus={() => {
                  if (!calisthenic || weightPromptDone || s.weight) return;
                  if (lastLoadingWeight === null) return;
                  setWeightPromptAt(i);
                }}
                onChange={(e) => onSetChange(ex.id, i, "weight", e.target.value)}
                style={{ ...inputBase, width: 62, flexGrow: 0, flexShrink: 0, padding: "5px 6px", boxSizing: "border-box", ...toneStyle }}
              />
            )}
            <input
              type="number"
              inputMode="numeric"
              placeholder={ex.targetReps ? String(ex.targetReps) : "reps"}
              value={s.reps}
              onChange={(e) => onSetChange(ex.id, i, "reps", e.target.value)}
              style={{ ...inputBase, width: 62, flexGrow: 0, flexShrink: 0, padding: "5px 6px", boxSizing: "border-box", ...toneStyle }}
            />
            {isAdvanced && (
              <EffortTile
                value={s.rir}
                scale={scale}
                open={openEffort === i}
                onToggle={(v) => setOpenEffort(v ? i : null)}
                onPick={(v) => onSetChange(ex.id, i, "rir", v)}
              />
            )}
            {sets.length > 1 && (
              <button
                onClick={() => onRemoveSet(ex.id, i)}
                style={{ width: 30, height: 30, borderRadius: 8, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, color: COLORS.textDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <Minus size={14} />
              </button>
            )}
          </div>
          {(s.drops || []).map((d, di) => (
            <div key={di} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, marginLeft: 30 }}>
              <div style={{ width: 32, color: COLORS.accent, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5, textTransform: "uppercase" }}>drop</div>
              <input
                type="number"
                inputMode="decimal"
                placeholder="wt"
                value={d.weight}
                onChange={(e) => onDropChange(ex.id, i, di, "weight", e.target.value)}
                style={{ ...inputBase, width: 56, flexGrow: 0, flexShrink: 0, padding: "5px 6px", borderColor: hexToRgba(COLORS.accent, 0.5) }}
              />
              <input
                type="number"
                inputMode="numeric"
                placeholder="reps"
                value={d.reps}
                onChange={(e) => onDropChange(ex.id, i, di, "reps", e.target.value)}
                style={{ ...inputBase, width: 56, flexGrow: 0, flexShrink: 0, padding: "5px 6px", borderColor: hexToRgba(COLORS.accent, 0.5) }}
              />
              <button
                onClick={() => onRemoveDrop(ex.id, i, di)}
                style={{ width: 28, height: 28, borderRadius: 8, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, color: COLORS.textDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
        );
      })}
      <button
        onClick={() => onAddSet(ex.id)}
        style={{
          width: "100%",
          background: "transparent",
          border: `1px dashed ${COLORS.line}`,
          borderRadius: 8,
          padding: "9px 0",
          color: COLORS.textDim,
          fontSize: 12.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <Plus size={13} /> Add set
      </button>
      <button
        onClick={() => onStartRest(ex)}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          padding: "4px 0",
          color: COLORS.accent,
          fontSize: 12,
          fontFamily: "'Oswald', sans-serif",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <Timer size={13} /> Start Rest ({formatTime(restSecondsFor(ex, settings))})
      </button>
    </div>
  );
}

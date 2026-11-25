import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, Upload } from "lucide-react";
import { activityType } from "../../lib/activities.js";
import { COLORS } from "../../theme.js";
import { groupSkipped, importFiles } from "../import/index.js";
import { body, cardTitle, fmtInt, legend, mono, primaryBtn, resultBox, resultDetail, resultTitle } from "./dataStyles.js";

/* ---------------------------------------------------------------
   BRING YOUR HISTORY

   <HistoryImport onDone={(summary) => ...} />

   A file picker for GPX, TCX, FIT, GZ, ZIP and Strava activities.csv
   files, a progress bar and a summary card. The Data screen and the
   first-open setup both use it. `bare` removes the card frame, for a
   parent that has its own frame.
--------------------------------------------------------------- */

const PHASE_TEXT = {
  read: "Opening the files",
  parse: "Reading the activities",
  save: "Saving the activities",
  done: "Done",
};

export const IMPORT_ACCEPT = ".gpx,.tcx,.fit,.gz,.zip,.csv";

function StatBox({ label, value, testId }) {
  return (
    <div style={{ flex: 1, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 8px", textAlign: "center", minWidth: 0 }}>
      <div data-testid={testId} style={{ ...mono(), color: COLORS.text, fontSize: 20 }}>{fmtInt(value)}</div>
      <div style={{ ...legend(), marginBottom: 0, marginTop: 2, fontSize: 9.5 }}>{label}</div>
    </div>
  );
}

export function ImportSummary({ summary }) {
  const groups = groupSkipped(summary.skipped);
  const sports = Object.entries(summary.bySport || {}).sort((a, b) => b[1] - a[1]);
  const ok = summary.added > 0 || (summary.duplicates > 0 && !summary.skipped.length);
  return (
    <div data-testid="import-summary" style={resultBox(ok || summary.parsed > 0)}>
      <div style={resultTitle(ok || summary.parsed > 0)}>
        {summary.added > 0 ? "Import complete" : summary.parsed > 0 ? "No new activities" : "The app found no activities"}
      </div>
      <div style={{ display: "flex", gap: 8, margin: "8px 0" }}>
        <StatBox label="Added" value={summary.added} testId="import-added" />
        <StatBox label="Duplicates" value={summary.duplicates} testId="import-duplicates" />
        <StatBox label="Skipped" value={summary.skipped.length} testId="import-skipped" />
      </div>
      {sports.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {sports.map(([id, n]) => (
            <span key={id} style={{ ...mono(), fontSize: 11, color: COLORS.text, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 999, padding: "3px 9px" }}>
              {activityType(id).label} · {fmtInt(n)}
            </span>
          ))}
        </div>
      )}
      {summary.duplicates > 0 && (
        <div style={{ ...body(), fontSize: 11.5, marginBottom: 6 }}>
          A duplicate has the same start time (within 2 minutes) and the same distance (within 3%) as an activity that is already in the app. The app did not add duplicates.
        </div>
      )}
      {groups.length > 0 && (
        <div>
          <div style={{ ...legend(), marginTop: 6 }}>Skipped files</div>
          {groups.map((g) => (
            <div key={g.reason} style={{ marginBottom: 6 }}>
              <div style={{ color: COLORS.text, fontSize: 12, lineHeight: 1.4 }}>
                {g.reason} <span style={{ ...mono(), color: COLORS.textDim }}>({fmtInt(g.count)})</span>
              </div>
              <div style={resultDetail()}>
                {g.files.join("\n")}
                {g.count > g.files.length ? `\n+ ${fmtInt(g.count - g.files.length)} more` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HelpBlock() {
  const [open, setOpen] = useState(false);
  const step = { ...body(), margin: "0 0 4px", paddingLeft: 4 };
  return (
    <div style={{ marginTop: 12 }}>
      <button
        data-testid="import-help-toggle"
        onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.accent, fontFamily: "'Oswald', sans-serif", fontSize: 12.5, textTransform: "uppercase", letterSpacing: 0.5 }}
      >
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />} How to get your files
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          <div style={legend()}>Strava</div>
          <ol style={{ margin: "0 0 10px", paddingLeft: 18 }}>
            <li style={step}>On the Strava website, open Settings. Then open My Account.</li>
            <li style={step}>Under "Download or Delete Your Account", select "Get Started".</li>
            <li style={step}>Select "Request Your Archive".</li>
            <li style={step}>Strava sends an email with a link. Download the ZIP file.</li>
            <li style={step}>Select the ZIP file here. Do not unpack it.</li>
          </ol>
          <div style={legend()}>Garmin</div>
          <ol style={{ margin: "0 0 10px", paddingLeft: 18 }}>
            <li style={step}>On the Garmin website, sign in to your Garmin account.</li>
            <li style={step}>Open Data Management. Then select "Export Your Data".</li>
            <li style={step}>Select "Request Data Export".</li>
            <li style={step}>Garmin sends an email with a link. This can take some days. Download the ZIP file.</li>
            <li style={step}>Select the ZIP file here. Do not unpack it.</li>
          </ol>
          <div style={body()}>
            You can also select GPX, TCX or FIT files from other apps and watches. You can select many files at the same time.
          </div>
        </div>
      )}
    </div>
  );
}

export function HistoryImport({ onDone, bare = false }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null); // { phase, done, total }
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  function pick() {
    setError(null);
    if (fileRef.current) fileRef.current.click();
  }

  async function handleFiles(event) {
    const files = Array.from((event.target && event.target.files) || []);
    if (event.target) event.target.value = "";
    if (!files.length) return;
    setBusy(true);
    setSummary(null);
    setError(null);
    setProgress({ phase: "read", done: 0, total: files.length });
    try {
      const result = await importFiles(files, { onProgress: (p) => setProgress(p) });
      setSummary(result);
      if (onDone) onDone(result);
    } catch (e) {
      setError(String((e && e.message) || e));
    }
    setBusy(false);
    setProgress(null);
  }

  const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const frame = bare ? {} : { background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16 };

  return (
    <div data-testid="history-import" style={frame}>
      {!bare && <div style={cardTitle()}>Bring your history</div>}
      <div style={{ ...body(), marginBottom: 12 }}>
        Add your past runs and other activities. The plan uses them to find your current fitness. The app reads the files on this phone. It does not send them to a server.
      </div>
      <button data-testid="import-pick" onClick={pick} disabled={busy} style={primaryBtn(busy)}>
        <Upload size={14} /> {busy ? "Working…" : "Select Files"}
      </button>
      <div style={{ ...body(), fontSize: 11, marginTop: 6, textAlign: "center" }}>GPX, TCX, FIT, GZ, ZIP or Strava activities.csv</div>
      <input data-testid="import-input" ref={fileRef} type="file" multiple accept={IMPORT_ACCEPT} onChange={handleFiles} style={{ display: "none" }} />

      {progress && (
        <div data-testid="import-progress" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", ...body(), fontSize: 11.5, marginBottom: 6 }}>
            <span>{PHASE_TEXT[progress.phase] || "Working"}</span>
            <span style={mono()}>
              {progress.phase === "read" || progress.phase === "done" ? "" : `${fmtInt(progress.done)} / ${fmtInt(progress.total)}`}
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: COLORS.accent, transition: "width 0.2s" }} />
          </div>
        </div>
      )}

      {error && (
        <div style={resultBox(false)}>
          <div style={resultTitle(false)}>The import stopped</div>
          <div style={resultDetail()}>{error}</div>
        </div>
      )}

      {summary && <ImportSummary summary={summary} />}

      <HelpBlock />
    </div>
  );
}

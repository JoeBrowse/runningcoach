import { dateStrOf } from "../../lib/dates.js";
import { KEYS, addActivities, getImportLog, isDuplicate, listActivities, setKey } from "../store.js";
import { expandInputs, unwrap } from "./archive.js";
import { baseName, round } from "./common.js";
import { parseFit } from "./fit.js";
import { parseGpx } from "./gpx.js";
import { isStravaCsv, parseStravaCsv } from "./strava.js";
import { parseTcx } from "./tcx.js";

export { setDOMParser } from "./common.js";
export { parseGpx } from "./gpx.js";
export { parseTcx } from "./tcx.js";
export { parseFit } from "./fit.js";
export { parseCsv, parseStravaCsv, parseStravaDate } from "./strava.js";

/* ---------------------------------------------------------------
   IMPORT

   importFiles(fileList, { onProgress, DOMParser })

   1. Reads each selected file (GPX, TCX, FIT, their .gz forms, ZIP
      archives and a Strava activities.csv).
   2. Reads each activity file in small batches. Between the batches it
      gives the screen time to draw, so 2,000 files do not freeze it.
   3. Joins Strava CSV rows to their files (name and type come from the
      CSV, the track data comes from the file).
   4. Makes one store activity for each:
        { type, startedAt (from the FILE, never today), date, minutes,
          durationSec, km, avgHR, maxHR, name, laps, splits,
          source: "import", origin: "strava" | "garmin" | "file",
          sourceFile }
      `type` is a store activity id: run, walk, hike, cycle, swim,
      treadmill, stationary-bike, rower, ... or other.
   5. Saves them with store.addActivities, which skips duplicates
      (same start within 2 minutes and same distance within 3%).

   Returns { files, parsed, added, duplicates, skipped: [{ file, reason }],
             bySport: { run: 3, cycle: 1, ... } }   (bySport counts the
   activities that were added).

   Track points are not saved for imported activities. They would fill
   the phone storage after a large import. Laps and km splits are saved.
--------------------------------------------------------------- */

const PARSE_BATCH = 20;
const SAVE_BATCH = 100;
const MAX_LAPS = 50;

const yieldNow = () => new Promise((r) => setTimeout(r));

async function readInput(file) {
  // Tests pass { name, bytes }. A browser File also has a bytes() method,
  // so test for real data, not for the name.
  if (file && (file.bytes instanceof Uint8Array || file.bytes instanceof ArrayBuffer)) {
    return { name: file.name, bytes: file.bytes instanceof Uint8Array ? file.bytes : new Uint8Array(file.bytes) };
  }
  const buf = await file.arrayBuffer();
  return { name: file.name, bytes: new Uint8Array(buf) };
}

async function parseSource(src, options) {
  const bytes = unwrap(src.load());
  if (src.kind === "fit") return parseFit(bytes);
  const text = new TextDecoder("utf-8").decode(bytes);
  if (src.kind === "gpx") return [parseGpx(text, options)];
  if (src.kind === "tcx") return [parseTcx(text, options)];
  throw new Error("The app cannot read this type of file.");
}

function compactLaps(laps) {
  if (!Array.isArray(laps) || laps.length < 2) return undefined;
  return laps.slice(0, MAX_LAPS);
}

// One parsed file (or CSV row) to the store input of saveRun/addActivities.
export function toStoreActivity(p, meta = {}) {
  const startMs = new Date(p.startedAt).getTime();
  const durationSec = Math.max(0, Math.round(p.durationSec || 0));
  const out = {
    id: `imp-${meta.origin || "file"}-${startMs}-${Math.round((p.km || 0) * 1000)}`,
    type: p.type || "other",
    startedAt: new Date(startMs).toISOString(),
    date: dateStrOf(new Date(startMs)),
    durationSec,
    minutes: round(durationSec / 60, 1),
    km: p.km !== null && p.km !== undefined ? round(p.km, 3) : null,
    avgHR: p.avgHR || null,
    maxHR: p.maxHR || null,
    name: p.name || null,
    source: "import",
    origin: meta.origin || "file",
    sourceFile: meta.sourceFile || null,
  };
  if (p.elapsedSec && p.elapsedSec !== durationSec) out.elapsedSec = p.elapsedSec;
  if (p.sport) out.sport = String(p.sport);
  const laps = compactLaps(p.laps);
  if (laps) out.laps = laps;
  if (Array.isArray(p.splits) && p.splits.length) out.splits = p.splits;
  if (meta.externalId) out.externalId = meta.externalId;
  if (p.strength) out.strength = true;
  return out;
}

// Joins the CSV rows to the parsed files. Returns store inputs.
function mergeStrava(csv, parsedByPath, usedPaths) {
  const out = [];
  const base = csv.path.replace(/activities\.csv(\.gz)?$/i, "");
  for (const row of csv.rows) {
    let match = null;
    if (row.file) {
      if (csv.standalone) {
        const want = baseName(row.file).toLowerCase();
        for (const [path, value] of parsedByPath) {
          if (baseName(path).toLowerCase() === want) {
            match = { path, value };
            break;
          }
        }
      } else {
        const path = base + row.file;
        if (parsedByPath.has(path)) match = { path, value: parsedByPath.get(path) };
      }
    }
    if (match) usedPaths.add(match.path);
    const file = match && match.value && match.value.list && match.value.list[0];
    if (file) {
      const csvTypeKnown = row.type !== "other";
      const merged = {
        ...file,
        type: csvTypeKnown || file.type === "other" ? row.type : file.type,
        sport: row.sport || file.sport,
        strength: row.strength || file.strength,
        name: row.name || file.name,
        durationSec: row.movingSec || file.durationSec,
        elapsedSec: row.elapsedSec || file.elapsedSec,
        km: file.km !== null && file.km !== undefined ? file.km : row.km,
        avgHR: file.avgHR || row.avgHR,
        maxHR: file.maxHR || row.maxHR,
      };
      out.push(toStoreActivity(merged, { origin: "strava", sourceFile: match.path, externalId: row.id ? `strava:${row.id}` : null }));
    } else if (row.movingSec || row.elapsedSec) {
      out.push(
        toStoreActivity(
          { ...row, durationSec: row.movingSec || row.elapsedSec },
          { origin: "strava", sourceFile: row.file || csv.path, externalId: row.id ? `strava:${row.id}` : null }
        )
      );
    }
  }
  return out;
}

// Start-time index of the stored activities, so the duplicate check
// looks only at near neighbours.
function startIndex(list) {
  return list
    .map((x) => ({ x, t: new Date(x.startedAt || x.date || 0).getTime() }))
    .filter((e) => Number.isFinite(e.t))
    .sort((a, b) => a.t - b.t);
}
function neighbours(index, t, span = 3 * 60 * 1000) {
  let lo = 0;
  let hi = index.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (index[mid].t < t - span) lo = mid + 1;
    else hi = mid;
  }
  const out = [];
  for (let i = lo; i < index.length && index[i].t <= t + span; i++) out.push(index[i].x);
  return out;
}
function insertIndex(index, x) {
  const t = new Date(x.startedAt).getTime();
  let i = index.length;
  while (i > 0 && index[i - 1].t > t) i--;
  index.splice(i, 0, { x, t });
}

export async function importFiles(fileList, options = {}) {
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : () => {};
  const files = Array.from(fileList || []);
  const summary = { files: files.length, parsed: 0, added: 0, duplicates: 0, skipped: [], bySport: {} };
  const report = (phase, done, total) => {
    try {
      onProgress({ phase, done, total });
    } catch (e) {
      /* a progress error must not stop the import */
    }
  };

  // 1. Read the files.
  const inputs = [];
  for (let i = 0; i < files.length; i++) {
    report("read", i, files.length);
    try {
      inputs.push(await readInput(files[i]));
    } catch (e) {
      summary.skipped.push({ file: files[i] && files[i].name, reason: "The app cannot open this file." });
    }
    await yieldNow();
  }
  report("read", files.length, files.length);

  const { sources, csvs, skipped } = await expandInputs(inputs);
  summary.skipped.push(...skipped);

  // 2. Parse the activity files in batches.
  const parsedByPath = new Map();
  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    try {
      const list = await parseSource(src, options);
      parsedByPath.set(src.path, { src, list });
    } catch (e) {
      summary.skipped.push({ file: src.path, reason: (e && e.message) || "The app cannot read this file." });
    }
    if ((i + 1) % PARSE_BATCH === 0) {
      report("parse", i + 1, sources.length);
      await yieldNow();
    }
  }
  report("parse", sources.length, sources.length);

  // 3. Strava CSV rows.
  const candidates = [];
  const usedPaths = new Set();
  for (const csv of csvs) {
    if (!isStravaCsv(csv.text)) {
      if (csv.standalone) summary.skipped.push({ file: csv.path, reason: "This CSV file is not a Strava activities.csv file." });
      continue;
    }
    const { rows, errors } = parseStravaCsv(csv.text);
    for (const err of errors) summary.skipped.push({ file: `${baseName(csv.path)} line ${err.line}`, reason: err.reason });
    candidates.push(...mergeStrava({ ...csv, rows }, parsedByPath, usedPaths));
  }
  // 4. Files with no CSV row.
  for (const [path, { src, list }] of parsedByPath) {
    if (usedPaths.has(path)) continue;
    for (const p of list) candidates.push(toStoreActivity(p, { origin: src.origin, sourceFile: path }));
  }
  summary.parsed = candidates.length;

  // 5. Duplicates and saving, in batches.
  const known = await listActivities();
  const index = startIndex(known.filter((k) => k.source !== "lift"));
  const liftDates = new Set(known.filter((k) => k.source === "lift").map((k) => k.date));
  const logBefore = (await getImportLog()).length;
  const runTag = `import-${Date.now()}`;
  let fresh = [];

  async function flush() {
    if (!fresh.length) return;
    const res = await addActivities(fresh, { source: runTag });
    summary.added += res.added;
    summary.duplicates += res.duplicates;
    for (const f of fresh) summary.bySport[f.type] = (summary.bySport[f.type] || 0) + 1;
    // addActivities checks again. When it finds a duplicate that this
    // loop did not see, the sport counts are a little high. That is
    // rare (only with an activity typed during the import).
    fresh = [];
    await yieldNow();
  }

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const t = new Date(c.startedAt).getTime();
    // A strength session from another app: Lift mode logs it already when
    // there is a lift session on the same day.
    if (c.strength && liftDates.has(c.date)) {
      summary.duplicates++;
      continue;
    }
    if (isDuplicate(c, neighbours(index, t))) {
      summary.duplicates++;
      continue;
    }
    insertIndex(index, c);
    fresh.push(c);
    if (fresh.length >= SAVE_BATCH) {
      report("save", i + 1, candidates.length);
      await flush();
    }
  }
  await flush();
  report("save", candidates.length, candidates.length);

  // 6. One import-log line for this import (addActivities wrote one for
  // each batch).
  const log = await getImportLog();
  const kept = log.filter((e, i) => i < logBefore || e.source !== runTag);
  const origins = new Set(candidates.map((c) => c.origin));
  kept.push({
    at: new Date().toISOString(),
    source: origins.size === 1 ? [...origins][0] : origins.size ? "mixed" : "file",
    files: summary.files,
    parsed: summary.parsed,
    added: summary.added,
    duplicates: summary.duplicates,
    skipped: summary.skipped.length,
    bySport: summary.bySport,
  });
  await setKey(KEYS.importLog, kept.slice(-200));

  report("done", 1, 1);
  return summary;
}

// Groups skipped files by reason: [{ reason, count, files: [first 5] }].
export function groupSkipped(skipped) {
  const map = new Map();
  for (const s of skipped || []) {
    const g = map.get(s.reason) || { reason: s.reason, count: 0, files: [] };
    g.count++;
    if (g.files.length < 5) g.files.push(baseName(s.file));
    map.set(s.reason, g);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

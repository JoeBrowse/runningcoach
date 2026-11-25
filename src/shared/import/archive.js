import { gunzipSync, unzipSync, strFromU8 } from "fflate";
import { baseName } from "./common.js";

/* ---------------------------------------------------------------
   ARCHIVES (ZIP and GZ)

   expandInputs() turns the files that the user selected into a flat
   list of "sources", one for each activity file:
     { path, kind: "gpx" | "tcx" | "fit", origin, load() -> Uint8Array }
   and a list of Strava activities.csv texts.

   - A .gz file is unpacked. "run.gpx.gz" becomes a GPX source.
   - A .zip file is opened. Files inside it load only when the reader
     asks for them, so a large export does not fill the memory at once.
   - A zip inside a zip (the Garmin account export) is opened too.
   - A zip with activities.csv is a Strava bulk export (origin "strava").
     A path with "DI_CONNECT" or "DI-Connect" is a Garmin export
     (origin "garmin"). All other files have origin "file".
   - Other files inside an archive (JSON, images, profile CSV) are not
     activities. The reader ignores them and does not report them.
--------------------------------------------------------------- */

export const ACTIVITY_EXT = /\.(gpx|tcx|fit)(\.gz)?$/i;

export function isZip(b) {
  return !!b && b.length > 3 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 3 || b[2] === 5) && (b[3] === 4 || b[3] === 6);
}
export function isGzip(b) {
  return !!b && b.length > 2 && b[0] === 0x1f && b[1] === 0x8b;
}

export function kindOf(path) {
  const m = String(path || "").toLowerCase().match(/\.(gpx|tcx|fit)(\.gz)?$/);
  return m ? m[1] : null;
}

// Bytes of a source, with the gzip layer removed when there is one.
export function unwrap(bytes) {
  return isGzip(bytes) ? gunzipSync(bytes) : bytes;
}

// The file names in a zip, with no decompression.
export function listZip(bytes) {
  const names = [];
  unzipSync(bytes, {
    filter(f) {
      if (!f.name.endsWith("/")) names.push({ name: f.name, size: f.originalSize });
      return false;
    },
  });
  return names;
}

export function readZipEntry(bytes, name) {
  const out = unzipSync(bytes, { filter: (f) => f.name === name });
  return out[name] || null;
}

function originFor(path, hasStravaCsv) {
  if (/DI[_-]CONNECT/i.test(path)) return "garmin";
  if (hasStravaCsv) return "strava";
  return "file";
}

function decodeText(bytes) {
  return strFromU8(unwrap(bytes));
}

/* inputs: [{ name, bytes }] (bytes as Uint8Array).
   Returns { sources, csvs: [{ path, text }], skipped: [{ file, reason }] }. */
export async function expandInputs(inputs, options = {}) {
  const sources = [];
  const csvs = [];
  const skipped = [];
  const yieldNow = options.yieldNow || (() => new Promise((r) => setTimeout(r)));

  async function openZip(bytes, zipPath, depth) {
    let names;
    try {
      names = listZip(bytes);
    } catch (e) {
      skipped.push({ file: zipPath, reason: "The app cannot open this ZIP file." });
      return;
    }
    const hasStravaCsv = names.some((n) => /(^|\/)activities\.csv$/i.test(n.name));
    let count = 0;
    for (const entry of names) {
      const full = `${zipPath}/${entry.name}`;
      const lower = entry.name.toLowerCase();
      if (/(^|\/)activities\.csv$/i.test(entry.name)) {
        try {
          csvs.push({ path: full, prefix: entry.name.replace(/activities\.csv$/i, ""), text: decodeText(readZipEntry(bytes, entry.name)) });
        } catch (e) {
          skipped.push({ file: full, reason: "The app cannot read this CSV file." });
        }
      } else if (ACTIVITY_EXT.test(lower)) {
        sources.push({
          path: full,
          inner: entry.name,
          kind: kindOf(lower),
          origin: originFor(full, hasStravaCsv),
          load: () => readZipEntry(bytes, entry.name),
        });
      } else if (lower.endsWith(".zip") && depth < 4) {
        const inner = readZipEntry(bytes, entry.name);
        if (inner) await openZip(inner, full, depth + 1);
      }
      if (++count % 500 === 0) await yieldNow();
    }
  }

  for (const input of inputs) {
    const name = input.name || "file";
    const lower = name.toLowerCase();
    const bytes = input.bytes;
    if (!bytes || !bytes.length) {
      skipped.push({ file: name, reason: "The file is empty." });
      continue;
    }
    if (isZip(bytes)) {
      await openZip(bytes, name, 0);
    } else if (ACTIVITY_EXT.test(lower)) {
      sources.push({ path: name, inner: name, kind: kindOf(lower), origin: "file", load: () => bytes });
    } else if (lower.endsWith(".csv") || lower.endsWith(".csv.gz")) {
      try {
        csvs.push({ path: name, prefix: "", text: decodeText(bytes), standalone: true });
      } catch (e) {
        skipped.push({ file: name, reason: "The app cannot read this CSV file." });
      }
    } else if (lower.endsWith(".gz") && isGzip(bytes)) {
      // A .gz file with an unusual name: look at what is inside.
      let inner;
      try {
        inner = gunzipSync(bytes);
      } catch (e) {
        skipped.push({ file: name, reason: "The app cannot unpack this GZ file." });
        continue;
      }
      if (isZip(inner)) await openZip(inner, name, 0);
      else skipped.push({ file: name, reason: "The app cannot read this type of file." });
    } else {
      skipped.push({ file: baseName(name), reason: "The app cannot read this type of file." });
    }
    await yieldNow();
  }
  return { sources, csvs, skipped };
}

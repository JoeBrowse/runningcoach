import { APP_VERSION } from "../data/releaseNotes.js";
import { safeGet, safeSet, safeList, safeDelete } from "./storage.js";

/* ---------------------------------------------------------------
   BACKUP

   The app keeps everything on the device and talks to no server, which
   makes a lost or wiped phone the one way to lose years of training. So
   there has to be a file the user can copy somewhere else.

   Landing it in a folder they can actually find matters as much as
   writing it: "Saved!" with no path is the complaint this replaces. Each
   target below is attempted in turn and the one that worked is reported
   back by name and full path.
--------------------------------------------------------------- */

export const BACKUP_FORMAT = 1;

export function backupFilename(now) {
  const d = now || new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `iron-log-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

// Everything under the app's storage prefix, so a key added later is
// included without anyone remembering to add it to a list here.
export async function collectBackup() {
  const keys = await safeList("");
  const data = {};
  for (const key of keys) {
    const value = await safeGet(key);
    if (value !== null && value !== undefined) data[key] = value;
  }
  return {
    format: BACKUP_FORMAT,
    app: "Iron Log",
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function isBackupFile(parsed) {
  return !!(parsed && parsed.data && typeof parsed.data === "object" && parsed.format === BACKUP_FORMAT);
}

// Replaces rather than merges: a half-restored account with today's
// history and last year's programme would be worse than either.
export async function restoreBackup(parsed) {
  if (!isBackupFile(parsed)) throw new Error("That file is not an Iron Log backup.");
  const existing = await safeList("");
  for (const key of existing) await safeDelete(key);
  const entries = Object.entries(parsed.data);
  for (const [key, value] of entries) await safeSet(key, value);
  return entries.length;
}

// Android's public folders moved behind scoped storage, and which ones a
// given phone will accept varies by version, so try the most useful first
// and fall back rather than failing outright. Whatever succeeds is named
// exactly, since the point is for the user to be able to find the file.
export const BACKUP_TARGETS = [
  { directory: "EXTERNAL_STORAGE", prefix: "Download/", label: "Downloads" },
  { directory: "DOCUMENTS", prefix: "", label: "Documents" },
  { directory: "EXTERNAL", prefix: "", label: "the app's storage folder" },
  { directory: "DATA", prefix: "", label: "the app's private folder" },
];

export function capPlugin(name) {
  try {
    const C = typeof window !== "undefined" ? window.Capacitor : null;
    return C && C.Plugins && C.Plugins[name] ? C.Plugins[name] : null;
  } catch (e) {
    return null;
  }
}

// Returns { label, path } naming where the file actually landed.
export async function writeBackupFile(filename, text) {
  const Filesystem = capPlugin("Filesystem");
  if (Filesystem) {
    let lastError = null;
    for (const target of BACKUP_TARGETS) {
      try {
        const res = await Filesystem.writeFile({
          path: target.prefix + filename,
          data: text,
          directory: target.directory,
          encoding: "utf8",
          recursive: true,
        });
        return { label: target.label, path: (res && res.uri) || target.prefix + filename };
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error("The app could not write the backup file.");
  }

  // Browser and PWA: a real download, which lands in the browser's own
  // downloads folder.
  if (typeof document === "undefined" || typeof URL === "undefined" || !URL.createObjectURL) {
    throw new Error("This version of the app cannot save files.");
  }
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { label: "Downloads", path: filename };
}

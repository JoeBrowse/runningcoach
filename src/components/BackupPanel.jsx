import { useState, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { backupFilename, collectBackup, isBackupFile, restoreBackup, writeBackupFile } from "../lib/backup.js";
import { COLORS } from "../theme.js";

// Save-and-restore, in Settings because it is a chore rather than a
// feature. Reports the folder and full path it wrote to: the previous
// version of this said "Saved!" and left the user hunting.
export function BackupPanel() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { ok, title, detail }
  const [confirmFile, setConfirmFile] = useState(null); // parsed backup awaiting confirmation
  const fileRef = useRef(null);

  async function handleExport() {
    setBusy(true);
    setResult(null);
    try {
      const backup = await collectBackup();
      const text = JSON.stringify(backup, null, 2);
      const name = backupFilename();
      const where = await writeBackupFile(name, text);
      const kb = Math.max(1, Math.round(text.length / 1024));
      setResult({
        ok: true,
        title: `Saved to ${where.label}`,
        detail: `${where.path}\n${Object.keys(backup.data).length} items · ${kb} kB`,
      });
    } catch (e) {
      setResult({ ok: false, title: "Could not save the backup", detail: String((e && e.message) || e) });
    }
    setBusy(false);
  }

  function pickFile() {
    setResult(null);
    if (fileRef.current) fileRef.current.click();
  }

  async function handleFile(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = ""; // let the same file be picked again after a cancel
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!isBackupFile(parsed)) throw new Error("That file is not an Iron Log backup.");
      setConfirmFile(parsed);
    } catch (e) {
      setResult({ ok: false, title: "Could not read that file", detail: String((e && e.message) || e) });
    }
  }

  async function confirmRestore() {
    const parsed = confirmFile;
    setConfirmFile(null);
    setBusy(true);
    try {
      const count = await restoreBackup(parsed);
      setResult({ ok: true, title: "Restored", detail: `${count} items restored. Reopening…` });
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      setResult({ ok: false, title: "Could not restore", detail: String((e && e.message) || e) });
      setBusy(false);
    }
  }

  const btn = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    padding: "12px 0",
    fontFamily: "'Oswald', sans-serif",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  };

  return (
    <div data-tour="backup" style={{ margin: "10px 20px 20px", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16 }}>
      <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 15, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
        Backup
      </div>
      <div style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 12, lineHeight: 1.45 }}>
        Your training is stored on this phone and nowhere else. Save a copy somewhere safe so a lost or wiped phone doesn't take it with it.
      </div>

      <button onClick={handleExport} disabled={busy} style={{ ...btn, background: COLORS.accent, border: "none", color: COLORS.onAccent, marginBottom: 8 }}>
        {busy ? "Working…" : "Save Backup File"}
      </button>
      <button onClick={pickFile} disabled={busy} style={{ ...btn, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
        <RotateCcw size={13} /> Restore From File
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleFile} style={{ display: "none" }} />

      {result && (
        <div style={{ marginTop: 12, background: COLORS.surfaceRaised, border: `1px solid ${result.ok ? COLORS.ok : COLORS.bad}`, borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ color: result.ok ? COLORS.ok : COLORS.bad, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
            {result.title}
          </div>
          <div style={{ color: COLORS.textDim, fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {result.detail}
          </div>
        </div>
      )}

      {confirmFile && (
        <div style={{ marginTop: 12, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.bad}`, borderRadius: 10, padding: "12px 13px" }}>
          <div style={{ color: COLORS.text, fontSize: 12.5, lineHeight: 1.5, marginBottom: 10 }}>
            Restoring replaces everything currently in the app with the contents of this backup
            {confirmFile.exportedAt ? ` from ${String(confirmFile.exportedAt).slice(0, 10)}` : ""}. This cannot be undone.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setConfirmFile(null)} style={{ ...btn, flex: 1, background: "transparent", border: `1px solid ${COLORS.line}`, color: COLORS.textDim, padding: "10px 0" }}>
              Cancel
            </button>
            <button onClick={confirmRestore} style={{ ...btn, flex: 1, background: COLORS.bad, border: "none", color: COLORS.onAccent, padding: "10px 0" }}>
              Replace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, Smartphone, X } from "lucide-react";
import { COLORS } from "../../theme.js";
import { safeGet, safeSet } from "../../lib/storage.js";
import { Btn, st, oswald } from "../../plan/ui.jsx";
import {
  APK_URL,
  INSTALL_HINT_DISMISSED_KEY,
  SOURCE_URL,
  WEB_LIMITS,
  canPromptInstall,
  installSteps,
  isStandalone,
  isWebApp,
  onInstallPromptChange,
  promptInstall,
  webPlatform,
} from "../../lib/webApp.js";

/* ---------------------------------------------------------------
   WEB INSTALL HINT AND WEB VERSION PANEL

   <InstallHint />      A small card on the home screens (in ModeHeader).
                        Browser only, not installed, not dismissed.
   <WebVersionPanel />  Settings: how to install, all the limits of the
                        web version, the Android app and the source code.
--------------------------------------------------------------- */

// Set by the hint button, used once by WebVersionPanel when Settings opens.
let scrollToPanel = false;

function useInstallPrompt() {
  const [can, setCan] = useState(canPromptInstall());
  useEffect(() => onInstallPromptChange(() => setCan(canPromptInstall())), []);
  return can;
}

function Steps({ platform }) {
  return (
    <ol data-testid="install-steps" style={{ ...st.body(), margin: "6px 0 0", paddingLeft: 20 }}>
      {installSteps(platform).map((s) => (
        <li key={s} style={{ marginBottom: 2 }}>
          {s}
        </li>
      ))}
    </ol>
  );
}

export function InstallHint({ onOpenSettings }) {
  const web = isWebApp();
  const [dismissed, setDismissed] = useState(true);
  const [showSteps, setShowSteps] = useState(false);
  const can = useInstallPrompt();
  const platform = webPlatform();

  useEffect(() => {
    if (!web || isStandalone()) return;
    let live = true;
    safeGet(INSTALL_HINT_DISMISSED_KEY).then((v) => live && setDismissed(!!v));
    return () => {
      live = false;
    };
  }, [web]);

  if (!web || isStandalone() || dismissed) return null;

  const close = () => {
    setDismissed(true);
    safeSet(INSTALL_HINT_DISMISSED_KEY, true);
  };
  const install = async () => {
    const r = await promptInstall();
    if (r === "accepted") close();
    else if (r === "unavailable") setShowSteps(true);
  };

  return (
    <div data-testid="install-hint" style={{ ...st.card(true), marginTop: 12, marginBottom: 0, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Smartphone size={18} color={COLORS.accent} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...st.title(14) }}>Install Skid Marks</div>
          <div style={{ ...st.body(), marginTop: 2 }}>
            Add the app to your home screen. It then opens full screen and works with no signal. Your data is also safer.
          </div>
        </div>
        <button data-testid="install-hint-close" aria-label="Close" onClick={close} style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textDim, flexShrink: 0, marginTop: -6, marginRight: -6 }}>
          <X size={17} />
        </button>
      </div>
      {showSteps || !can ? <Steps platform={platform} /> : null}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        {can && (
          <Btn small testId="install-now" onClick={install}>
            <Download size={14} /> Install
          </Btn>
        )}
        <Btn small kind="secondary" testId="install-limits" onClick={() => { scrollToPanel = true; if (onOpenSettings) onOpenSettings(); }}>
          Limits of the web version
        </Btn>
      </div>
    </div>
  );
}

export function WebLimitsList({ testId = "web-limits" }) {
  return (
    <div data-testid={testId}>
      {WEB_LIMITS.map((l) => (
        <div key={l.id} data-testid={`web-limit-${l.id}`} style={{ padding: "8px 0", borderTop: `1px solid ${COLORS.line}` }}>
          <div style={{ color: COLORS.text, fontFamily: oswald, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.4 }}>{l.title}</div>
          <div style={{ ...st.body(), marginTop: 2 }}>{l.body}</div>
        </div>
      ))}
    </div>
  );
}

const linkStyle = { color: COLORS.accent, display: "inline-flex", alignItems: "center", gap: 4 };

/** Settings: the web version (browser only) and the source code link (everywhere). */
export function WebVersionPanel() {
  const web = isWebApp();
  const can = useInstallPrompt();
  const installed = isStandalone();
  const platform = webPlatform();
  const ref = useRef(null);

  useEffect(() => {
    if (!scrollToPanel) return;
    scrollToPanel = false;
    if (ref.current && ref.current.scrollIntoView) ref.current.scrollIntoView({ block: "start" });
  }, []);

  return (
    <div ref={ref} data-testid="web-version-panel" style={{ padding: "0 20px 16px" }}>
      <div style={{ ...st.label(), marginBottom: 8 }}>{web ? "Web version" : "Open source"}</div>
      <div style={{ ...st.card(false), marginBottom: 0 }}>
        {web && (
          <>
            <div style={{ ...st.title(14) }}>{installed ? "Installed on this device" : "Install on this device"}</div>
            {!installed && (
              <>
                <Steps platform={platform} />
                {can && (
                  <Btn small testId="settings-install-now" onClick={promptInstall} style={{ marginTop: 10 }}>
                    <Download size={14} /> Install
                  </Btn>
                )}
              </>
            )}
            <div style={{ ...st.title(14), marginTop: 16, marginBottom: 6 }}>Limits of the web version</div>
            <WebLimitsList />
            <div style={{ ...st.body(), marginTop: 10 }}>
              The Android app has reminders, the watch link and safer storage. It also needs the screen on during a run.{" "}
              <a data-testid="apk-link" href={APK_URL} target="_blank" rel="noreferrer" style={linkStyle}>
                Download the Android app <ExternalLink size={12} />
              </a>
            </div>
          </>
        )}
        <div style={{ ...st.body(), marginTop: web ? 12 : 0 }}>
          Skid Marks is free and open source (GPL-3.0). Read the code, report a problem or make a copy:{" "}
          <a data-testid="source-link" href={SOURCE_URL} target="_blank" rel="noreferrer" style={linkStyle}>
            github.com/JoeBrowse/runningcoach <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}

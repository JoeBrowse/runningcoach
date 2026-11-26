import { capPlugin } from "./backup.js";
import { formatSet } from "./exercises.js";

/* ---------------------------------------------------------------
   SHARING A WORKOUT TO STRAVA

   WHY THIS IS A SHARE AND NOT AN UPLOAD

   Strava's API can create an activity, but authorising against it needs a
   client secret at token exchange and they do not support PKCE for public
   clients. Skid Marks has no server: the secret would have to ship inside the
   APK, where anyone can pull it out and use this app's Strava identity as
   their own. So there is no honest way to post directly from here without
   standing up a small service to hold that secret, which is not something to
   add quietly on the way to a share button.

   What this does instead is the thing the request actually described: build
   the workout into text, hand it to the phone's share sheet, and open Strava.
   You paste it into an activity's description.

   Strava's strength rebuild of May 2026 gave it somewhere structured to put
   sets and reps, and a way to read them out of an uploaded file. That was
   tried and dropped — see the note below this section. What survives is this:
   the text, the share sheet, and the Strava app opening with the post ready
   to take it.
--------------------------------------------------------------- */

export const STRAVA_NEW_ACTIVITY_URL = "https://www.strava.com/activities/new";

// Total weight moved. Bodyweight work contributes nothing here rather than
// guessing at a body mass the session never recorded — a silent zero is
// better than a number that looks measured and is not.
export function sessionVolume(session) {
  let total = 0;
  (session.exercises || []).forEach((ex) => {
    (ex.sets || []).forEach((st) => {
      const w = parseFloat(st.weight);
      const r = parseFloat(st.reps);
      if (Number.isFinite(w) && Number.isFinite(r)) total += w * r;
    });
  });
  return Math.round(total);
}

export function sessionSetCount(session) {
  return (session.exercises || []).reduce((n, ex) => n + (ex.sets || []).length, 0);
}

// The text that goes in the share sheet. Written to be pasted into a Strava
// description and read there, so it is plain lines rather than anything that
// depends on markdown surviving the trip.
export function stravaSummary(session, unit) {
  const u = unit || "kg";
  const exercises = session.exercises || [];
  const volume = sessionVolume(session);
  const head = [
    session.split ? `${session.split} · ` : "",
    `${exercises.length} exercise${exercises.length === 1 ? "" : "s"}`,
    ` · ${sessionSetCount(session)} sets`,
    volume > 0 ? ` · ${volume.toLocaleString()}${u} total` : "",
  ].join("");

  const lines = exercises.map((ex) => {
    const sets = (ex.sets || [])
      // A blank weight is bodyweight work, which is what the card showed
      // while it was being logged.
      .map((st) => formatSet(st.weight, st.reps, u))
      .join(", ");
    const how = [ex.method, ex.brand, ex.grip].filter(Boolean).join(" · ");
    return `${ex.name}${how ? ` (${how})` : ""} — ${sets}`;
  });

  return [head, "", ...lines, "", "Recorded with Skid Marks"].join("\n");
}

// Native share sheet where there is one, then the browser's, then the
// clipboard. The clipboard is not a failure case — on a desktop browser it
// is the only thing that exists, and pasting is what happens next regardless.
export async function shareText(title, text) {
  const Share = capPlugin("Share");
  if (Share) {
    try {
      await Share.share({ title, text, dialogTitle: title });
      return "shared";
    } catch (e) {
      // A cancelled share sheet throws the same way a broken one does, so
      // fall through rather than reporting an error for a deliberate act.
    }
  }
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (e) {
      /* cancelled or unsupported — fall through */
    }
  }
  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch (e) {
      /* fall through */
    }
  }
  return "failed";
}

export function openStrava() {
  if (typeof window === "undefined") return;
  // An https link rather than the strava:// scheme: Android hands it to the
  // app when it is installed and to the browser when it is not, where the
  // custom scheme would simply fail on a phone without Strava.
  window.open(STRAVA_NEW_ACTIVITY_URL, "_blank", "noopener");
}

/* WHY THERE IS NO FILE EXPORT HERE

   There was, briefly, in 1.28.0. Strava's strength rebuild of May 2026 added
   set-message support to FIT uploads, so the app wrote a real FIT activity
   file: twelve hundred lines of encoder, every set mapped to FIT's own
   exercise taxonomy, and Garmin's SDK decoding the output back to the sets it
   was built from. It worked as a file.

   It did not work as a feature. Uploading one meant Strava's web uploader in
   a browser rather than the Strava app, and what arrived at the other end did
   not read as a proper strength log. Against that, handing the text to the
   share sheet opens the Strava app with the post already filled, which is the
   flow people actually want. A worse route to a worse result is not worth the
   code, so it came out again in 1.29.0.

   If it is ever worth revisiting, the two things to establish first are what
   an uploaded file actually produces on Strava's side, and whether the Strava
   Android app will accept a .fit from the share sheet — the browser detour
   was half of what made it unpleasant. The encoder is in the history at
   v1.28.0 and would come back whole.
--------------------------------------------------------------- */


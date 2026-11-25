import { COLORS } from "../theme.js";

// The split name plus date/exercise-count/muscles line that identifies a
// logged session, used by both the history list and Copy Previous.
export function SessionSummary({ session, muscles }) {
  return (
    <div>
      <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 16, textTransform: "uppercase" }}>
        {session.split}
      </div>
      <div style={{ color: COLORS.textDim, fontSize: 12, marginTop: 2 }}>
        {session.date} · {session.exercises.length} exercise{session.exercises.length === 1 ? "" : "s"} · {muscles.join(", ")}
      </div>
    </div>
  );
}

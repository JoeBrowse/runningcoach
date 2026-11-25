import { useState, useEffect } from "react";
import { quoteOfTheDay } from "../data/quotes.js";
import { COLORS } from "../theme.js";

/* The home screen's headline: today's quote, set in the same display face
   the old one used. Long quotes step down in size rather than wrapping into
   six lines on a phone, and the attribution sits under the quote instead of
   trailing it, which is the difference between a caption and a full stop. */
export function DailyQuote() {
  const [quote, setQuote] = useState(quoteOfTheDay);
  // A phone that sat on the side all night is still showing yesterday when it
  // wakes, so the date is re-read whenever the app comes back to the front.
  useEffect(() => {
    const refresh = () => setQuote(quoteOfTheDay());
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const [text, who, year] = quote;
  const size = text.length > 150 ? 18 : text.length > 110 ? 20 : text.length > 70 ? 24 : text.length > 40 ? 28 : 32;

  return (
    <div style={{ marginBottom: 20 }} data-testid="daily-quote">
      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: size, lineHeight: 1.2, color: COLORS.text }}>
        {`\u201C${text}\u201D`}
      </div>
      <div
        data-testid="daily-quote-by"
        style={{ marginTop: 8, color: COLORS.textDim, fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}
      >
        {`\u2014 ${who} (${year})`}
      </div>
    </div>
  );
}

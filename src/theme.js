export function hexToRgb(hex) {
  const v = hex.replace("#", "");
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
export function hexToRgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ---------------------------------------------------------------
   COLOUR SCHEMES

   The readiness map is the app's central screen and it was red, amber and
   green — which is the single worst triple for the most common form of
   colour blindness. Roughly one man in twelve cannot reliably tell this
   app's "recovering" from its "ready". That is not a rounding error on a
   feature; it is the feature.

   So the palette is switchable. Each scheme restates every colour that
   carries meaning: the three readiness states, the good/bad pair on set
   outlines, the accent, and the series colours supersets and charts draw
   from. Nothing else about the app changes.

   ON THE CHOICE OF SCHEMES

   Deuteranopia and protanopia are both red-green deficiencies and the
   research palettes treat them together, so they share one scheme here.
   Offering two that differed only cosmetically would look more thorough and
   be worth less. Tritanopia is a different axis and gets its own. Total
   colour blindness gets a luminance ramp, because for those users hue is
   not a channel at all.

   The red-green and blue-yellow palettes are derived from Okabe & Ito's
   colour-universal set, which was designed for exactly this and tested
   rather than guessed at.

   COLOUR IS NEVER THE ONLY CHANNEL

   Every non-default scheme also turns on outline shapes — a solid ring for
   recovering, a dashed one for almost ready, none for ready. A palette can
   be defeated by a bad screen, low light or a form of deficiency no preset
   anticipates. An outline cannot.
--------------------------------------------------------------- */

export const COLOUR_SCHEMES = {
  default: {
    label: "Standard",
    desc: "Red, amber and green. These are the original colours.",
    shapes: false,
    dark: {
      accent: "#FF6A1A", accentDim: "#7A3A16", onAccent: "#1A1200",
      ok: "#7FD858", bad: "#F26A6A",
      stages: { red: "#F26A6A", amber: "#E5B93E", green: "#5FB86B" },
      series: ["#4CC2FF", "#B48CFF", "#7FD858", "#FF7AB6", "#FFC15E", "#5AD6C0"],
      rir: "#7B8CFF", trend: "#4CC2FF",
    },
    light: {
      accent: "#C2410C", accentDim: "#F0C9B4", onAccent: "#FFFFFF",
      ok: "#2E7D32", bad: "#C62F2F",
      stages: { red: "#C62F2F", amber: "#8A6400", green: "#2E7D32" },
      neutral: "#BFC3C7",
      series: ["#0B72B5", "#7B3FBF", "#2E7D32", "#C2185B", "#B26A00", "#00796B"],
      rir: "#3F51B5", trend: "#0B72B5",
    },
  },
  redGreen: {
    label: "Red–green",
    desc: "For deuteranopia and protanopia, the most common types. Readiness uses a scale from blue to orange. You can read this scale when red and green look the same.",
    shapes: true,
    dark: {
      accent: "#E69F00", accentDim: "#6B4A00", onAccent: "#1A1200",
      ok: "#56B4E9", bad: "#D55E00",
      stages: { red: "#D55E00", amber: "#F0E442", green: "#56B4E9" },
      series: ["#56B4E9", "#009E73", "#F0E442", "#E69F00", "#CC79A7", "#0072B2"],
      rir: "#0072B2", trend: "#56B4E9",
    },
    // Not the dark palette darkened. Bright yellow is invisible on white, and
    // simply darkening both warm colours collapsed them into each other: the
    // first attempt separated recovering from almost-ready by 4 under
    // deuteranopia, which is no separation at all. The luminance gap the dark
    // scheme gets from a bright yellow has to be rebuilt downwards instead,
    // so recovering goes very dark and almost-ready sits well above it.
    light: {
      accent: "#A15C00", accentDim: "#E8D2AF", onAccent: "#FFFFFF",
      ok: "#00588C", bad: "#5A1E00",
      stages: { red: "#5A1E00", amber: "#CE6E00", green: "#00588C" },
      neutral: "#BFC3C7",
      series: ["#00588C", "#00695C", "#8A6D00", "#A15C00", "#8E3A6B", "#3B2C8C"],
      rir: "#004C8C", trend: "#00588C",
    },
  },
  blueYellow: {
    label: "Blue–yellow",
    desc: "For tritanopia. With this type, blue and yellow look the same. Readiness uses red, pink and green instead.",
    shapes: true,
    dark: {
      accent: "#E24A8C", accentDim: "#6B2142", onAccent: "#1A0410",
      ok: "#3FAF6B", bad: "#E24A4A",
      stages: { red: "#E24A4A", amber: "#E58FC2", green: "#3FAF6B" },
      series: ["#E24A4A", "#3FAF6B", "#E58FC2", "#8C6D3F", "#C2C2C2", "#7A3FAF"],
      rir: "#B06BD6", trend: "#9B7BFF",
    },
    light: {
      accent: "#A8246B", accentDim: "#F0C2DA", onAccent: "#FFFFFF",
      ok: "#256B2C", bad: "#C62828",
      stages: { red: "#C62828", amber: "#A83A78", green: "#256B2C" },
      neutral: "#BFC3C7",
      series: ["#C62828", "#256B2C", "#A83A78", "#6D4C1B", "#5A5A5A", "#5B2E8C"],
      rir: "#6D2E8C", trend: "#5B2E8C",
    },
  },
  mono: {
    label: "Monochrome",
    desc: "No colour. Readiness shows by brightness and by outline. Use this for total colour blindness, or for a screen with colours that are not correct.",
    shapes: true,
    dark: {
      accent: "#E8E4DC", accentDim: "#5A5852", onAccent: "#15171A",
      ok: "#F2EFE9", bad: "#5C6166",
      stages: { red: "#6E7378", amber: "#B0B5B9", green: "#F2EFE9" },
      neutral: "#33383D",
      series: ["#F2EFE9", "#B9BDC0", "#8A8F93", "#63686C", "#D6D2CB", "#A0A5A9"],
      rir: "#B9BDC0", trend: "#8A8F93",
    },
    // The ramp turns over rather than inverting: ready is the most prominent
    // in both themes, which on a dark ground means the brightest and on a
    // light one means the darkest.
    light: {
      accent: "#33383D", accentDim: "#D2D6D9", onAccent: "#FFFFFF",
      ok: "#191C1F", bad: "#7E8387",
      stages: { red: "#7E8387", amber: "#4C5054", green: "#191C1F" },
      neutral: "#CBCFD2",
      series: ["#191C1F", "#3A3E42", "#5C6166", "#7E8387", "#2A2E32", "#6A6F73"],
      rir: "#3A3E42", trend: "#7E8387",
    },
  },
};

export const COLOUR_SCHEME_ORDER = ["default", "redGreen", "blueYellow", "mono"];

// The neutral chrome. High contrast replaces these wholesale rather than
// nudging them: the point is a screen that survives direct sunlight through
// a gym window, not a slightly darker grey.
export const CHROME = {
  dark: {
    normal: { bg: "#15171A", surface: "#1D2023", surfaceRaised: "#24282C", line: "#33383D", text: "#F2EFE9", textDim: "#9A9D9F" },
    high:   { bg: "#000000", surface: "#0B0D0F", surfaceRaised: "#16191C", line: "#7E868C", text: "#FFFFFF", textDim: "#D2D6D9" },
  },
  // Light is not the dark palette inverted. Surfaces have to separate without
  // a dark ground to sit on, so the card is the lightest thing on the screen
  // and the page behind it is slightly darker — the opposite of dark mode,
  // where the card is lifted by being lighter than the page.
  light: {
    normal: { bg: "#F1EEE9", surface: "#FFFFFF", surfaceRaised: "#E7E3DC", line: "#D3CEC5", text: "#1A1C1F", textDim: "#5C6166" },
    high:   { bg: "#FFFFFF", surface: "#FFFFFF", surfaceRaised: "#EFECE6", line: "#2A2E32", text: "#000000", textDim: "#2A2E32" },
  },
};

export const THEME_MODES = [
  { value: "system", label: "System", desc: "Use the same setting as your phone." },
  { value: "dark", label: "Dark", desc: "The original theme. It is easier on the eyes in a dark gym." },
  { value: "light", label: "Light", desc: "For bright rooms and daylight." },
];

// "system" is resolved once here rather than being carried around as a third
// state, so everything downstream only ever deals with dark or light.
export function resolveTheme(mode) {
  if (mode === "dark" || mode === "light") return mode;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return "dark";
}

export const NEUTRAL_DARK = "#5A626A";

// Read at render time by every screen, so switching theme or scheme is a
// matter of rewriting these objects and re-rendering rather than threading a
// theme through 700 call sites.
export const COLORS = {
  ...CHROME.dark.normal,
  accent: "#FF6A1A",
  accentDim: "#7A3A16",
  onAccent: "#1A1200",
  ok: "#7FD858",
  bad: "#F26A6A",
  trend: "#4CC2FF",
};

// Three flat colours rather than a gradient. The question the map answers is
// "can I train this today?", and a continuous blend makes the moment a muscle
// crosses into ready impossible to see.
export const STAGE_COLORS = { red: "#F26A6A", amber: "#E5B93E", green: "#5FB86B" };

export const STAGE_SHAPES = {
  red: { width: 0.55, dash: null },
  amber: { width: 0.55, dash: "1.2 0.9" },
  green: { width: 0, dash: null },
};

// The outline has to stand out from the muscle it is drawn on, not from the
// page. Drawing it in the text colour works on a dark theme, where the fills
// are bright — on a light one the fills are dark and a near-black outline
// disappears into them, which is exactly the channel that was supposed to be
// the reliable one. So pick whichever of the two extremes contrasts more with
// the fill itself.
export function relativeLuminance(hex) {
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a, b) {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function outlineColorFor(fill) {
  return contrastRatio(COLORS.text, fill) >= contrastRatio(COLORS.bg, fill) ? COLORS.text : COLORS.bg;
}

// Distinct outline colors for supersets (kept clear of the orange accent so a
// linked group never reads as a primary action).
export const SUPERSET_COLORS = [...COLOUR_SCHEMES.default.dark.series];

export const THEME = { mode: "system", theme: "dark", scheme: "default", highContrast: false, shapes: false, rir: null };

// Rewrites the live palette in place. Everything that paints reads these
// objects during render, so the whole app recolours on the next paint.
export function applyTheme(themeMode, schemeKey, highContrast) {
  const theme = resolveTheme(themeMode);
  const scheme = COLOUR_SCHEMES[schemeKey] || COLOUR_SCHEMES.default;
  const pal = scheme[theme] || scheme.dark;
  const chrome = CHROME[theme][highContrast ? "high" : "normal"];

  Object.assign(COLORS, chrome, {
    accent: pal.accent,
    accentDim: pal.accentDim,
    onAccent: pal.onAccent,
    ok: pal.ok,
    bad: pal.bad,
    trend: pal.trend,
  });
  Object.assign(STAGE_COLORS, pal.stages);
  NEUTRAL_BOX.value = pal.neutral || NEUTRAL_DARK;
  SUPERSET_COLORS.length = 0;
  SUPERSET_COLORS.push(...pal.series);

  THEME.mode = themeMode || "system";
  THEME.theme = theme;
  THEME.scheme = COLOUR_SCHEMES[schemeKey] ? schemeKey : "default";
  THEME.highContrast = !!highContrast;
  // High contrast turns the outlines on whatever the scheme, since someone
  // who has asked for maximum legibility wants every channel it can give.
  THEME.shapes = !!scheme.shapes || !!highContrast;
  THEME.rir = pal.rir;

  // The page background and the Android status-bar colour are set in
  // index.html, outside React, so they have to be told separately — without
  // this, a light theme leaves a dark band above and below a white app.
  if (typeof document !== "undefined") {
    document.body.style.background = COLORS.bg;
    document.documentElement.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", COLORS.bg);
  }
}

export const STAGE_LABELS = { red: "recovering", amber: "almost ready", green: "ready" };
// The legend states the rule outright rather than repeating the words above:
// amber is always "less than a day to go", never a vaguer sense of nearly.
export const STAGE_LEGEND = [
  ["red", "24h+ to go"],
  ["amber", "under 24h"],
  ["green", "ready"],
];

// The parts of the figure we do not train — head, hands, feet, joints. It is
// what gives the body its silhouette. Schemes can override it: the monochrome
// ramp is itself grey, so the default silhouette would sit in the middle of
// it and an untrained shin would read as a recovering one.
export const NEUTRAL_BOX = { value: NEUTRAL_DARK };

// Same red/amber/green as the readiness map, so "worse/same/better than
// last time" reads on the same scale a colourblind mode already covers.
// A function rather than a constant: it reads STAGE_COLORS, which is
// rewritten in place when the colour scheme changes.
export function setToneStyle(tone) {
  const styles = {
    up: { borderColor: STAGE_COLORS.green, borderWidth: 3 },
    down: { borderColor: STAGE_COLORS.red, borderWidth: 2 },
    amber: { borderColor: STAGE_COLORS.amber, borderWidth: 2 },
  };
  return styles[tone];
}

// The palette key stays `rir` because it is a colour, not a scale, and
// renaming it would invalidate every stored colour scheme for nothing.
export function effortColor() {
  return THEME.rir || COLOUR_SCHEMES.default.dark.rir;
}

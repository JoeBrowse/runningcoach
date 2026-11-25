import { loadingsFor, loadingOf, defaultMethodFor, hasMethodChoice, normaliseMethod } from "./exercises.js";

export function getTopSet(setsArr) {
  if (!setsArr || setsArr.length === 0) return null;
  return setsArr.reduce((top, s) => {
    if (!top) return s;
    const w = parseFloat(s.weight) || 0;
    const topW = parseFloat(top.weight) || 0;
    if (w > topW) return s;
    if (w === topW && (parseFloat(s.reps) || 0) > (parseFloat(top.reps) || 0)) return s;
    return top;
  }, null);
}

// The single definition of a "savable" set: it has an entered weight or reps,
// or a drop that does. Used everywhere sets are filtered for saving or for
// detecting an in-progress workout, so those paths can never quietly disagree
// (the kind of drift that once dropped every set at finish time).
export function setHasData(s) {
  if (!s) return false;
  if (s.weight !== "" || s.reps !== "") return true;
  return (s.drops || []).some((d) => d.weight !== "" || d.reps !== "");
}

// Stands in for "logged before any machine was recorded" in the Progress
// filter. Not a real brand, so it can never collide with one the user typed.
export const UNTAGGED_BRAND = "Nothing recorded";

// Brands are free text, so "Exigo", "exigo" and " Exigo " are one machine.
export function normaliseBrand(brand) {
  return typeof brand === "string" ? brand.trim().toLowerCase() : "";
}

// The distinct ways an exercise has actually been done — implement, brand,
// or both — oldest first. One control rather than two: at 412px a second
// select next to the exercise name has nowhere to go, and "Barbell" and
// "Technogym" are answering the same question anyway.
export function variationsInHistory(hist, id) {
  const seen = new Map();
  for (const h of hist || []) {
    if (!h || !h.date) continue;
    const method = (h.method || (hasMethodChoice(id) ? defaultMethodFor(id) : "") || "").trim();
    const brand = (h.brand || "").trim();
    const label = [method, brand].filter(Boolean).join(" · ");
    if (label) seen.set(label.toLowerCase(), { label, method, brand });
  }
  return [...seen.values()];
}

export function matchesVariation(entry, id, variation) {
  if (!variation) return true;
  if (variation.label === UNTAGGED_BRAND) {
    const method = entry.method || (hasMethodChoice(id) ? defaultMethodFor(id) : "");
    return !method && !entry.brand;
  }
  const method = (entry.method || (hasMethodChoice(id) ? defaultMethodFor(id) : "") || "").trim();
  const brand = (entry.brand || "").trim();
  return (
    normaliseMethod(method) === normaliseMethod(variation.method) &&
    normaliseBrand(brand) === normaliseBrand(variation.brand)
  );
}

export function summariseEntry(entry) {
  const topSet = getTopSet(entry.sets) || {};
  return {
    weight: topSet.weight,
    reps: topSet.reps,
    date: entry.date,
    sets: entry.sets || [],
    order: entry.order || null,
    total: entry.total || null,
    brand: entry.brand || null,
    grip: entry.grip || null,
    method: entry.method || null,
    supersetWith: entry.supersetWith || null,
    notes: entry.notes || null,
    // Drop sets live inside the logged sets themselves, so there's nothing
    // extra to store — how many sets carried one is derivable here.
    dropSetCount: (entry.sets || []).filter((s) => s.drops && s.drops.length).length,
  };
}

// Summary of the last logged session for an exercise: the top set (for warm-up
// math and progression), the full set list (shown so the user sees every set,
// not just the best), the machine/grip used, and where the exercise sat in that
// session — stated plainly, without drawing a conclusion from it.
//
// When a brand is given, the comparison is made against the last session on
// *that* machine, because a number set on a different stack is not a target.
// If there has never been one, the caller is told so (brandMismatch) and gets
// the overall most recent alongside it rather than nothing at all.
export function buildLastEntry(hist, brand, method, exId) {
  const list = hist || [];
  if (!list.length) return null;
  const wantBrand = normaliseBrand(brand);
  const wantMethod = normaliseMethod(method);
  const overall = list[list.length - 1];
  if (!wantBrand && !wantMethod) return summariseEntry(overall);

  // Entries are stored under a per-exercise key and carry no id of their
  // own, so the id has to come from the caller — without it a session
  // logged before the method picker existed matches nothing, and every
  // previous session gets demoted to "not logged this way before".
  //
  // For a bodyweight movement the default is not the right guess either:
  // the loading of an untagged session is written in its weight column,
  // where a number could only ever have meant added weight.
  const methodOf = (h) =>
    loadingsFor(exId)
      ? loadingOf(exId, h.method, (getTopSet(h.sets) || {}).weight)
      : h.method || defaultMethodFor(exId);
  // A dumbbell press is not a target for a barbell press any more than one
  // machine's numbers are a target for another's, so both narrow the search.
  const matches = (h) =>
    (!wantBrand || normaliseBrand(h.brand) === wantBrand) &&
    (!wantMethod || normaliseMethod(methodOf(h)) === wantMethod);

  const asked = [method && method.trim(), brand && brand.trim()].filter(Boolean).join(" · ");
  for (let i = list.length - 1; i >= 0; i--) {
    if (matches(list[i])) {
      return { ...summariseEntry(list[i]), askedBrand: asked };
    }
  }
  return {
    ...summariseEntry(overall),
    askedBrand: asked,
    brandMismatch: true,
  };
}

// Compares a set against the same-numbered set from the last session so
// the inputs can show progress without the user doing the arithmetic:
// "up" for more weight or more reps, "down" for less, "same" for an exact
// repeat. Weight is judged first — adding load is progress even when reps
// come down with it, which is how double progression is meant to run.
// Returns null while there isn't enough typed in for a fair comparison,
// so a half-filled row stays neutral instead of flashing red.
export function setProgressTone(current, previous) {
  if (!current || !previous) return null;
  const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };
  const weight = num(current.weight);
  const prevWeight = num(previous.weight);
  const reps = num(current.reps);
  const prevReps = num(previous.reps);
  if (weight !== null && prevWeight !== null && weight !== prevWeight) {
    return weight > prevWeight ? "up" : "down";
  }
  // Weight held (or unloaded both times, e.g. bodyweight) — reps carry the
  // signal. One fewer rep is normal set-to-set variance and stays amber;
  // two or more is a real regression.
  if (reps !== null && prevReps !== null) {
    const diff = reps - prevReps;
    if (diff > 0) return "up";
    if (diff <= -2) return "down";
    return "amber";
  }
  return weight === prevWeight ? "amber" : null;
}

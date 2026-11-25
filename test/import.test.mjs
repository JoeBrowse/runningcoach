// Import tests. Run: node --test test/import.test.mjs
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => new Uint8Array(readFileSync(join(here, "fixtures", name)));
const fixtureText = (name) => readFileSync(join(here, "fixtures", name), "utf8");

// A small localStorage, so the store can save in Node.
const memory = new Map();
globalThis.localStorage = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
  key: (i) => [...memory.keys()][i] ?? null,
  get length() {
    return memory.size;
  },
  clear: () => memory.clear(),
};

const { DOMParser } = new JSDOM("").window;
const imp = await import("../src/shared/import/index.js");
const { parseGpx, parseTcx, parseFit, parseCsv, parseStravaCsv, parseStravaDate, importFiles, setDOMParser, groupSkipped } = imp;
const { expandInputs, listZip } = await import("../src/shared/import/archive.js");
const { mapSport } = await import("../src/shared/import/common.js");
const store = await import("../src/shared/store.js");
const { makeActivityFit } = await import("./fixtures/make-fixtures.mjs");
setDOMParser(DOMParser);

beforeEach(() => memory.clear());

test("GPX: points, distance, heart rate and the start time from the file", () => {
  const a = parseGpx(fixtureText("run.gpx"));
  assert.equal(a.type, "run");
  assert.equal(a.name, "Test Morning Run");
  assert.equal(a.startedAt, "2024-05-04T07:00:00.000Z");
  assert.equal(a.points.length, 3);
  assert.ok(Math.abs(a.km - 0.5) < 0.01, `km ${a.km}`);
  assert.equal(a.elapsedSec, 125);
  assert.equal(a.avgHR, 150);
  assert.equal(a.maxHR, 160);
});

test("GPX: a file with no time is refused", () => {
  const text = fixtureText("run.gpx").replace(/<time>[^<]*<\/time>/g, "");
  assert.throws(() => parseGpx(text), /no time/);
});

test("TCX: laps give the totals; spaces before the XML header are allowed", () => {
  const a = parseTcx(fixtureText("ride.tcx"));
  assert.equal(a.type, "cycle");
  assert.equal(a.startedAt, "2024-05-05T09:00:00.000Z");
  assert.equal(a.durationSec, 900);
  assert.equal(a.km, 6);
  assert.equal(a.laps.length, 2);
  assert.equal(a.avgHR, Math.round((130 * 600 + 142 * 300) / 900));
  assert.equal(a.maxHR, 150);
  assert.equal(a.name, "Test Bike Commute");
  assert.equal(a.splits.length, 6);
});

test("FIT: session, laps and records from a file made with FitEncoder", async () => {
  const [a] = await parseFit(fixture("run.fit"));
  assert.equal(a.type, "run");
  assert.equal(a.startedAt, "2024-03-10T08:00:00.000Z");
  assert.equal(a.durationSec, 240);
  assert.equal(a.km, 1.2);
  assert.equal(a.avgHR, 146);
  assert.equal(a.maxHR, 150);
  assert.equal(a.points.length, 5);
  assert.equal(a.splits[0].km, 1);
});

test("FIT: random bytes are refused", async () => {
  await assert.rejects(() => parseFit(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])));
});

test("Strava CSV: quotes, new lines in quotes and repeated column names", () => {
  const rows = parseCsv('a,b\n"x, y","line1\nline2"\n"say ""hi""",2\n');
  assert.deepEqual(rows, [["a", "b"], ["x, y", "line1\nline2"], ['say "hi"', "2"]]);
  const zipNames = listZip(fixture("strava-export.zip")).map((n) => n.name);
  assert.ok(zipNames.includes("export_123/activities.csv"));
});

test("Strava CSV: dates are UTC and distance uses the metres column", () => {
  assert.equal(new Date(parseStravaDate("Nov 3, 2024, 7:12:45 PM")).toISOString(), "2024-11-03T19:12:45.000Z");
  assert.equal(new Date(parseStravaDate("Jan 1, 2024, 12:05:00 AM")).toISOString(), "2024-01-01T00:05:00.000Z");
  assert.equal(new Date(parseStravaDate("3 Nov 2024, 07:12:45")).toISOString(), "2024-11-03T07:12:45.000Z");
  assert.equal(parseStravaDate("not a date"), null);
  const csv = [
    "Activity ID,Activity Date,Activity Name,Activity Type,Elapsed Time,Distance,Max Heart Rate,Filename,Elapsed Time,Moving Time,Distance,Average Heart Rate",
    '7,"Jun 1, 2024, 6:00:00 AM",Run A,Run,1900,"5,02",171,activities/7.fit.gz,1900,1800,"5020.4",150',
    '8,"Jun 2, 2024, 6:00:00 AM",Gym,Weight Training,3600,0,,,3600,3600,0,',
    "9,bad date,X,Run,10,1,,,10,10,1000,",
  ].join("\n");
  const { rows, errors } = parseStravaCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(errors.length, 1);
  assert.equal(rows[0].startedAt, "2024-06-01T06:00:00.000Z");
  assert.equal(rows[0].km, 5.02);
  assert.equal(rows[0].movingSec, 1800);
  assert.equal(rows[0].elapsedSec, 1900);
  assert.equal(rows[0].avgHR, 150);
  assert.equal(rows[0].maxHR, 171);
  assert.equal(rows[0].file, "activities/7.fit.gz");
  assert.equal(rows[0].type, "run");
  assert.equal(rows[1].strength, true);
  assert.equal(rows[1].km, null);
});

test("Sport names map to store activity ids", () => {
  assert.equal(mapSport("Run"), "run");
  assert.equal(mapSport("running"), "run");
  assert.equal(mapSport("TrailRun"), "run");
  assert.equal(mapSport("VirtualRun"), "treadmill");
  assert.equal(mapSport("Ride"), "cycle");
  assert.equal(mapSport("Biking"), "cycle");
  assert.equal(mapSport("VirtualRide"), "stationary-bike");
  assert.equal(mapSport("Walk"), "walk");
  assert.equal(mapSport("Hike"), "hike");
  assert.equal(mapSport("Swim"), "swim");
  assert.equal(mapSport("9"), "run");
  assert.equal(mapSport("Yoga"), "other");
});

test("Archives: gzip, Strava zip and nested Garmin zip", async () => {
  const { sources, csvs } = await expandInputs(
    [
      { name: "run.gpx.gz", bytes: fixture("run.gpx.gz") },
      { name: "strava-export.zip", bytes: fixture("strava-export.zip") },
      { name: "garmin-export.zip", bytes: fixture("garmin-export.zip") },
    ],
    { yieldNow: async () => {} }
  );
  assert.equal(csvs.length, 1);
  assert.deepEqual(
    sources.map((s) => [s.kind, s.origin]),
    [["gpx", "file"], ["gpx", "strava"], ["tcx", "strava"], ["fit", "garmin"]]
  );
});

test("importFiles: all fixtures, dates from the files, Strava names, duplicates skipped", async () => {
  const files = [
    { name: "run.gpx", bytes: fixture("run.gpx") },
    { name: "ride.tcx", bytes: fixture("ride.tcx") },
    { name: "run.fit", bytes: fixture("run.fit") },
    { name: "strava-export.zip", bytes: fixture("strava-export.zip") },
    { name: "garmin-export.zip", bytes: fixture("garmin-export.zip") },
    { name: "notes.txt", bytes: new Uint8Array([104, 105]) },
  ];
  const phases = new Set();
  const s1 = await importFiles(files, { onProgress: (p) => phases.add(p.phase) });
  assert.equal(s1.files, 6);
  // run.gpx, ride.tcx, run.fit, 3 Strava rows (one with no file), 1 Garmin FIT.
  assert.equal(s1.parsed, 7);
  assert.equal(s1.added, 7);
  assert.equal(s1.duplicates, 0);
  assert.equal(s1.skipped.length, 1);
  assert.equal(s1.skipped[0].reason, "The app cannot read this type of file.");
  assert.deepEqual(s1.bySport, { run: 4, cycle: 2, swim: 1 });
  assert.ok(phases.has("parse") && phases.has("save") && phases.has("done"));

  const list = await store.listActivities();
  assert.equal(list.length, 7);
  const today = new Date().toISOString().slice(0, 10);
  for (const a of list) assert.notEqual(a.startedAt.slice(0, 10), today);
  const strava = list.find((a) => a.raw.externalId === "strava:1001");
  assert.equal(strava.raw.name, "Morning Run");
  assert.equal(strava.raw.origin, "strava");
  assert.equal(strava.startedAt, "2024-06-01T06:00:00.000Z");
  assert.equal(strava.minutes, 2); // CSV moving time, 120 s
  const swim = list.find((a) => a.type === "swim");
  assert.equal(swim.km, 1.5);
  const garmin = list.find((a) => a.raw.origin === "garmin");
  assert.equal(garmin.startedAt, "2024-04-01T10:00:00.000Z");
  const gpx = list.find((a) => a.raw.sourceFile === "run.gpx");
  assert.equal(gpx.avgHR, 150);
  assert.ok(Array.isArray(gpx.raw.splits));
  assert.equal(gpx.raw.track, undefined);

  // The same files again: all duplicates.
  const s2 = await importFiles(files);
  assert.equal(s2.added, 0);
  assert.equal(s2.duplicates, 7);
  assert.equal((await store.listActivities()).length, 7);

  // One line in the import log for each import.
  const log = await store.getImportLog();
  assert.equal(log.length, 2);
  assert.equal(log[0].added, 7);
  assert.equal(log[1].duplicates, 7);
  assert.equal(groupSkipped(s2.skipped)[0].count, 1);
});

test("importFiles: a run typed by hand at the same time is a duplicate", async () => {
  await store.saveRun({ startedAt: "2024-03-10T08:01:00Z", durationSec: 250, km: 1.21 });
  const s = await importFiles([{ name: "run.fit", bytes: fixture("run.fit") }]);
  assert.equal(s.added, 0);
  assert.equal(s.duplicates, 1);
});

test("importFiles: many files in batches", async () => {
  const files = [];
  for (let i = 0; i < 250; i++) {
    const start = new Date(Date.UTC(2023, 0, 1) + i * 86400000).toISOString();
    files.push({ name: `run-${i}.fit`, bytes: makeActivityFit(start) });
  }
  const progress = [];
  const s = await importFiles(files, { onProgress: (p) => progress.push(p) });
  assert.equal(s.added, 250);
  assert.ok(progress.filter((p) => p.phase === "save").length >= 3);
  assert.equal((await store.listActivities()).length, 250);
  assert.equal((await store.getImportLog()).length, 1);
});

/* ---------- export, Intervals.icu, weather ---------- */

const exp = await import("../src/shared/export.js");
const icu = await import("../src/shared/intervals.js");
const weather = await import("../src/shared/weather.js");

test("Export: activities CSV has one row for each activity, and cells are safe", async () => {
  await store.saveRun({ startedAt: "2024-01-02T07:00:00Z", durationSec: 1800, km: 5, name: "=SUM(A1)", avgHR: 140 });
  await store.saveRun({ type: "cycle", startedAt: "2024-01-03T07:00:00Z", durationSec: 3600, km: 20 });
  const csv = await exp.activitiesCsv();
  const lines = csv.trim().split("\r\n");
  assert.equal(lines[0], exp.ACTIVITY_CSV_HEADER.join(","));
  assert.equal(lines.length, 3);
  assert.match(lines[1], /,run,'=SUM\(A1\),30,5,140,/);
  assert.match(lines[2], /,cycle,/);
  assert.equal(exp.csvCell('a "b", c'), '"a ""b"", c"');
});

test("Export: sets CSV with RIR, RPE and drop sets", () => {
  const csv = exp.setsToCsv(
    [{ date: "2024-01-05", dayName: "Upper", exercises: [{ id: "bench", name: "Bench Press", sets: [{ weight: "80", reps: "5", rir: 2, drops: [{ weight: "60", reps: "8" }] }, { weight: "80", reps: "4" }] }] }],
    "kg"
  );
  const lines = csv.trim().split("\r\n");
  assert.equal(lines.length, 4);
  assert.equal(lines[1], "2024-01-05,Upper,Bench Press,1,80,kg,5,2,8,");
  assert.equal(lines[2], "2024-01-05,Upper,Bench Press,1,60,kg,8,,,1");
  assert.equal(lines[3], "2024-01-05,Upper,Bench Press,2,80,kg,4,,,");
});

test("Export: GPX of a run with a track can be read back", () => {
  const run = { name: "Track & field", startedAt: "2024-02-01T06:00:00Z", track: [{ t: 1706767200000, lat: 51.5, lon: -0.12, ele: 10 }, { t: "2024-02-01T06:01:00Z", lat: 51.501, lon: -0.12 }, { t: 1706767320000, lat: 51.502, lon: -0.12, ele: 12 }] };
  const gpx = exp.runToGpx(run);
  const back = parseGpx(gpx);
  assert.equal(back.points.length, 3);
  assert.equal(back.startedAt, "2024-02-01T06:00:00.000Z");
  assert.equal(back.name, "Track & field");
  assert.throws(() => exp.runToGpx({ track: [] }), /no GPS track/);
});

test("Export: workoutToFit writes file_id, workout and workout_step messages", async () => {
  const FitParser = (await import("fit-file-parser")).default;
  const bytes = exp.workoutToFit({
    name: "6 x 400 m",
    steps: [
      { type: "warmup", sec: 600 },
      { repeat: 6, steps: [{ type: "interval", m: 400, pace: { fast: 230, slow: 240 } }, { type: "recover", sec: 90, hr: { low: 120, high: 140 } }] },
      { type: "cooldown", sec: 600 },
    ],
  });
  const d = await new FitParser({ force: false }).parseAsync(bytes.buffer);
  assert.equal(d.messages.file_id[0].type, "workout");
  assert.equal(d.messages.workout[0].wkt_name, "6 x 400 m");
  assert.equal(d.messages.workout[0].num_valid_steps, 5);
  const steps = d.messages.workout_step;
  assert.deepEqual(steps.map((s) => s.duration_type), ["time", "distance", "time", "repeat_until_steps_cmplt", "time"]);
  assert.equal(steps[1].duration_value, 40000);
  assert.equal(steps[1].custom_target_value_low, 4167);
  assert.equal(steps[1].custom_target_value_high, 4348);
  assert.equal(steps[2].custom_target_value_low, 220);
  assert.equal(steps[3].duration_value, 1);
  assert.equal(steps[3].target_value, 6);
  assert.equal(steps[4].intensity, "cooldown");
});

function fakeFetch(routes, calls = []) {
  return async (url, init) => {
    calls.push({ url, init });
    for (const [part, body] of routes) {
      if (url.includes(part)) {
        if (typeof body === "number") return { ok: false, status: body, json: async () => ({}) };
        return { ok: true, status: 200, json: async () => body };
      }
    }
    return { ok: false, status: 500, json: async () => ({}) };
  };
}

test("Intervals.icu: sync maps activities, skips Strava ones, saves wellness", async () => {
  await assert.rejects(() => icu.syncIntervals({ fetch: fakeFetch([]) }), (e) => e.code === "noKey");
  await icu.saveIntervalsSettings({ apiKey: " secret123 ", athleteId: "" });
  const calls = [];
  const f = fakeFetch(
    [
      ["/activities?", [
        { id: "i1", start_date: "2024-07-01T06:00:00Z", type: "Run", name: "Tempo", distance: 10000, moving_time: 2700, elapsed_time: 2800, average_heartrate: 155, max_heartrate: 172, source: "GARMIN_CONNECT" },
        { id: "i2", type: "Ride", source: "STRAVA", _note: "STRAVA activities are not available via the API" },
        { id: "i3", start_date: "2024-07-02T06:00:00Z", type: "Ride", distance: 30000, moving_time: 3600, source: "UPLOAD" },
      ]],
      ["/wellness?", [{ id: "2024-07-01", restingHR: 48, hrv: 70, sleepSecs: 27000 }, { id: "2024-07-02" }]],
    ],
    calls
  );
  const r = await icu.syncIntervals({ fetch: f, now: "2024-07-03T12:00:00Z" });
  assert.equal(r.added, 2);
  assert.equal(r.skipped.length, 1);
  assert.match(r.skipped[0].reason, /Strava/);
  assert.equal(r.wellnessDays, 1);
  assert.match(calls[0].url, /athlete\/0\/activities\?oldest=2023-07-0\d&newest=2024-07-03/);
  assert.equal(calls[0].init.headers.Authorization, `Basic ${Buffer.from("API_KEY:secret123").toString("base64")}`);
  const list = await store.listActivities();
  assert.deepEqual(list.map((a) => [a.type, a.raw.origin]), [["run", "intervals"], ["cycle", "intervals"]]);
  assert.equal((await icu.getWellness())[0].restingHR, 48);
  const cfg = await icu.getIntervalsSettings();
  assert.equal(cfg.lastSync, "2024-07-03T12:00:00.000Z");
  assert.equal(icu.maskKey(cfg.apiKey), "••••t123");
  // Second sync starts 3 days before the last sync; the same data are duplicates.
  const calls2 = [];
  const r2 = await icu.syncIntervals({ fetch: fakeFetch([["/activities?", [{ id: "i1", start_date: "2024-07-01T06:00:00Z", type: "Run", distance: 10000, moving_time: 2700 }]], ["/wellness?", []]], calls2), now: "2024-07-04T12:00:00Z" });
  assert.equal(r2.duplicates, 1);
  assert.match(calls2[0].url, /oldest=2024-06-30/);
  await assert.rejects(() => icu.syncIntervals({ fetch: fakeFetch([["/activities?", 401]]) }), (e) => e.code === "badKey" && /API key/.test(e.message));
});

test("Weather: off by default, manual place, 1-hour cache", async () => {
  assert.equal(await weather.getWeather({ fetch: fakeFetch([]) }), null);
  await weather.saveWeatherSettings({ enabled: true, mode: "manual", lat: "", lon: "" });
  await assert.rejects(() => weather.getWeather({ fetch: fakeFetch([]) }), (e) => e.code === "noPlace");
  await weather.saveWeatherSettings({ lat: 51.5074, lon: -0.1278, place: "London" });
  const calls = [];
  const body = { current: { temperature_2m: 18.5, relative_humidity_2m: 60, wind_speed_10m: 12 }, hourly: { time: ["2024-07-01T00:00"], temperature_2m: [15], relative_humidity_2m: [80] } };
  const w = await weather.getWeather({ fetch: fakeFetch([["api.open-meteo.com", body]], calls) });
  assert.equal(w.current.tempC, 18.5);
  assert.equal(w.hourly[0].humidity, 80);
  assert.match(calls[0].url, /latitude=51.51&longitude=-0.13&current=temperature_2m/);
  await weather.getWeather({ fetch: fakeFetch([["api.open-meteo.com", body]], calls) });
  assert.equal(calls.length, 1, "second call uses the cache");
  await weather.getWeather({ force: true, fetch: fakeFetch([["api.open-meteo.com", body]], calls) });
  assert.equal(calls.length, 2);
});

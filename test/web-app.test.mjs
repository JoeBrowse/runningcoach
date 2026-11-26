import { test } from "node:test";
import assert from "node:assert/strict";
import { WEB_LIMITS, WEB_LIMITS_SHORT, installSteps, isStandalone, isWebApp, webPlatform } from "../src/lib/webApp.js";

test("webPlatform reads the user agent", () => {
  assert.equal(webPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1"), "ios");
  assert.equal(webPlatform("Mozilla/5.0 (Linux; Android 15; CPH2581) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36"), "android");
  assert.equal(webPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0"), "other");
});

test("node is not the Android app and not installed", () => {
  assert.equal(isWebApp(), true);
  assert.equal(isStandalone(), false);
});

test("install steps exist for each platform", () => {
  for (const p of ["ios", "android", "other"]) {
    const steps = installSteps(p);
    assert.ok(steps.length >= 2, p);
    for (const s of steps) assert.ok(s.endsWith("."), `${p}: ${s}`);
  }
  assert.ok(installSteps("ios").some((s) => /Add to Home Screen/.test(s)));
});

test("the web limits are complete and short", () => {
  const ids = WEB_LIMITS.map((l) => l.id);
  for (const id of ["gps", "voice", "reminders", "watch", "storage", "devices"]) assert.ok(ids.includes(id), id);
  assert.equal(new Set(ids).size, ids.length);
  for (const l of WEB_LIMITS) {
    assert.ok(l.title && l.body, l.id);
    // ASD-STE100: about 20 words or fewer in each sentence.
    for (const sentence of l.body.split(/(?<=\.)\s+/)) assert.ok(sentence.split(/\s+/).length <= 26, `${l.id}: ${sentence}`);
  }
  assert.match(WEB_LIMITS_SHORT, /screen locks/);
});

test("docs/index.html lists every web limit", async () => {
  const { readFile } = await import("node:fs/promises");
  const html = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");
  for (const l of WEB_LIMITS) assert.ok(html.includes(l.title), `docs/index.html is missing "${l.title}"`);
});

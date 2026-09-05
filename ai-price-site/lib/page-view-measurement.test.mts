import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { classifyPageViewPopulation, PAGE_VIEW_MEASUREMENT_VERSION } from "./page-view-measurement.ts";

const now = new Date("2026-09-05T12:00:00Z");
function browser({ marker = null, webdriver = false, blocked = false }: { marker?: string | null; webdriver?: boolean; blocked?: boolean } = {}) {
  const writes: [string, string][] = [];
  const loadedModule = { exports: {} as { getBrowserPageViewPopulation: (date: Date) => string; markInternalMeasurementBrowser: (date: Date) => void } };
  const code = ts.transpileModule(readFileSync(new URL("./page-view-measurement.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, Date,
    window: { navigator: { webdriver }, localStorage: {
      getItem: () => { if (blocked) throw new Error("denied"); return marker; },
      setItem: (key: string, value: string) => { if (blocked) throw new Error("denied"); writes.push([key, value]); },
    } },
  });
  return { ...loadedModule.exports, writes };
}

test("normal browsers are eligible without creating visitor storage", () => {
  const b = browser(); assert.equal(b.getBrowserPageViewPopulation(now), "eligible"); assert.deepEqual(b.writes, []);
});
test("authenticated admin marker is only a common expiry date", () => {
  const b = browser(); b.markInternalMeasurementBrowser(now);
  assert.deepEqual(b.writes, [["geosub_measurement_internal_until", "2026-10-05"]]);
  assert.equal(browser({ marker: "2026-10-05" }).getBrowserPageViewPopulation(now), "internal");
  assert.equal(browser({ marker: "2026-09-05" }).getBrowserPageViewPopulation(now), "eligible");
});
test("malformed markers and blocked storage never silently become eligible", () => {
  for (const marker of ["", "2026-02-30", "tomorrow", "2026-99-99", "2026-10-05T12:00:00Z"]) {
    assert.equal(browser({ marker }).getBrowserPageViewPopulation(now), "unclassified");
  }
  const b = browser({ blocked: true }); assert.equal(b.getBrowserPageViewPopulation(now), "unclassified");
  assert.doesNotThrow(() => b.markInternalMeasurementBrowser(now));
});
test("WebDriver has one automation classification even for internal or storage-blocked browsers", () => {
  assert.equal(browser({ webdriver: true, marker: "2026-10-05" }).getBrowserPageViewPopulation(now), "automation");
  assert.equal(browser({ webdriver: true, blocked: true }).getBrowserPageViewPopulation(now), "automation");
});
test("old clients, unknown versions and arbitrary classification fields are unclassified", () => {
  for (const payload of [null, [], {}, { population: "eligible" }, { measurementVersion: "v3", population: "eligible" }, { measurementVersion: PAGE_VIEW_MEASUREMENT_VERSION, population: "human" }]) {
    assert.equal(classifyPageViewPopulation(payload, null), "unclassified");
  }
  for (const population of ["eligible", "internal", "automation"] as const) {
    assert.equal(classifyPageViewPopulation({ measurementVersion: PAGE_VIEW_MEASUREMENT_VERSION, population }, null), population);
  }
});
test("explicit acceptance header only opts the request out and unknown header grants nothing", () => {
  assert.equal(classifyPageViewPopulation({}, "automation"), "automation");
  assert.equal(classifyPageViewPopulation({}, "internal"), "unclassified");
});

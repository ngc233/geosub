import assert from "node:assert/strict";
import test from "node:test";
import {
  appendSeoObservationSnapshot,
  appendSeoTrafficObservationSnapshot,
  createSeoObservationSnapshot,
  createSeoTrafficObservationSnapshot,
  getSeoObservationCtr,
  getSeoObservationDelta,
  getSeoObservationReviewWindow,
  parseSeoObservationSnapshots,
  parseSeoTrafficObservationSnapshots,
} from "./seo-observation-snapshots.ts";

const baseline = createSeoObservationSnapshot({
  date: "2026-08-01",
  clicks: 80,
  impressions: 3924,
  indexedPages: 153,
  discoveredNotIndexed: 422,
  crawledNotIndexed: 35,
});

test("Bing traffic snapshots keep only comparable traffic metrics", () => {
  const first = createSeoTrafficObservationSnapshot({
    date: "2026-08-13",
    clicks: 199,
    impressions: 4200,
  });
  const updated = appendSeoTrafficObservationSnapshot(
    [first],
    { ...first, clicks: 205 },
  );

  assert.equal(getSeoObservationCtr(first), 4.74);
  assert.deepEqual(updated, [{ ...first, clicks: 205 }]);
  assert.deepEqual(
    parseSeoTrafficObservationSnapshots(JSON.stringify([first, { date: "bad" }])),
    [first],
  );
});

test("SEO observation snapshots validate Search Console metric constraints", () => {
  assert.equal(getSeoObservationCtr(baseline), 2.04);
  assert.throws(() =>
    createSeoObservationSnapshot({
      ...baseline,
      clicks: 11,
      impressions: 10,
    }),
  );
  assert.throws(() =>
    createSeoObservationSnapshot({
      ...baseline,
      date: "2026-02-30",
    }),
  );
  assert.throws(() =>
    createSeoObservationSnapshot({
      ...baseline,
      clicks: "",
    }),
  );
});

test("SEO observation snapshots replace the same date and remain bounded", () => {
  const updated = appendSeoObservationSnapshot(
    [baseline],
    { ...baseline, clicks: 90 },
  );
  assert.equal(updated.length, 1);
  assert.equal(updated[0].clicks, 90);

  const malformed = parseSeoObservationSnapshots(
    JSON.stringify([{ ...baseline }, { date: "bad" }, null]),
  );
  assert.deepEqual(malformed, [baseline]);
});

test("SEO observation deltas and review dates stay explicit", () => {
  const current = {
    ...baseline,
    date: "2026-08-14",
    clicks: 100,
    impressions: 4100,
    indexedPages: 170,
    discoveredNotIndexed: 390,
  };
  assert.deepEqual(getSeoObservationDelta(current, baseline), {
    clicks: 20,
    impressions: 176,
    ctr: 0.4,
    indexedPages: 17,
    discoveredNotIndexed: -32,
    crawledNotIndexed: 0,
  });
  assert.deepEqual(getSeoObservationReviewWindow("2026-08-14"), {
    earliest: "2026-08-28",
    latest: "2026-09-04",
  });
});

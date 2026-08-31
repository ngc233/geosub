import assert from "node:assert/strict";
import test from "node:test";
import { latestSitemapDate } from "./sitemap-lastmod.ts";

test("lastmod is stable when source data is unchanged across requests", () => {
  const candidates = [
    "2026-08-20T08:00:00.000Z",
    new Date("2026-08-22T10:30:00.000Z"),
    null,
  ];

  const first = latestSitemapDate(
    candidates,
    new Date("2026-08-30T00:00:00.000Z"),
  );
  const second = latestSitemapDate(
    candidates,
    new Date("2026-08-31T00:00:00.000Z"),
  );

  assert.equal(first?.toISOString(), "2026-08-22T10:30:00.000Z");
  assert.equal(second?.toISOString(), first?.toISOString());
});

test("lastmod uses an explicit fallback only when no source date is valid", () => {
  const fallback = new Date("2026-08-01T00:00:00.000Z");

  assert.equal(
    latestSitemapDate([null, undefined, "invalid"], fallback)?.toISOString(),
    fallback.toISOString(),
  );
  assert.equal(latestSitemapDate([null, undefined]), undefined);
});

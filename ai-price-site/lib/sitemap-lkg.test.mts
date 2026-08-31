import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createSitemapLkgSnapshot,
  readSitemapLkgSnapshot,
  resolveSitemapWithLastKnownGood,
  SITEMAP_LKG_MAX_AGE_MS,
  validateSitemapLkgSnapshot,
  writeSitemapLkgSnapshot,
} from "./sitemap-lkg.ts";

const siteOrigin = "https://geosub.org";
const now = new Date("2026-08-31T10:00:00.000Z");
const entries = [
  {
    url: `${siteOrigin}/zh/ai-pricing/chatgpt`,
    lastModified: new Date("2026-08-30T08:00:00.000Z"),
    changeFrequency: "daily" as const,
    priority: 0.9,
  },
  { url: `${siteOrigin}/en/ai-pricing/chatgpt` },
  { url: `${siteOrigin}/zh/streaming-pricing/netflix` },
];
const options = { siteOrigin, now, totalBudget: 148 };

test("LKG envelope contains policy metadata and a verifiable SHA-256 hash", () => {
  const snapshot = createSitemapLkgSnapshot(entries, options);

  assert.equal(snapshot.generatedAt, now.toISOString());
  assert.equal(snapshot.urlCount, entries.length);
  assert.equal(snapshot.siteOrigin, siteOrigin);
  assert.match(snapshot.schemaVersion, /^\d+$/);
  assert.match(snapshot.policyVersion, /^seo-policy-/);
  assert.match(snapshot.contentHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(validateSitemapLkgSnapshot(snapshot, options), snapshot);
});

test("LKG rejects tampering, wrong origin, expiry, budget overflow and missing sentinels", () => {
  const snapshot = createSitemapLkgSnapshot(entries, options);

  assert.throws(
    () =>
      validateSitemapLkgSnapshot(
        { ...snapshot, urlCount: snapshot.urlCount + 1 },
        options,
      ),
    /urlCount does not match/,
  );
  assert.throws(
    () =>
      validateSitemapLkgSnapshot(snapshot, {
        ...options,
        siteOrigin: "https://www.geosub.org",
      }),
    /siteOrigin does not match/,
  );
  assert.throws(
    () =>
      validateSitemapLkgSnapshot(snapshot, {
        ...options,
        now: new Date(now.getTime() + SITEMAP_LKG_MAX_AGE_MS + 1),
      }),
    /older than 24 hours/,
  );
  assert.throws(
    () => createSitemapLkgSnapshot(entries, { ...options, totalBudget: 2 }),
    /exceeds budget/,
  );
  assert.throws(
    () => createSitemapLkgSnapshot(entries.slice(0, 2), options),
    /missing dynamic sentinel/,
  );
});

test("resolver serves only a valid persisted LKG after live generation fails", async () => {
  const directory = await mkdtemp(join(tmpdir(), "geosub-sitemap-lkg-"));
  const snapshotPath = join(directory, "sitemap-lkg.json");
  const snapshot = createSitemapLkgSnapshot(entries, options);
  await writeSitemapLkgSnapshot(snapshotPath, snapshot);

  const result = await resolveSitemapWithLastKnownGood({
    ...options,
    snapshotPath,
    generate: async () => {
      throw new Error("database unavailable");
    },
  });

  assert.equal(result.source, "last_known_good");
  assert.equal(result.entries.length, entries.length);
  assert.equal(result.snapshot.contentHash, snapshot.contentHash);

  const stored = JSON.parse(await readFile(snapshotPath, "utf8"));
  stored.entries[0].priority = 0.5;
  await writeFile(snapshotPath, JSON.stringify(stored), "utf8");
  await assert.rejects(
    readSitemapLkgSnapshot(snapshotPath, options),
    /contentHash does not match/,
  );
});

test("fresh valid sitemap remains available when the recovery point cannot be written", async () => {
  let writeError: unknown;
  const result = await resolveSitemapWithLastKnownGood({
    ...options,
    snapshotPath: "relative/sitemap-lkg.json",
    generate: async () => entries,
    onSnapshotWriteError: (error) => {
      writeError = error;
    },
  });

  assert.equal(result.source, "fresh");
  assert.match(String(writeError), /must be an absolute path/);
});

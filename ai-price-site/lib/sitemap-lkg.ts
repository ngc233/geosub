import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";
import type { MetadataRoute } from "next";

type SitemapEntry = MetadataRoute.Sitemap[number];

export const SITEMAP_LKG_SCHEMA_VERSION = "1";
export const SITEMAP_LKG_POLICY_VERSION = "seo-policy-v2.10-lkg-2026-08-31";
export const SITEMAP_LKG_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const SITEMAP_LKG_DYNAMIC_SENTINELS = [
  "/zh/ai-pricing/chatgpt",
  "/en/ai-pricing/chatgpt",
  "/zh/streaming-pricing/netflix",
] as const;

const allowedChangeFrequencies = new Set([
  "always",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "never",
]);
const supportedEntryFields = new Set([
  "url",
  "lastModified",
  "changeFrequency",
  "priority",
]);

export type SitemapLkgEntry = {
  url: string;
  lastModified?: string;
  changeFrequency?: SitemapEntry["changeFrequency"];
  priority?: number;
};

export type SitemapLkgSnapshot = {
  schemaVersion: string;
  policyVersion: string;
  generatedAt: string;
  urlCount: number;
  siteOrigin: string;
  entries: SitemapLkgEntry[];
  contentHash: string;
};

type SitemapLkgValidationOptions = {
  siteOrigin: string;
  now: Date;
  totalBudget: number;
  requiredSentinelPaths?: readonly string[];
};

type ResolveSitemapOptions = SitemapLkgValidationOptions & {
  generate: () => Promise<MetadataRoute.Sitemap>;
  snapshotPath?: string;
  onSnapshotWriteError?: (error: unknown) => void;
};

function fail(message: string): never {
  throw new Error(`Invalid sitemap LKG snapshot: ${message}`);
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("expected an object");
  }
  return value as Record<string, unknown>;
}

function normalizeOrigin(value: string) {
  const url = new URL(value);
  if (url.origin !== value) {
    fail("siteOrigin must be an origin without a path, query or trailing slash");
  }
  return url.origin;
}

function normalizeEntries(
  entries: unknown,
  siteOrigin: string,
  totalBudget: number,
  requiredSentinelPaths: readonly string[],
) {
  if (!Array.isArray(entries) || entries.length === 0) {
    fail("entries must be a non-empty array");
  }
  if (entries.length > totalBudget) {
    fail(`urlCount ${entries.length} exceeds budget ${totalBudget}`);
  }

  const urls = new Set<string>();
  const normalized = entries.map((value) => {
    const entry = asRecord(value);
    const unsupportedFields = Object.keys(entry).filter(
      (key) => !supportedEntryFields.has(key),
    );
    if (unsupportedFields.length > 0) {
      fail(`unsupported entry field ${unsupportedFields[0]}`);
    }
    if (typeof entry.url !== "string") {
      fail("entry url must be a string");
    }

    const url = new URL(entry.url);
    if (url.origin !== siteOrigin || url.search || url.hash) {
      fail(`entry URL is outside ${siteOrigin} or contains query/fragment`);
    }
    if (
      url.pathname !== "/zh" &&
      url.pathname !== "/en" &&
      !url.pathname.startsWith("/zh/") &&
      !url.pathname.startsWith("/en/")
    ) {
      fail(`entry URL uses a non-indexable locale: ${url.pathname}`);
    }
    if (urls.has(url.toString())) {
      fail(`duplicate entry URL ${url.toString()}`);
    }
    urls.add(url.toString());

    let lastModified: string | undefined;
    if (entry.lastModified !== undefined) {
      const parsed = entry.lastModified instanceof Date
        ? entry.lastModified
        : new Date(String(entry.lastModified));
      if (Number.isNaN(parsed.getTime())) {
        fail(`invalid lastModified for ${url.pathname}`);
      }
      lastModified = parsed.toISOString();
    }

    let changeFrequency: SitemapEntry["changeFrequency"];
    if (entry.changeFrequency !== undefined) {
      if (
        typeof entry.changeFrequency !== "string" ||
        !allowedChangeFrequencies.has(entry.changeFrequency)
      ) {
        fail(`invalid changeFrequency for ${url.pathname}`);
      }
      changeFrequency = entry.changeFrequency as SitemapEntry["changeFrequency"];
    }

    let priority: number | undefined;
    if (entry.priority !== undefined) {
      if (
        typeof entry.priority !== "number" ||
        !Number.isFinite(entry.priority) ||
        entry.priority < 0 ||
        entry.priority > 1
      ) {
        fail(`invalid priority for ${url.pathname}`);
      }
      priority = entry.priority;
    }

    return {
      url: url.toString(),
      ...(lastModified ? { lastModified } : {}),
      ...(changeFrequency ? { changeFrequency } : {}),
      ...(priority !== undefined ? { priority } : {}),
    } satisfies SitemapLkgEntry;
  });

  for (const sentinelPath of requiredSentinelPaths) {
    const sentinelUrl = new URL(sentinelPath, siteOrigin).toString();
    if (!urls.has(sentinelUrl)) {
      fail(`missing dynamic sentinel ${sentinelPath}`);
    }
  }

  return normalized;
}

function snapshotPayload(snapshot: Omit<SitemapLkgSnapshot, "contentHash">) {
  return JSON.stringify({
    schemaVersion: snapshot.schemaVersion,
    policyVersion: snapshot.policyVersion,
    generatedAt: snapshot.generatedAt,
    urlCount: snapshot.urlCount,
    siteOrigin: snapshot.siteOrigin,
    entries: snapshot.entries,
  });
}

function contentHash(snapshot: Omit<SitemapLkgSnapshot, "contentHash">) {
  return createHash("sha256").update(snapshotPayload(snapshot)).digest("hex");
}

export function createSitemapLkgSnapshot(
  entries: MetadataRoute.Sitemap,
  options: SitemapLkgValidationOptions,
): SitemapLkgSnapshot {
  const siteOrigin = normalizeOrigin(options.siteOrigin);
  const normalizedEntries = normalizeEntries(
    entries,
    siteOrigin,
    options.totalBudget,
    options.requiredSentinelPaths ?? SITEMAP_LKG_DYNAMIC_SENTINELS,
  );
  const payload = {
    schemaVersion: SITEMAP_LKG_SCHEMA_VERSION,
    policyVersion: SITEMAP_LKG_POLICY_VERSION,
    generatedAt: options.now.toISOString(),
    urlCount: normalizedEntries.length,
    siteOrigin,
    entries: normalizedEntries,
  };

  return { ...payload, contentHash: contentHash(payload) };
}

export function validateSitemapLkgSnapshot(
  value: unknown,
  options: SitemapLkgValidationOptions,
): SitemapLkgSnapshot {
  const snapshot = asRecord(value);
  const siteOrigin = normalizeOrigin(options.siteOrigin);
  if (snapshot.schemaVersion !== SITEMAP_LKG_SCHEMA_VERSION) {
    fail("schemaVersion is incompatible");
  }
  if (snapshot.policyVersion !== SITEMAP_LKG_POLICY_VERSION) {
    fail("policyVersion is incompatible");
  }
  if (snapshot.siteOrigin !== siteOrigin) {
    fail("siteOrigin does not match the current site");
  }
  if (typeof snapshot.generatedAt !== "string") {
    fail("generatedAt must be an ISO date");
  }
  const generatedAt = new Date(snapshot.generatedAt);
  const age = options.now.getTime() - generatedAt.getTime();
  if (Number.isNaN(generatedAt.getTime()) || age < 0) {
    fail("generatedAt is invalid or in the future");
  }
  if (age > SITEMAP_LKG_MAX_AGE_MS) {
    fail("snapshot is older than 24 hours");
  }
  if (!Number.isInteger(snapshot.urlCount) || Number(snapshot.urlCount) <= 0) {
    fail("urlCount must be a positive integer");
  }

  const entries = normalizeEntries(
    snapshot.entries,
    siteOrigin,
    options.totalBudget,
    options.requiredSentinelPaths ?? SITEMAP_LKG_DYNAMIC_SENTINELS,
  );
  if (snapshot.urlCount !== entries.length) {
    fail("urlCount does not match entries");
  }
  if (typeof snapshot.contentHash !== "string") {
    fail("contentHash must be a SHA-256 string");
  }

  const payload = {
    schemaVersion: SITEMAP_LKG_SCHEMA_VERSION,
    policyVersion: SITEMAP_LKG_POLICY_VERSION,
    generatedAt: generatedAt.toISOString(),
    urlCount: entries.length,
    siteOrigin,
    entries,
  };
  const expectedHash = contentHash(payload);
  if (snapshot.contentHash !== expectedHash) {
    fail("contentHash does not match payload");
  }

  return { ...payload, contentHash: expectedHash };
}

function assertAbsoluteSnapshotPath(snapshotPath: string) {
  if (!isAbsolute(snapshotPath)) {
    throw new Error("GEOSUB_SITEMAP_LKG_PATH must be an absolute path.");
  }
}

export async function writeSitemapLkgSnapshot(
  snapshotPath: string,
  snapshot: SitemapLkgSnapshot,
) {
  assertAbsoluteSnapshotPath(snapshotPath);
  await mkdir(dirname(snapshotPath), { recursive: true });
  const temporaryPath = `${snapshotPath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await rename(temporaryPath, snapshotPath);
}

export async function readSitemapLkgSnapshot(
  snapshotPath: string,
  options: SitemapLkgValidationOptions,
) {
  assertAbsoluteSnapshotPath(snapshotPath);
  const raw = await readFile(snapshotPath, "utf8");
  return validateSitemapLkgSnapshot(JSON.parse(raw), options);
}

function snapshotEntries(snapshot: SitemapLkgSnapshot): MetadataRoute.Sitemap {
  return snapshot.entries.map((entry) => ({
    url: entry.url,
    ...(entry.lastModified
      ? { lastModified: new Date(entry.lastModified) }
      : {}),
    ...(entry.changeFrequency
      ? { changeFrequency: entry.changeFrequency }
      : {}),
    ...(entry.priority !== undefined ? { priority: entry.priority } : {}),
  }));
}

export async function resolveSitemapWithLastKnownGood(
  options: ResolveSitemapOptions,
) {
  let snapshot: SitemapLkgSnapshot;

  try {
    const entries = await options.generate();
    snapshot = createSitemapLkgSnapshot(entries, options);
  } catch (liveError) {
    if (!options.snapshotPath) throw liveError;

    try {
      const lastKnownGood = await readSitemapLkgSnapshot(
        options.snapshotPath,
        options,
      );
      return {
        source: "last_known_good" as const,
        entries: snapshotEntries(lastKnownGood),
        snapshot: lastKnownGood,
        liveError,
      };
    } catch (snapshotError) {
      throw new AggregateError(
        [liveError, snapshotError],
        "Live sitemap failed and no valid LKG snapshot was available.",
      );
    }
  }

  if (options.snapshotPath) {
    try {
      await writeSitemapLkgSnapshot(options.snapshotPath, snapshot);
    } catch (error) {
      options.onSnapshotWriteError?.(error);
    }
  }

  return {
    source: "fresh" as const,
    entries: snapshotEntries(snapshot),
    snapshot,
  };
}

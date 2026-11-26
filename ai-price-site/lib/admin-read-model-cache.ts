type AdminReadModelCacheEntry = {
  expiresAt: number;
  promise: Promise<unknown>;
};

const DEFAULT_ADMIN_READ_MODEL_TTL_MS = 10_000;
const MAX_ADMIN_READ_MODEL_TTL_MS = 60_000;
const MAX_ADMIN_READ_MODEL_ENTRIES = 64;

const globalForAdminReadModelCache = globalThis as typeof globalThis & {
  __geoSubAdminReadModelCache?: Map<string, AdminReadModelCacheEntry>;
};

const adminReadModelCache =
  globalForAdminReadModelCache.__geoSubAdminReadModelCache
  ?? new Map<string, AdminReadModelCacheEntry>();

globalForAdminReadModelCache.__geoSubAdminReadModelCache = adminReadModelCache;

function normalizeTtlMs(ttlMs?: number) {
  const configured = Number(process.env.GEOSUB_ADMIN_READ_MODEL_TTL_MS);
  const candidate = ttlMs ?? (
    Number.isFinite(configured) ? configured : DEFAULT_ADMIN_READ_MODEL_TTL_MS
  );

  if (!Number.isFinite(candidate)) return DEFAULT_ADMIN_READ_MODEL_TTL_MS;
  return Math.min(Math.max(Math.trunc(candidate), 0), MAX_ADMIN_READ_MODEL_TTL_MS);
}

function pruneAdminReadModelCache(now: number) {
  for (const [key, entry] of adminReadModelCache) {
    if (entry.expiresAt <= now) adminReadModelCache.delete(key);
  }

  while (adminReadModelCache.size >= MAX_ADMIN_READ_MODEL_ENTRIES) {
    const oldestKey = adminReadModelCache.keys().next().value;
    if (typeof oldestKey !== "string") break;
    adminReadModelCache.delete(oldestKey);
  }
}

export async function readAdminReadModel<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs?: number,
) {
  const normalizedKey = key.trim();
  if (!normalizedKey) return loader();

  const ttl = normalizeTtlMs(ttlMs);
  if (ttl === 0) return loader();

  const now = Date.now();
  const existing = adminReadModelCache.get(normalizedKey);
  if (existing && existing.expiresAt > now) {
    return existing.promise as Promise<T>;
  }

  if (existing) adminReadModelCache.delete(normalizedKey);
  pruneAdminReadModelCache(now);

  const promise = Promise.resolve().then(loader);
  const entry: AdminReadModelCacheEntry = {
    expiresAt: Number.POSITIVE_INFINITY,
    promise,
  };
  adminReadModelCache.set(normalizedKey, entry);

  try {
    const result = await promise;
    if (adminReadModelCache.get(normalizedKey) === entry) {
      entry.expiresAt = Date.now() + ttl;
    }
    return result;
  } catch (error) {
    if (adminReadModelCache.get(normalizedKey) === entry) {
      adminReadModelCache.delete(normalizedKey);
    }
    throw error;
  }
}

export const ADMIN_READ_MODEL_PREFIXES = {
  dataQuality: "data-quality:",
  dashboard: "dashboard:",
  productStatus: "product-status:",
  productSeoQuality: "product-seo-quality:",
  seoTrafficConversion: "seo-traffic-conversion:",
  searchDemand: "search-demand:",
  pipelineGrowthSignals: "pipeline:growth-signals:",
  versionsOverview: "versions.overview",
} as const;

export function invalidateAdminReadModels(prefix?: string) {
  const normalizedPrefix = prefix?.trim();
  if (!normalizedPrefix) {
    adminReadModelCache.clear();
    return;
  }

  for (const key of adminReadModelCache.keys()) {
    if (key.startsWith(normalizedPrefix)) adminReadModelCache.delete(key);
  }
}

function invalidateAdminReadModelPrefixes(prefixes: readonly string[]) {
  for (const prefix of prefixes) {
    invalidateAdminReadModels(prefix);
  }
}

export function invalidateAdminPricingReadModels() {
  invalidateAdminReadModelPrefixes([
    ADMIN_READ_MODEL_PREFIXES.dataQuality,
    ADMIN_READ_MODEL_PREFIXES.dashboard,
    ADMIN_READ_MODEL_PREFIXES.productStatus,
    ADMIN_READ_MODEL_PREFIXES.productSeoQuality,
    ADMIN_READ_MODEL_PREFIXES.pipelineGrowthSignals,
    ADMIN_READ_MODEL_PREFIXES.versionsOverview,
  ]);
}

export function invalidateAdminCatalogReadModels() {
  invalidateAdminReadModelPrefixes([
    ADMIN_READ_MODEL_PREFIXES.dataQuality,
    ADMIN_READ_MODEL_PREFIXES.dashboard,
    ADMIN_READ_MODEL_PREFIXES.productStatus,
    ADMIN_READ_MODEL_PREFIXES.productSeoQuality,
    ADMIN_READ_MODEL_PREFIXES.pipelineGrowthSignals,
    ADMIN_READ_MODEL_PREFIXES.versionsOverview,
  ]);
}

export function invalidateAdminSeoReadModels() {
  invalidateAdminReadModelPrefixes([
    ADMIN_READ_MODEL_PREFIXES.productSeoQuality,
    ADMIN_READ_MODEL_PREFIXES.seoTrafficConversion,
    ADMIN_READ_MODEL_PREFIXES.searchDemand,
    ADMIN_READ_MODEL_PREFIXES.pipelineGrowthSignals,
    ADMIN_READ_MODEL_PREFIXES.dashboard,
  ]);
}

export function invalidateAdminSystemReadModels() {
  invalidateAdminReadModelPrefixes([
    ADMIN_READ_MODEL_PREFIXES.versionsOverview,
    ADMIN_READ_MODEL_PREFIXES.dashboard,
  ]);
}

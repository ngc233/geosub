export const MAX_BATCH_COLLECTION_PRODUCTS = 10;

export type BatchCollectionResult = {
  requestedCount: number;
  queuedCount: number;
  startedCount: number;
  protectedCount: number;
  skippedCount: number;
  failedToStartCount: number;
};

export function normalizeBatchProductSlugs(
  values: Iterable<unknown>,
  limit = MAX_BATCH_COLLECTION_PRODUCTS,
) {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const slug = String(value ?? "").trim().toLowerCase();
    if (!slug || seen.has(slug)) continue;

    seen.add(slug);
    normalized.push(slug);

    if (normalized.length >= limit) break;
  }

  return normalized;
}

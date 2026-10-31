// Stable keyset pages retain every review boundary. A safety cap is explicit.
export async function readPriceRecordWindow<T>(
  readPage: (cursor: T | undefined, limit: number) => Promise<T[]>,
  pageSize = 5000,
  maximum = 50_000,
) {
  if (!Number.isInteger(pageSize) || pageSize < 1 || !Number.isInteger(maximum) || maximum < 1) {
    throw new Error("Invalid history read bounds");
  }
  const records: T[] = [];
  let cursor: T | undefined;
  while (true) {
    const limit = Math.min(pageSize, maximum - records.length + 1);
    const page = await readPage(cursor, limit);
    if (page.length > limit) throw new Error("History page exceeded requested bounds");
    const remaining = maximum - records.length;
    records.push(...page.slice(0, remaining));
    if (page.length > remaining) return { records, truncated: true };
    if (page.length < limit) return { records, truncated: false };
    cursor = page[page.length - 1];
  }
}

export type SitemapDateValue = Date | string | null | undefined;

function asValidDate(value: SitemapDateValue) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function latestSitemapDate(
  values: readonly SitemapDateValue[],
  fallback?: SitemapDateValue,
) {
  const validDates = values
    .map(asValidDate)
    .filter((value): value is Date => value !== null);

  if (validDates.length === 0) {
    return asValidDate(fallback) ?? undefined;
  }

  return validDates.reduce((latest, value) =>
    value.getTime() > latest.getTime() ? value : latest,
  );
}

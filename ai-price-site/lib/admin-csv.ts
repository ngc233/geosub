const CSV_FORMULA_PREFIX_PATTERN = /^[\t\r\n ]*[=+\-@]|^[\t\r]/;

export function neutralizeCsvFormula(text: string): string {
  if (!text) return "";
  return CSV_FORMULA_PREFIX_PATTERN.test(text) ? `'${text}` : text;
}

export function formatSafeCsvCell(value: unknown): string {
  const safeText = neutralizeCsvFormula(String(value ?? ""));
  return /[",\r\n]/.test(safeText)
    ? `"${safeText.replaceAll('"', '""')}"`
    : safeText;
}

export function formatSafeCsvRow(cells: readonly unknown[]): string {
  return cells.map(formatSafeCsvCell).join(",");
}

export function sanitizeDownloadFileName(
  raw: string,
  fallback = "export.csv",
): string {
  const cleaned = raw
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || fallback;
}

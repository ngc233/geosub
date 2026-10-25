// Local preview only. Unset in production; never uses credentials or live DB URLs.
export function getPriceEvidencePreview() {
  if (process.env.GEOSUB_PRICE_EVIDENCE_PREVIEW !== "country-readonly-copy") return null;
  const capturedAt = process.env.GEOSUB_PRICE_EVIDENCE_PREVIEW_AT;
  if (!capturedAt || !Number.isFinite(Date.parse(capturedAt))) return null;
  return { capturedAt: new Date(capturedAt).toISOString() };
}

export function getEvidencePlanHref(path: string) {
  return getPriceEvidencePreview() ? `https://geosub.org${path}` : path;
}

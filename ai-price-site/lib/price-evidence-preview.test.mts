import assert from "node:assert/strict";
import test from "node:test";
import { getEvidencePlanHref, getPriceEvidencePreview } from "./price-evidence-preview.ts";

test("production keeps local plan links when the explicit preview mode is absent", () => {
  const mode = process.env.GEOSUB_PRICE_EVIDENCE_PREVIEW;
  try {
    delete process.env.GEOSUB_PRICE_EVIDENCE_PREVIEW;
    assert.equal(getPriceEvidencePreview(), null);
    assert.equal(getEvidencePlanHref("/zh/ai-pricing/chatgpt/plus"), "/zh/ai-pricing/chatgpt/plus");
  } finally { if (mode === undefined) delete process.env.GEOSUB_PRICE_EVIDENCE_PREVIEW; else process.env.GEOSUB_PRICE_EVIDENCE_PREVIEW = mode; }
});

test("a valid read-only preview identifies capture time and opens global comparisons on the live site", () => {
  const mode = process.env.GEOSUB_PRICE_EVIDENCE_PREVIEW;
  const at = process.env.GEOSUB_PRICE_EVIDENCE_PREVIEW_AT;
  try {
    process.env.GEOSUB_PRICE_EVIDENCE_PREVIEW = "country-readonly-copy";
    process.env.GEOSUB_PRICE_EVIDENCE_PREVIEW_AT = "2026-10-25T03:30:52.360233+00:00";
    assert.equal(getPriceEvidencePreview()?.capturedAt, "2026-10-25T03:30:52.360Z");
    assert.equal(getEvidencePlanHref("/en/streaming-pricing/netflix/premium"), "https://geosub.org/en/streaming-pricing/netflix/premium");
    process.env.GEOSUB_PRICE_EVIDENCE_PREVIEW_AT = "invalid";
    assert.equal(getPriceEvidencePreview(), null);
    assert.equal(getEvidencePlanHref("/zh/countries"), "/zh/countries");
  } finally {
    if (mode === undefined) delete process.env.GEOSUB_PRICE_EVIDENCE_PREVIEW; else process.env.GEOSUB_PRICE_EVIDENCE_PREVIEW = mode;
    if (at === undefined) delete process.env.GEOSUB_PRICE_EVIDENCE_PREVIEW_AT; else process.env.GEOSUB_PRICE_EVIDENCE_PREVIEW_AT = at;
  }
});

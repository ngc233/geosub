import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import { getPricingReportFontFiles } from "./pricing-report-fonts.ts";

// Use PDFKit's installed font reader, so this verifies real font coverage rather
// than just a filename or PDF response status. No additional runtime dependency.
const require = createRequire(import.meta.url);
const fontkit = require("fontkit") as {
  openSync(file: string): { hasGlyphForCodePoint(code: number): boolean };
};
const required = "Spotify Premium Individual Family USD $12.99 $21.99 0123456789 éèçâœüöäßğİıŞş – · ’";

for (const locale of ["es", "tr", "fr", "it", "de", "pt"] as const) {
  test(`${locale} PDF fonts cover prices, basic Latin, accents and Turkish characters`, () => {
    const files = getPricingReportFontFiles(locale);
    for (const file of [files.regular, files.bold]) {
      const font = fontkit.openSync(path.resolve(file.startsWith("assets/") ? file : `node_modules/${file}`));
      const missing = [...new Set(required)].filter(char => !font.hasGlyphForCodePoint(char.codePointAt(0)!));
      assert.deepEqual(missing, [], `${locale} missing glyphs: ${missing.join("")}`);
    }
  });
}

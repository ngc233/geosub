import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const componentsDir = dirname(fileURLToPath(import.meta.url));

function readComponent(fileName: string) {
  return readFileSync(resolve(componentsDir, fileName), "utf8");
}

test("region table tax and risk labels follow the active locale", () => {
  const source = readComponent("ExpandableRegionPriceTable.tsx");

  assert.match(source, /function getRiskLabel\(level: RegionPrice\["riskLevel"\], locale: "zh" \| "en"\)/);
  assert.match(source, /if \(locale === "en"\)[\s\S]*return "needs review"/);
  assert.match(source, /function getTaxConfidenceLabel\(region: RegionPrice, locale: "zh" \| "en"\)/);
  assert.match(source, /return "Platform inferred"/);
  assert.match(source, /return "Verified"/);
  assert.match(source, /return "Medium confidence"/);
  assert.match(source, /return "Needs review"/);
  assert.match(source, /Risk \$\{getRiskLabel\(region\.riskLevel, locale\)\}/);
  assert.match(source, /风险\$\{getRiskLabel\(region\.riskLevel, locale\)\}/);
});

test("Chinese tax display translates common English tax source phrases", () => {
  const source = readComponent("ExpandableRegionPriceTable.tsx");

  assert.match(source, /function translateTaxTextToZh/);
  assert.ok(
    source.includes("return /^Usually includes/i.test(raw) ? `通常含 ${label}` : `含 ${label}`;"),
  );
  assert.match(source, /service tax\/i, "服务税"/);
  assert.match(source, /Sales tax varies by region/);
  assert.match(source, /销售税因地区不同/);
  assert.match(source, /VAT treatment needs review/);
  assert.match(source, /VAT 规则需复核/);
  assert.match(source, /Usually GST-inclusive/);
  assert.match(source, /通常已含 GST，最终以结算页为准/);
  assert.match(source, /App Store list price\.\*VAT-inclusive/);
  assert.match(source, /App Store 标价通常已含 VAT，最终以结算页为准/);
  assert.match(source, /Digital service tax treatment may vary/);
  assert.match(source, /数字服务税务规则可能随服务类别变化，最终以结算页为准/);
});

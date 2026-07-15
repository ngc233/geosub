import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(appDir, "..");

function readProjectFile(fileName: string) {
  return readFileSync(resolve(rootDir, fileName), "utf8");
}

test("detail risk model combines platform, price gap and tax signals", () => {
  const source = readProjectFile("lib/pricing-detail-adapter.ts");

  assert.match(source, /function assessAppStoreRisk/);
  assert.match(source, /platform !== "ios"[\s\S]*score \+= 5/);
  assert.match(source, /diffPercent <= -40[\s\S]*score \+= 10/);
  assert.match(source, /diffPercent <= -25[\s\S]*score \+= 6/);
  assert.match(source, /diffPercent >= 45[\s\S]*score \+= 3/);
  assert.match(source, /if \(taxVariable\)[\s\S]*score \+= 3/);
  assert.match(source, /taxConfidence === "low"[\s\S]*score \+= 5/);
  assert.match(source, /taxConfidence === "medium"[\s\S]*score \+= 1/);
  assert.match(source, /getRiskLevelFromScore\(finalScore\)/);
  assert.match(source, /Model rating: /);
  assert.match(source, /模型判断：/);
});

test("detail query loads country tax and App Store risk profiles together", () => {
  const source = readProjectFile("lib/pricing-detail-adapter.ts");

  assert.match(source, /LEFT JOIN country_tax_profiles tax_profile/);
  assert.match(source, /LEFT JOIN country_app_store_risk_profiles risk_profile/);
  assert.match(source, /tax_profile\.confidence AS tax_profile_confidence/);
  assert.match(source, /tax_profile\.is_variable_by_region AS tax_profile_is_variable/);
  assert.match(source, /risk_profile\.base_risk_score AS risk_base_score/);
  assert.match(source, /risk_profile\.risk_factors_zh AS risk_factors_zh/);
  assert.match(source, /risk_profile\.risk_factors_en AS risk_factors_en/);
});

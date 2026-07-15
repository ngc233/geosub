import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));

function readAppFile(fileName: string) {
  return readFileSync(resolve(appDir, fileName), "utf8");
}

const trustPages = [
  "zh/about/page.tsx",
  "en/about/page.tsx",
  "zh/privacy/page.tsx",
  "en/privacy/page.tsx",
  "zh/terms/page.tsx",
  "en/terms/page.tsx",
];

test("trust pages do not expose launch-time placeholder copy", () => {
  for (const fileName of trustPages) {
    const source = readAppFile(fileName);

    assert.doesNotMatch(source, /基础版本/);
    assert.doesNotMatch(source, /后续可以/);
    assert.doesNotMatch(source, /basic English trust page/i);
    assert.doesNotMatch(source, /expanded later/i);
    assert.doesNotMatch(source, /placeholder/i);
  }
});

test("trust pages explain current GeoSub data and policy boundaries", () => {
  assert.match(readAppFile("zh/about/page.tsx"), /App Store 正式价格/);
  assert.match(readAppFile("en/about/page.tsx"), /reviewed App Store subscription prices/);
  assert.match(readAppFile("zh/privacy/page.tsx"), /Google Analytics 或 Tag Manager/);
  assert.match(readAppFile("en/privacy/page.tsx"), /Google Analytics or Tag Manager/);
  assert.match(readAppFile("zh/terms/page.tsx"), /最终请以官方结算页和平台规则为准/);
  assert.match(readAppFile("en/terms/page.tsx"), /official platform rules remain authoritative/);
});

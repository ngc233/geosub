import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

function readSettingsFile(fileName: string) {
  return readFileSync(resolve(currentDir, fileName), "utf8");
}

test("settings page exposes Google analytics entry without asking for script tags", () => {
  const source = readSettingsFile("page.tsx");

  assert.match(source, /Google 统计代码/);
  assert.match(source, /GA4 Measurement ID/);
  assert.match(source, /GTM Container ID/);
  assert.match(source, /GA4 \{settings\.ga4Id \? "已配置" : "未配置"\}/);
  assert.match(source, /GTM \{settings\.gtmId \? "已配置" : "未配置"\}/);
  assert.match(source, /Google 统计设置已保存/);
  assert.match(source, /不要粘贴完整 script 代码/);
  assert.match(source, /保存设置/);
});

test("analytics settings validate ID-only GA4 and GTM inputs", () => {
  const source = readSettingsFile("actions.ts");

  assert.match(source, /\^G-\[A-Z0-9\]\{4,\}\$/);
  assert.match(source, /\^GTM-\[A-Z0-9\]\{4,\}\$/);
  assert.match(source, /ga4_id/);
  assert.match(source, /gtm_id/);
  assert.match(source, /redirect\("\/admin\/settings\?saved=1"\)/);
  assert.match(source, /不要粘贴整段脚本/);
});

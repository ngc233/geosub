import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));

function readAppFile(...segments: string[]) {
  return readFileSync(resolve(appDir, ...segments), "utf8");
}

test("home pages only link to currently available public sections", () => {
  const zhHome = readAppFile("zh", "page.tsx");
  const enHome = readAppFile("en", "page.tsx");

  for (const source of [zhHome, enHome]) {
    assert.doesNotMatch(source, /software-subscriptions/);
    assert.doesNotMatch(source, /gaming-steam/);
    assert.doesNotMatch(source, /gift-cards/);
    assert.doesNotMatch(source, /ai-rankings/);
    assert.match(source, /ai-pricing/);
    assert.match(source, /streaming-pricing/);
    assert.match(source, /data-sources/);
    assert.match(source, /guides/);
  }
});

test("English home page is not the launch placeholder", () => {
  const enHome = readAppFile("en", "page.tsx");

  assert.doesNotMatch(enHome, /Page framework ready/);
  assert.doesNotMatch(enHome, /basic English page framework/i);
  assert.match(enHome, /currently focuses on AI and streaming/);
  assert.match(enHome, /Data Sources/);
});

test("Chinese home page describes the current official scope", () => {
  const zhHome = readAppFile("zh", "page.tsx");

  assert.match(zhHome, /当前优先整理 AI 订阅和流媒体订阅/);
  assert.match(zhHome, /数据来源/);
  assert.match(zhHome, /订阅指南/);
});

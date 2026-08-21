import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  countryPageIndexApprovals,
  countryPagePilots,
  getCountryPagePilot,
  getCountryPagePilotLanguageAlternates,
  getCountryPagePilotPath,
  getIndexApprovedCountryPagePilots,
  isCountryPagePilotIndexApproved,
} from "./country-page-pilot.ts";

const root = process.cwd();

test("country page pilot keeps a bounded manually reviewed batch", () => {
  assert.equal(countryPagePilots.length, 7);
  assert.equal(
    new Set(countryPagePilots.map((pilot) => `${pilot.productSlug}:${pilot.countryCode}`)).size,
    countryPagePilots.length,
  );
  assert.ok(countryPagePilots.every((pilot) => pilot.countryCode.length === 2));
  const priceEvents = countryPagePilots.flatMap((pilot) =>
    pilot.priceEvent ? [pilot.priceEvent] : [],
  );
  assert.equal(priceEvents.length, 3);
  assert.ok(
    priceEvents.every(
      (event) =>
        event.previousLocalPrice !== event.currentLocalPrice &&
        event.sourceUrl.startsWith("https://apps.apple.com/"),
    ),
  );
});

test("country page pilot paths are stable and category aware", () => {
  const claude = getCountryPagePilot("claude", "south-korea", "ai");
  const netflix = getCountryPagePilot("netflix", "india", "streaming");
  assert.ok(claude);
  assert.ok(netflix);
  assert.equal(
    getCountryPagePilotPath(claude, "zh"),
    "/zh/ai-pricing/claude/regions/south-korea",
  );
  assert.equal(
    getCountryPagePilotPath(netflix, "en"),
    "/en/streaming-pricing/netflix/regions/india",
  );
  assert.equal(getCountryPagePilot("netflix", "india", "ai"), undefined);
});

test("country page pilot has distinct Chinese and English decision content", () => {
  for (const pilot of countryPagePilots) {
    assert.ok(pilot.title.zh.length >= 8);
    assert.ok(pilot.title.en.length >= 20);
    assert.ok(pilot.decisionSummary.zh.length >= 35);
    assert.ok(pilot.decisionSummary.en.length >= 80);
    assert.notEqual(pilot.decisionSummary.zh, pilot.decisionSummary.en);
    assert.ok(pilot.localContext.zh.length >= 25);
    assert.ok(pilot.availabilityCaution.zh.length >= 25);
  }
});

test("country page indexing uses an exact four-pair approval list", () => {
  const approvedPilots = getIndexApprovedCountryPagePilots();
  assert.equal(countryPageIndexApprovals.length, 4);
  assert.deepEqual(
    approvedPilots
      .map((pilot) => `${pilot.productSlug}:${pilot.countryCode}`)
      .sort(),
    ["chatgpt:PH", "claude:KR", "gemini:JP", "grok:KR"],
  );
  assert.equal(
    approvedPilots.flatMap((pilot) =>
      (["zh", "en"] as const).map((locale) =>
        getCountryPagePilotPath(pilot, locale),
      ),
    ).length,
    8,
  );
  assert.ok(
    countryPagePilots
      .filter((pilot) => !isCountryPagePilotIndexApproved(pilot))
      .every((pilot) => getCountryPagePilotLanguageAlternates(pilot) === undefined),
  );

  const claude = getCountryPagePilot("claude", "south-korea", "ai");
  assert.ok(claude);
  assert.deepEqual(getCountryPagePilotLanguageAlternates(claude), {
    "zh-CN": "/zh/ai-pricing/claude/regions/south-korea",
    "en-US": "/en/ai-pricing/claude/regions/south-korea",
    "x-default": "/en/ai-pricing/claude/regions/south-korea",
  });
});

test("country page metadata and sitemap share the approval decision", () => {
  const page = fs.readFileSync(
    path.join(root, "components", "CountryPricingPilotPage.tsx"),
    "utf8",
  );
  const sitemap = fs.readFileSync(path.join(root, "app", "sitemap.ts"), "utf8");
  const header = fs.readFileSync(
    path.join(root, "components", "Header.tsx"),
    "utf8",
  );
  assert.match(page, /isCountryPagePilotIndexApproved\(pilot\)/);
  assert.match(page, /getCountryPagePilotLanguageAlternates\(pilot\)/);
  assert.match(page, /!exchangeRate\.isExpired/);
  assert.match(page, /robots:\s*\{\s*index:\s*indexApproved,\s*follow:\s*true\s*\}/);
  assert.match(page, /title:\s*pilot\.title\[locale\]/);
  assert.doesNotMatch(page, /title:\s*`\$\{pilot\.title\[locale\]\}/);
  assert.doesNotMatch(page, /<main\b/);
  assert.match(sitemap, /getIndexApprovedCountryPagePilots\(\)/);
  assert.match(sitemap, /getCountryPagePilotPath\(pilot, locale\)/);
  assert.doesNotMatch(sitemap, /countryPagePilots\.flatMap/);
  assert.match(header, /isCountryPagePilotPath\(pathname\)/);
  assert.match(
    header,
    /language\.code === "zh" \|\| language\.code === "en"/,
  );
  assert.match(header, /availableLanguages\.map/);
});

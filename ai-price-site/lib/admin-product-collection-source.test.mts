import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyProductCollectionSource,
  isAppStoreCollectionState,
  isOfficialWebCollectionState,
} from "./admin-product-collection-source.ts";

test("active App Store jobs remain the primary collection channel", () => {
  const state = classifyProductCollectionSource({
    integrationStatus: "app_store_ready",
    appStoreJobCount: 2,
    activeAppStoreJobCount: 2,
  });

  assert.equal(state, "app_store_active");
  assert.equal(isAppStoreCollectionState(state), true);
  assert.equal(isOfficialWebCollectionState(state), false);
});

test("paused App Store jobs are not reported as missing", () => {
  assert.equal(
    classifyProductCollectionSource({
      appStoreJobCount: 1,
      activeAppStoreJobCount: 0,
    }),
    "app_store_paused",
  );
});

test("Apple Music Web evidence outranks its paused pilot job", () => {
  const state = classifyProductCollectionSource({
    officialWebJobCount: 1,
    pausedOfficialWebJobCount: 1,
    pendingWebObservationCount: 15,
  });

  assert.equal(state, "official_web_observed");
  assert.equal(isOfficialWebCollectionState(state), true);
});

test("official-page-only products wait for a Web collector instead of App Store", () => {
  assert.equal(
    classifyProductCollectionSource({ integrationStatus: "official_page_only" }),
    "official_web_unconfigured",
  );
});

test("one-time products do not enter subscription collection", () => {
  assert.equal(
    classifyProductCollectionSource({
      integrationStatus: "one_time_only",
      officialWebJobCount: 1,
    }),
    "one_time",
  );
});

test("a product with no supported source remains genuinely unconfigured", () => {
  assert.equal(classifyProductCollectionSource({}), "unconfigured");
});

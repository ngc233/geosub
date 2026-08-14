import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("CMS-backed core guides render their persisted content-cluster links", async () => {
  const [cmsSource, guideSource] = await Promise.all([
    readFile(new URL("./CmsBackedGuidePage.tsx", import.meta.url), "utf8"),
    readFile(new URL("./PublicGuidePage.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(cmsSource, /article\?\.relations/);
  assert.match(cmsSource, /streaming-pricing/);
  assert.match(cmsSource, /relatedLinks=\{relatedLinks\}/);
  assert.match(guideSource, /relatedLinks\.map/);
  assert.match(guideSource, /md:grid-cols-2/);
});

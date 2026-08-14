import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const progressBar = readFileSync(
  new URL("./RouteProgressBar.tsx", import.meta.url),
  "utf8",
);
const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const adminLink = readFileSync(
  new URL("./admin/AdminLink.tsx", import.meta.url),
  "utf8",
);

test("global route progress is mounted once and follows GeoSub styling", () => {
  assert.match(layout, /<RouteProgressBar\s*\/>/);
  assert.match(progressBar, /START_DELAY_MS = 120/);
  assert.match(progressBar, /bg-lime-500/);
  assert.match(progressBar, /motion-reduce:transition-none/);
  assert.match(progressBar, /destination\.origin !== window\.location\.origin/);
  assert.match(progressBar, /anchor\.hasAttribute\("download"\)/);
});

test("admin links rely on the global progress bar", () => {
  assert.doesNotMatch(adminLink, /data-admin-navigation-progress/);
  assert.doesNotMatch(adminLink, /bg-blue-600/);
});

test("ordinary navigation resets scroll without overriding browser history restoration", () => {
  assert.match(progressBar, /resetScrollOnCompleteRef\.current = true/);
  assert.match(progressBar, /resetScrollOnCompleteRef\.current = false/);
  assert.match(progressBar, /window\.scrollTo\(0, 0\)/);
  assert.match(progressBar, /window\.addEventListener\("popstate", handlePopState\)/);
});

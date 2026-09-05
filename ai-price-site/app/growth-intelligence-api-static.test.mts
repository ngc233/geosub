import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(
  new URL("./api/internal/growth/v1/overview/route.ts", import.meta.url),
  "utf8",
);
const readModel = readFileSync(
  new URL("../lib/growth-intelligence-read-model.ts", import.meta.url),
  "utf8",
);

test("growth intelligence endpoint stays private read-only and fail-closed", () => {
  assert.match(route, /export async function GET/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.match(route, /requiredScope: "growth:read"/);
  assert.match(route, /Cache-Control": "private, no-store, max-age=0"/);
  assert.match(route, /X-Robots-Tag": "noindex, nofollow"/);
  assert.match(route, /Vary: "Authorization"/);
  assert.doesNotMatch(route, /Access-Control-Allow-Origin/);
});

test("growth intelligence read model excludes raw visitor identity and vendor actions", () => {
  assert.match(readModel, /rawEventsIncluded: false/);
  assert.match(readModel, /visitorIdentifiersIncluded: false/);
  assert.match(readModel, /vendorCredentialsIncluded: false/);
  assert.match(readModel, /externalActionsAvailable: false/);
  assert.doesNotMatch(readModel, /sessionId:\s*row\./);
  assert.doesNotMatch(readModel, /anonymousId:\s*row\./);
  assert.doesNotMatch(readModel, /userAgent:\s*row\./);
});

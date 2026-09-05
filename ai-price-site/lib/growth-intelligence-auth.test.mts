import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeGrowthIntelligenceRequest,
  parseGrowthIntelligenceConsumers,
} from "./growth-intelligence-auth.ts";

const token = "a".repeat(48);
const config = JSON.stringify([
  {
    id: "codex",
    token,
    scopes: ["growth:read", "reports:read"],
  },
  {
    id: "reporter",
    token: "b".repeat(48),
    scopes: ["reports:read"],
    notAfter: "2026-09-30T00:00:00.000Z",
  },
]);

test("growth API consumers require bounded unique identities and known scopes", () => {
  assert.equal(parseGrowthIntelligenceConsumers(config).length, 2);
  assert.throws(
    () =>
      parseGrowthIntelligenceConsumers(
        JSON.stringify([
          { id: "codex", token, scopes: ["growth:write"] },
        ]),
      ),
    /scope/i,
  );
  assert.throws(
    () =>
      parseGrowthIntelligenceConsumers(
        JSON.stringify([
          { id: "codex", token, scopes: ["growth:read"] },
          { id: "codex", token: "c".repeat(48), scopes: ["reports:read"] },
        ]),
      ),
    /unique/i,
  );
});

test("growth API is fail-closed when disabled or misconfigured", () => {
  assert.deepEqual(
    authorizeGrowthIntelligenceRequest({
      authorization: `Bearer codex.${token}`,
      requiredScope: "growth:read",
      enabled: "false",
      consumerConfig: config,
    }),
    { ok: false, status: 404, code: "disabled" },
  );
  assert.deepEqual(
    authorizeGrowthIntelligenceRequest({
      authorization: `Bearer codex.${token}`,
      requiredScope: "growth:read",
      enabled: "true",
      consumerConfig: "not-json",
    }),
    { ok: false, status: 503, code: "misconfigured" },
  );
});

test("growth API rejects missing invalid expired and scope-limited credentials", () => {
  for (const authorization of [null, "Basic abc", "Bearer unknown.secret", "Bearer codex.wrong"]) {
    const result = authorizeGrowthIntelligenceRequest({
      authorization,
      requiredScope: "growth:read",
      enabled: "true",
      consumerConfig: config,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 401);
  }

  const forbidden = authorizeGrowthIntelligenceRequest({
    authorization: `Bearer reporter.${"b".repeat(48)}`,
    requiredScope: "growth:read",
    enabled: "true",
    consumerConfig: config,
    now: new Date("2026-09-01T00:00:00.000Z"),
  });
  assert.deepEqual(forbidden, { ok: false, status: 403, code: "forbidden" });

  const expired = authorizeGrowthIntelligenceRequest({
    authorization: `Bearer reporter.${"b".repeat(48)}`,
    requiredScope: "reports:read",
    enabled: "true",
    consumerConfig: config,
    now: new Date("2026-10-01T00:00:00.000Z"),
  });
  assert.deepEqual(expired, { ok: false, status: 401, code: "unauthorized" });
});

test("growth API returns only non-secret consumer identity after authorization", () => {
  const result = authorizeGrowthIntelligenceRequest({
    authorization: `Bearer codex.${token}`,
    requiredScope: "growth:read",
    enabled: "true",
    consumerConfig: config,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.consumer.id, "codex");
  assert.equal("token" in result.consumer, false);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fetchAdminExternalJson } from "./admin-external-fetch.ts";

test("fetchAdminExternalJson returns parsed JSON on 200 OK and sets no-store + abort signal", async () => {
  let seenInit: RequestInit | undefined;
  const result = await fetchAdminExternalJson<{ results: number[] }>(
    "https://itunes.apple.com/lookup?id=123",
    {
      label: "test_lookup",
      fetchImpl: async (_input, init) => {
        seenInit = init;
        return new Response(JSON.stringify({ results: [1, 2] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  );

  assert.deepEqual(result, { results: [1, 2] });
  assert.equal(seenInit?.cache, "no-store");
  assert.ok(seenInit?.signal instanceof AbortSignal);
});

test("fetchAdminExternalJson aborts stalled upstream calls and returns null safely", async () => {
  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (message: string) => warnings.push(String(message));

  try {
    const result = await fetchAdminExternalJson(
      "https://itunes.apple.com/search?term=chatgpt&secret=should-not-log",
      {
        timeoutMs: 25,
        label: "test_timeout",
        fetchImpl: async (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(init.signal?.reason ?? new Error("aborted"));
            });
          }),
      },
    );

    assert.equal(result, null);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /admin_external_fetch_failed/);
    assert.match(warnings[0], /itunes\.apple\.com/);
    assert.doesNotMatch(warnings[0], /should-not-log/);
  } finally {
    console.warn = originalWarn;
  }
});

test("fetchAdminExternalJson returns null on non-OK HTTP responses", async () => {
  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (message: string) => warnings.push(String(message));

  try {
    const result = await fetchAdminExternalJson("https://itunes.apple.com/lookup?id=1", {
      label: "test_non_ok",
      fetchImpl: async () => new Response("rate limited", { status: 429 }),
    });

    assert.equal(result, null);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /"status":429/);
  } finally {
    console.warn = originalWarn;
  }
});

test("products and discovery actions use timeout-guarded external fetch for iTunes lookups", () => {
  for (const file of [
    "../app/admin/products/actions.ts",
    "../app/admin/discovery/actions.ts",
  ]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, /fetchAdminExternalJson/);
    assert.doesNotMatch(source, /await fetch\(\s*`https:\/\/itunes\.apple\.com/);
  }
});

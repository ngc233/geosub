import assert from "node:assert/strict";
import test from "node:test";

import {
  invalidateAdminReadModels,
  readAdminReadModel,
} from "./admin-read-model-cache.ts";

test.beforeEach(() => {
  invalidateAdminReadModels();
});

test("admin read models coalesce concurrent identical loads", async () => {
  let loadCount = 0;
  const loader = async () => {
    loadCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { value: 42 };
  };

  const [first, second] = await Promise.all([
    readAdminReadModel("dashboard:test", loader, 1_000),
    readAdminReadModel("dashboard:test", loader, 1_000),
  ]);

  assert.equal(loadCount, 1);
  assert.strictEqual(first, second);
});

test("admin read models keep slow in-flight loads coalesced", async () => {
  let loadCount = 0;
  const loader = async () => {
    loadCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 15));
    return loadCount;
  };

  const first = readAdminReadModel("dashboard:slow", loader, 1);
  await new Promise((resolve) => setTimeout(resolve, 5));
  const second = readAdminReadModel("dashboard:slow", loader, 1);

  assert.deepEqual(await Promise.all([first, second]), [1, 1]);
  assert.equal(loadCount, 1);
});

test("admin read models expire and can be invalidated by prefix", async () => {
  let loadCount = 0;
  const loader = async () => ++loadCount;

  assert.equal(await readAdminReadModel("search:30", loader, 10), 1);
  assert.equal(await readAdminReadModel("search:30", loader, 10), 1);
  invalidateAdminReadModels("search:");
  assert.equal(await readAdminReadModel("search:30", loader, 10), 2);

  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(await readAdminReadModel("search:30", loader, 10), 3);
});

test("failed admin read models are never retained", async () => {
  let loadCount = 0;
  const loader = async () => {
    loadCount += 1;
    if (loadCount === 1) throw new Error("temporary database failure");
    return "recovered";
  };

  await assert.rejects(
    readAdminReadModel("data-quality:test", loader, 1_000),
    /temporary database failure/,
  );
  assert.equal(
    await readAdminReadModel("data-quality:test", loader, 1_000),
    "recovered",
  );
  assert.equal(loadCount, 2);
});

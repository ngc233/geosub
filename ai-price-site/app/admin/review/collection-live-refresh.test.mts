import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { buildCollectionProgressState } from "./collection-progress.ts";
import { withAdminReturnTo } from "../../../lib/admin-workflow-context.ts";
import type { CollectorRunHistoryRow } from "./types.ts";

const require = createRequire(import.meta.url);
const runId = "11111111-1111-4111-8111-111111111111";

async function pollResult(status: string, requested = true, product = "fixture", initialStatus = "running") {
  const initial = { id: runId, product_slug: "fixture", product_name: "Fixture", status: initialStatus };
  const next = { ...initial, product_slug: product, status };
  const links: Array<{ href: string; children: unknown }> = [];
  const returnTo = "/admin/pipeline?q=fixture#pipeline-row-fixture";
  const effects: Array<() => (() => void)> = [];
  let refreshes = 0;
  const replacements: Array<{ href: string; scroll: boolean }> = [];
  const router = {
    refresh: () => { refreshes++; },
    replace: (href: string, options: { scroll: boolean }) => replacements.push({ href, ...options }),
  };
  const compiledModule = { exports: {} as { default: (props: object) => unknown } };
  const source = readFileSync(new URL("./CollectionRunHistorySection.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    module: compiledModule, exports: compiledModule.exports, URLSearchParams,
    window: {
      setTimeout: () => 1, clearTimeout() {},
      location: { pathname: "/admin/review", search: "?product=fixture&returnTo=%2Fadmin%2Fpipeline", hash: "#collection-runs" },
    },
    fetch: async () => ({ ok: true, json: async () => ({ rows: [next] }) }),
    require(name: string) {
      if (name === "react") return {
        useState: (value: unknown) => [typeof value === "function" ? value() : value, () => {}],
        useMemo: (factory: () => unknown) => factory(),
        useEffect: (effect: () => (() => void)) => effects.push(effect),
        useRef: (value: unknown) => ({ current: value }),
        useTransition: () => [false, (callback: () => void) => callback()],
      };
      if (name === "react/jsx-runtime") {
        const render = (_type: unknown, props: { href?: string; children?: unknown }) => {
          if (props.href) links.push({ href: props.href, children: props.children });
          return null;
        };
        return { jsx: render, jsxs: render };
      }
      if (name === "next/navigation") return { useRouter: () => router };
      if (name === "./collection-progress") return { buildCollectionProgressState };
      if (name === "./review-display") return { formatDate: () => "fixture date" };
      if (name.includes("AdminButton")) return { adminButtonClassName: () => "fixture" };
      if (name.includes("AdminLink") || name.includes("AdminProductLogo") || name.includes("CollectorRunTimeline")) return {};
      if (name === "@/lib/admin-workflow-context") return { withAdminReturnTo };
      return require(name);
    },
  });
  compiledModule.exports.default({
    rows: [initial as CollectorRunHistoryRow], collectionRun: requested ? "queued" : null,
    collectionScope: "fixture", productSlug: "fixture", productQuery: "fixture",
    runId: requested ? runId : null, pendingCount: 0, returnTo,
  });
  const cleanup = effects[0]();
  await new Promise(resolve => setImmediate(resolve));
  cleanup?.();
  return { refreshes, replacements, links, returnTo };
}

test("completion polling refreshes the server-owned pending list instead of trusting its old zero", async () => {
  const result = await pollResult("succeeded");
  assert.equal(result.refreshes, 1);
  assert.deepEqual(result.replacements, []);
});

test("a progress link without an ID keeps the actual run and existing return context on completion", async () => {
  const result = await pollResult("succeeded", false);
  assert.equal(result.refreshes, 0);
  assert.equal(result.replacements.length, 1);
  const next = new URL(result.replacements[0].href, "http://local.test");
  assert.equal(next.searchParams.get("runId"), runId);
  assert.equal(next.searchParams.get("product"), "fixture");
  assert.equal(next.searchParams.get("returnTo"), "/admin/pipeline");
  assert.equal(next.hash, "#collection-runs");
  assert.equal(result.replacements[0].scroll, false);
});

test("running data and another product's completed data cannot trigger a completed-results refresh", async () => {
  assert.equal((await pollResult("running")).refreshes, 0);
  assert.equal((await pollResult("succeeded", true, "other-product")).refreshes, 0);
});

test("completed and failed next steps retain the original filtered row", async () => {
  for (const status of ["succeeded", "failed"]) {
    const result = await pollResult(status, true, "fixture", status);
    const action = result.links.find(link => link.children ===
      (status === "succeeded" ? "查看正式价格" : "查看运行原因"));
    assert.ok(action);
    const next = new URL(action.href, "http://local.test");
    assert.equal(next.pathname, status === "succeeded" ? "/admin/prices" : "/admin/collector-jobs");
    assert.equal(next.searchParams.get("product"), "fixture");
    assert.equal(next.searchParams.get("returnTo"), result.returnTo);
  }
});

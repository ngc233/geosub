import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { workspaceStatus, type WorkspaceRow } from "../../../lib/admin-workspace-model.ts";
import { adminListLocation, withAdminReturnTo } from "../../../lib/admin-workflow-context.ts";
import { createAdminListView } from "../../../lib/admin-list-params.ts";

function renderRow(platform: "ios" | "web") {
  const row: WorkspaceRow = {
    id: "fixture-id", slug: platform === "web" ? "spotify" : "chatgpt", name: "Fixture",
    publish_status: "published", billing_platform: platform, price_count: 5, stale_count: 1,
    latest_checked: null, job_count: 1, running_count: 0, failed_count: 0, queued_count: 0,
  };
  const navigations: Array<{ href: string; scroll: boolean }> = [];
  const elements: Array<{
    href?: string; children?: unknown; ariaLabel?: string; onChange?: (value: string) => void;
  }> = [];
  const render = (_type: unknown, props: { href?: string; children?: unknown }) => {
    elements.push(props);
    return null;
  };
  const source = readFileSync(new URL("../Workspace.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const compiledModule = { exports: {} as { default: (props: object) => unknown } };
  vm.runInNewContext(code, {
    module: compiledModule, exports: compiledModule.exports, URL,
    window: { location: { href: "http://local.test/admin?view=all&page=2" } },
    require(name: string) {
      if (name === "next/navigation") return { useRouter: () => ({
        replace: (href: string, options: { scroll: boolean }) => navigations.push({ href, ...options }),
      }) };
      if (name === "react") return { useState: (value: unknown) => [value, () => {}] };
      if (name === "react/jsx-runtime") return { jsx: render, jsxs: render };
      if (name.endsWith("admin-workspace-model")) return { workspaceStatus };
      if (name.endsWith("admin-workflow-context")) return { withAdminReturnTo, adminListLocation };
      if (name.endsWith("admin-list-params")) return { createAdminListView };
      if (name.endsWith("AdminButton")) return { adminButtonClassName: () => "" };
      return {};
    },
  });
  compiledModule.exports.default({
    rows: [row], partial: false, failed: false, role: "OWNER", readAt: "fixture",
    denied: false, initialFilter: "all",
  });
  elements.find(element => element.ariaLabel === "待办筛选")?.onChange?.("progress");
  return {
    navigations,
    text: elements.flatMap(element => [element.children].flat(Infinity)).filter(value => typeof value === "string").join(" "),
    hrefs: elements.filter(element => element.href).map(element => element.href!),
  };
}

test("website work items describe website prices and return from source records to the original row", () => {
  const result = renderRow("web");
  assert.match(result.text, /1 条 官网 正式价格/);
  assert.doesNotMatch(result.text, /App Store/);
  const href = result.hrefs.find(value => value.startsWith("/admin/collector-jobs"));
  assert.ok(href);
  const url = new URL(href, "http://local.test");
  assert.equal(url.searchParams.get("product"), "spotify");
  assert.equal(url.searchParams.get("returnTo"), "/admin?view=all#workspace-row-fixture-id");
});

test("App Store work items keep their original price description and diagnostic destination", () => {
  const result = renderRow("ios");
  assert.match(result.text, /1 条 App Store 正式价格/);
  assert.ok(result.hrefs.some(value => value.startsWith("/admin/data-quality/chatgpt?")));
  assert.ok(!result.hrefs.some(value => value.startsWith("/admin/collector-jobs")));
});

test("workspace filters synchronize the router and clear the old page before leaving and returning", () => {
  const result = renderRow("web");
  assert.deepEqual(result.navigations, [{ href: "/admin?view=progress", scroll: false }]);
});

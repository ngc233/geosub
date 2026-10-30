import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(resolve(projectRoot, "package.json"));
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

// Server-render the real component source; only the Next link and client-only helpers are stubbed.
function load(file: string, stubs: Record<string, unknown>) {
  const source = readFileSync(resolve(projectRoot, file), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const loaded = { exports: {} as Record<string, unknown> };
  new Function("require", "module", "exports", outputText)(
    (name: string) => (name in stubs ? stubs[name] : require(name)),
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

const AdminLink = ({ href, children, ...props }: { href: string; children: unknown }) =>
  React.createElement("a", { href, ...props }, children);
const esm = (value: Record<string, unknown>) => ({ __esModule: true, ...value });
const listParams = load("lib/admin-list-params.ts", {});
const button = load("components/admin/AdminButton.tsx", { "@/components/admin/AdminLink": esm({ default: AdminLink }) });
const pagination = load("components/admin/AdminPagination.tsx", {
  "./AdminLink": esm({ default: AdminLink }),
  "../../lib/admin-list-params": listParams,
});
const stubs = {
  "./admin-control": load("components/admin/admin-control.ts", {}),
  "./AdminPagination": pagination,
  "@/components/admin/AdminLink": esm({ default: AdminLink }),
  "../../lib/admin-list-params": listParams,
  "./AdminSelectAll": esm({ default: () => React.createElement("input", { type: "checkbox", "data-select-all": "" }) }),
  "./AdminButton": button,
};
const AdminSegmentedControl = load("components/admin/AdminSegmentedControl.tsx", {
  "./AdminLink": esm({ default: AdminLink }),
}).default as (props: Record<string, unknown>) => unknown;
const AdminDataTable = load("components/admin/AdminDataTable.tsx", stubs).default as (props: Record<string, unknown>) => unknown;
const AdminFilterBar = load("components/admin/AdminFilterBar.tsx", stubs).default as (props: Record<string, unknown>) => unknown;

const columns = [
  { key: "name", label: "产品", sortable: true },
  { key: "status", label: "状态" },
  { key: "prices", label: "价格数", sortable: true, align: "right" },
];
const base = {
  caption: "产品列表",
  columns,
  sort: "name",
  direction: "asc",
  sortHref: (column: string) => `/admin/products?sort=${column}`,
  pageSize: 50,
  pageHref: (page: number) => `/admin/products?page=${page}`,
};

test("data table renders sortable headers with aria-sort and page links", () => {
  const html = renderToStaticMarkup(
    React.createElement(AdminDataTable, {
      ...base,
      rows: [{ key: "a", cells: { name: "ChatGPT", status: "已发布", prices: 39 } }],
      page: 5,
      totalPages: 20,
      total: 987,
    }),
  );
  assert.match(html, /<caption class="sr-only">产品列表<\/caption>/);
  assert.match(html, /<th scope="col" aria-sort="ascending"[^>]*><a href="\/admin\/products\?sort=name"/);
  assert.doesNotMatch(html, /href="\/admin\/products\?sort=status"/, "non-sortable columns are plain text");
  assert.match(html, /第 201–250 条，共 987 条/);
  assert.match(html, /<span aria-label="第 5 页" aria-current="page"/);
  for (const page of [1, 4, 6, 20]) assert.match(html, new RegExp(`href="/admin/products\\?page=${page}"`));
  assert.match(html, /aria-label="上一页"[^>]*href="\/admin\/products\?page=4"|href="\/admin\/products\?page=4"[^>]*aria-label="上一页"/);
  assert.match(html, /class="[^"]*text-right[^"]*">39</);
});

test("data table shows an explicit empty state and disables page links on a single page", () => {
  const html = renderToStaticMarkup(
    React.createElement(AdminDataTable, { ...base, rows: [], page: 1, totalPages: 1, total: 0, emptyMessage: "没有匹配的产品。" }),
  );
  assert.match(html, /colSpan="3"|colspan="3"/);
  assert.match(html, /没有匹配的产品。/);
  assert.match(html, /共 0 条/);
  assert.doesNotMatch(html, /aria-label="下一页"/);
});

test("selectable rows join the bulk form through the form attribute only when selectable", () => {
  const html = renderToStaticMarkup(
    React.createElement(AdminDataTable, {
      ...base,
      rows: [
        { key: "a", cells: { name: "A" }, selectValue: "id-a" },
        { key: "b", cells: { name: "B" } },
      ],
      page: 1,
      totalPages: 1,
      total: 2,
      selection: { formId: "bulk-products", name: "productIds" },
    }),
  );
  assert.match(html, /data-select-all/);
  const boxes = html.match(/<input[^>]*form="bulk-products"[^>]*>/g) || [];
  assert.equal(boxes.length, 1, "only rows with a selectValue get a checkbox");
  assert.match(boxes[0], /name="productIds"/);
  assert.match(boxes[0], /value="id-a"/);
  assert.match(boxes[0], /aria-label="选择此行"/);
  assert.doesNotMatch(html, /value="undefined"/);
});

test("filter bar is a GET search form that preserves sort and counts active filters", () => {
  const html = renderToStaticMarkup(
    React.createElement(AdminFilterBar, {
      action: "/admin/products",
      q: "net",
      filters: [{ name: "status", label: "状态", value: "PUBLISHED", options: [{ value: "PUBLISHED", label: "已发布" }] }],
      preserve: { sort: "updated", dir: "desc", empty: "" },
      clearHref: "/admin/products?sort=updated&dir=desc",
    }),
  );
  const form = html.match(/<form[^>]*>/)?.[0] || "";
  for (const attribute of ['role="search"', 'action="/admin/products"', 'method="get"']) assert.ok(form.includes(attribute), attribute);
  assert.match(html, /<input type="hidden" name="sort" value="updated"\/>/);
  assert.doesNotMatch(html, /name="empty"/);
  const search = html.match(/<input[^>]*type="search"[^>]*>/)?.[0] || "";
  assert.match(search, /name="q"/);
  assert.match(search, /aria-label="搜索"/);
  assert.match(html, /<select[^>]*aria-label="状态"/);
  assert.match(search, /value="net"/);
  assert.match(html, /<option value="PUBLISHED" selected="">已发布<\/option>/);
  assert.match(html, /href="\/admin\/products\?sort=updated&amp;dir=desc"[^>]*>.*清除 2 项筛选/);
});


test("admin navigation and local filters use the same selected treatment and retain disabled states", () => {
  const html=renderToStaticMarkup(React.createElement(AdminSegmentedControl, {
    ariaLabel:"产品状态",value:"all",items:[
      {value:"all",label:"全部 42",href:"/admin/products"},
      {value:"pending",label:"待处理 6",href:"/admin/products?state=pending"},
      {value:"disabled",label:"不可用",disabled:true},
    ],
  }));
  assert.match(html,/data-admin-segmented=""/);
  const selected=html.match(/<a[^>]*aria-selected="true"[^>]*>/)?.[0]||"";
  assert.match(selected,/bg-admin-primary text-white/);
  assert.match(html,/role="tablist"/);
  assert.match(html,/aria-label="产品状态"/);
  assert.match(html,/<button[^>]*disabled=""/);
  assert.doesNotMatch(html,/bg-zinc|shadow-inner|ring-blue-200/);
});

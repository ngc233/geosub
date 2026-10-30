import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

type LinkProps = Record<string, unknown> & { children?: unknown };

function renderLink(props: LinkProps, pending = false) {
  const links: LinkProps[] = [];
  const prefetches: string[] = [];
  const compiledModule = { exports: {} as { default: (props: LinkProps) => unknown } };
  const source = readFileSync(new URL("./AdminLink.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    module: compiledModule, exports: compiledModule.exports,
    require(name: string) {
      if (name === "next/link") return {
        __esModule: true,
        default(link: LinkProps) {
          links.push(link);
          return React.createElement("a", { href: link.href, className: link.className }, link.children);
        },
        useLinkStatus: () => ({ pending }),
      };
      if (name === "next/navigation") return {
        usePathname: () => "/admin/products",
        useRouter: () => ({ prefetch: (href: string) => prefetches.push(href) }),
      };
      if (name === "./AdminPermissions") return { useAdminPermission: () => true };
      if (name === "lucide-react") return { LoaderCircle: (p: object) => React.createElement("svg", p) };
      return require(name);
    },
  });
  const html = renderToStaticMarkup(React.createElement(compiledModule.exports.default, props));
  return { html, links, prefetches };
}

test("large result links remain click-only and preserve query and return context", () => {
  const href = "/admin/review?product=chatgpt&returnTo=%2Fadmin%2Fpipeline%3Fpage%3D2";
  const result = renderLink({ href, children: "查看异常" }, true);
  assert.equal(result.links[0].prefetch, false);
  assert.equal(result.links[0].href, href);
  assert.doesNotMatch(result.html, /正在打开页面/);
  assert.deepEqual(result.prefetches, []);
});

test("navigation opts into partial prefetch and reports pending without removing its label", () => {
  const result = renderLink({ href: "/admin/data-quality", children: "数据质量", prefetch: "auto", showPending: true }, true);
  assert.equal(result.links[0].prefetch, "auto");
  assert.match(result.html, /数据质量/);
  assert.match(result.html, /正在打开页面/);
  assert.match(result.html, /aria-live="polite"/);
  assert.match(result.html, /pointer-events-none absolute/);
  assert.match(result.html, /motion-safe:animate-spin/);
});

test("completed navigation retains a fixed hint slot without a stale loading message", () => {
  const result = renderLink({ href: "/admin/prices", children: "正式价格", showPending: true });
  assert.doesNotMatch(result.html, /正在打开页面/);
  assert.match(result.html, /h-4 w-4/);
});

test("partial prefetch never forces full dataset prefetch on focus", () => {
  const result = renderLink({ href: "/admin/prices", prefetch: "auto", children: "正式价格" });
  (result.links[0].onFocus as (event: object) => void)({});
  (result.links[0].onMouseEnter as (event: object) => void)({});
  assert.deepEqual(result.prefetches, []);
});

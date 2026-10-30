import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as assets from "../../lib/product-brand-assets.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(resolve(root, "package.json"));
const ts = require("typescript"), React = require("react"), { renderToStaticMarkup } = require("react-dom/server");
const source = readFileSync(resolve(root, "components/BrandIcon.tsx"), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
const loaded = { exports: {} as Record<string, unknown> };
new Function("require", "module", "exports", outputText)((name: string) => name === "../lib/product-brand-assets" ? assets : require(name), loaded, loaded.exports);
const render = (props: Record<string, unknown>) => renderToStaticMarkup(React.createElement(loaded.exports.default, props));

test("admin product identity reuses reviewed local thumbnails instead of remote logo metadata", () => {
  const approved = assets.getApprovedLocalBrandAsset("chatgpt");
  assert.ok(approved);
  const html = render({ appearance: "admin", size: "sm", product: { slug: "chatgpt", name: "ChatGPT", logoUrl: "https://unreviewed.invalid/icon.png" } });
  assert.ok(html.includes(assets.getOptimizedBrandAssetPath(approved)));
  assert.match(html, /data-brand-source="approved-local"/);
  assert.doesNotMatch(html, /unreviewed|api\/product-logos/);
  assert.match(html, /loading="lazy"/);
});

test("unknown products retain a deterministic neutral identifier without requesting a remote image", () => {
  const html = render({ appearance: "admin", product: { slug: "qa-unregistered-brand", name: "Unknown Service", logoUrl: "https://unreviewed.invalid/icon.png" } });
  assert.match(html, /data-brand-source="neutral"/);
  assert.match(html, />US<\/span>/);
  assert.doesNotMatch(html, /<img|https?:/);
});

test("admin fallback glyphs follow the readable theme text color while public glyphs retain brand color", () => {
  const slug = Object.keys(assets.simpleIconCandidates).find(key => !assets.getApprovedLocalBrandAsset(key));
  assert.ok(slug, "A fallback-only brand is required for this policy test");
  const admin = render({ appearance: "admin", product: { slug, name: "Fallback brand" } });
  const publicIcon = render({ product: { slug, name: "Fallback brand" } });
  assert.match(admin, /data-brand-source="simple-icons"/);
  assert.match(admin, /fill="currentColor"/);
  assert.doesNotMatch(publicIcon, /fill="currentColor"/);
  assert.match(publicIcon, /fill="#[a-fA-F0-9]{6}"/);
});

test("a failed local image switches to neutral content while keeping the reserved icon dimensions", () => {
  let failed = false;
  const isolated = { exports: {} as Record<string, unknown> };
  const controlledReact = { ...React, useState: () => [failed, (next: boolean) => { failed = next; }] };
  new Function("require", "module", "exports", outputText)((name: string) => name === "react" ? controlledReact : name === "../lib/product-brand-assets" ? assets : require(name), isolated, isolated.exports);
  const view = isolated.exports.default as (props: Record<string, unknown>) => { props: Record<string, unknown> };
  const props = { product: { slug: "chatgpt", name: "ChatGPT" }, appearance: "admin", size: "sm" };
  const before = view(props);
  const image = before.props.children as { props: { onError: () => void } };
  image.props.onError();
  assert.equal(failed, true);
  const after = view(props);
  assert.equal(before.props.className, after.props.className);
  assert.equal(after.props["data-brand-source"], "neutral");
  const html = renderToStaticMarkup(after);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, />C<\/span>/);
});

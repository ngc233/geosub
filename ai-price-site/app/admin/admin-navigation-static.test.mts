import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const adminDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(adminDir, "../..");

function readProjectFile(fileName: string) {
  return readFileSync(resolve(projectRoot, fileName), "utf8");
}

test("admin sidebar exposes only operational modules", () => {
  const source = readProjectFile("components/admin/AdminSidebar.tsx");

  for (const href of [
    "/admin/system",
    "/admin/pipeline",
    "/admin/discovery",
    "/admin/data-quality",
    "/admin/review",
    "/admin/prices",
    "/admin/affordability",
    "/admin/products",
    "/admin/plans",
    "/admin/articles",
    "/admin/seo",
    "/admin/navigation",
  ]) {
    assert.match(source, new RegExp(href.replaceAll("/", "\\/")));
  }

  assert.doesNotMatch(source, /\/admin\/commercial/);
  assert.doesNotMatch(source, /\/admin\/pricing-preview/);
  assert.doesNotMatch(source, /\/admin\/affordability-preview/);
});

test("admin dashboard does not link to placeholder modules", () => {
  const source = readProjectFile("app/admin/page.tsx");

  assert.doesNotMatch(source, /\/admin\/commercial/);
  assert.doesNotMatch(source, /商业设置/);
  assert.match(source, /\/admin\/products/);
  assert.match(source, /\/admin\/review/);
  assert.match(source, /\/admin\/seo/);
});

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const adminDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(adminDir, "../..");

function readProjectFile(fileName: string) {
  return readFileSync(resolve(projectRoot, fileName), "utf8");
}

function readAdminDashboardSource() {
  return [
    "app/admin/page.tsx",
    "app/admin/queries.ts",
    "app/admin/DashboardComponents.tsx",
    "app/admin/dashboard-formatters.ts",
  ]
    .map(readProjectFile)
    .join("\n");
}

function listTsxFiles(directory: string): string[] {
  return readdirSync(resolve(projectRoot, directory), { withFileTypes: true })
    .flatMap((entry) => {
      const fileName = `${directory}/${entry.name}`;

      if (entry.isDirectory()) {
        return listTsxFiles(fileName);
      }

      return entry.isFile() && entry.name.endsWith(".tsx") ? [fileName] : [];
    });
}

test("shared admin primitives use current compact radius tokens", () => {
  const files = [
    "components/admin/AdminButton.tsx",
    "components/admin/AdminCard.tsx",
    "components/admin/AdminInput.tsx",
    "components/admin/AdminSelect.tsx",
    "components/admin/AdminTable.tsx",
    "components/admin/AdminAlert.tsx",
    "components/admin/AdminCheckbox.tsx",
    "components/admin/AdminPipelineSteps.tsx",
    "app/admin/discovery/DiscoveryIntakeForms.tsx",
  ];

  for (const fileName of files) {
    const source = readProjectFile(fileName);
    assert.doesNotMatch(source, /rounded-3xl/, `${fileName} should not use oversized rounded-3xl`);
    assert.doesNotMatch(source, /rounded-\[28px\]/, `${fileName} should not use legacy custom radius`);
  }

  assert.match(readProjectFile("components/admin/AdminButton.tsx"), /rounded-lg/);
  assert.match(readProjectFile("components/admin/AdminInput.tsx"), /rounded-lg/);
  assert.match(readProjectFile("components/admin/AdminSelect.tsx"), /rounded-lg/);
  assert.match(readProjectFile("components/admin/AdminCard.tsx"), /rounded-xl/);
  assert.match(readProjectFile("components/admin/AdminTable.tsx"), /rounded-xl/);
});
test("all admin surfaces reject legacy oversized radius tokens", () => {
  const files = [
    ...listTsxFiles("app/admin"),
    ...listTsxFiles("app/admin-login"),
    ...listTsxFiles("components/admin"),
  ];

  for (const fileName of files) {
    const source = readProjectFile(fileName);
    assert.doesNotMatch(source, /rounded-(?:2xl|3xl)/, `${fileName} should use the compact admin radius system`);
    assert.doesNotMatch(source, /rounded-\[(?:2[0-9]|3[0-9])px\]/, `${fileName} should not restore custom oversized radii`);
  }
});

test("admin destinations do not prefetch database-heavy pages", () => {
  const files = [
    ...listTsxFiles("app/admin"),
    ...listTsxFiles("components/admin"),
  ];
  const adminLink = readProjectFile("components/admin/AdminLink.tsx");
  const sidebar = readProjectFile("components/admin/AdminSidebar.tsx");
  const dashboard = readAdminDashboardSource();
  const loading = readProjectFile("app/admin/loading.tsx");

  assert.match(adminLink, /prefetch=\{false\}/);
  assert.match(adminLink, /prefetchOnIntent/);
  assert.match(adminLink, /router\.prefetch/);
  assert.match(adminLink, /data-admin-navigation-progress/);
  assert.match(adminLink, /aria-busy=\{isNavigating \|\| undefined\}/);
  assert.match(sidebar, /"\/admin\/settings"/);
  assert.match(sidebar, /prefetchOnIntent=/);
  assert.match(dashboard, /<SegmentedControl[\s\S]*?prefetch=\{false\}/);
  assert.match(loading, /aria-busy="true"/);

  for (const fileName of files) {
    if (fileName.endsWith("components/admin/AdminLink.tsx")) continue;

    const source = readProjectFile(fileName);
    assert.doesNotMatch(
      source,
      /from ["']next\/link["']/,
      `${fileName} should use the no-prefetch admin link`,
    );
  }
});

test("primary admin actions use the shared button system", () => {
  const button = readProjectFile("components/admin/AdminButton.tsx");
  const products = readProjectFile("app/admin/products/page.tsx");
  const settings = readProjectFile("app/admin/settings/page.tsx");
  const pipeline = readProjectFile("app/admin/pipeline/page.tsx");

  assert.match(button, /h-9 px-3 text-xs/);
  assert.match(button, /h-10 px-4 text-sm/);
  assert.match(products, /AdminLinkButton/);
  assert.doesNotMatch(products, /bg-slate-950/);
  assert.match(settings, /<AdminButton type="submit">/);
  assert.match(pipeline, /<AdminButton type="submit">/);
});

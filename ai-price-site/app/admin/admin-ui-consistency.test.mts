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
    "app/admin/TrendChart.tsx",
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
  assert.doesNotMatch(adminLink, /data-admin-navigation-progress/);
  assert.doesNotMatch(adminLink, /aria-busy=\{isNavigating \|\| undefined\}/);
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

test("affected admin surfaces provide complete dark-mode counterparts", () => {
  const files = [
    "app/admin/layout.tsx",
    "app/admin/page.tsx",
    "app/admin/DashboardComponents.tsx",
    "app/admin/TrendChart.tsx",
    "app/admin/dashboard-formatters.ts",
    "app/admin/data-quality/DataQualityOverview.tsx",
    "app/admin/data-quality/model.ts",
    "app/admin/review/ManualCollectionProgressForm.tsx",
    "components/admin/AdminBadge.tsx",
    "components/admin/AdminButton.tsx",
    "components/admin/AdminMetricCard.tsx",
    "components/admin/AdminSidebar.tsx",
    "components/admin/AdminTable.tsx",
    "app/admin/search-demand/AuthorityCoverageSection.tsx",
    "app/admin/search-demand/ConversionRepairSections.tsx",
    "app/admin/search-demand/SearchConversionSections.tsx",
    "app/admin/search-demand/SearchEvidenceSections.tsx",
    "app/admin/search-demand/SearchGrowthPrioritySection.tsx",
    "app/admin/search-demand/SearchOpportunityWorkflowSections.tsx",
    "lib/admin-operational-status.ts",
  ];
  const neutralLightTokens =
    /(?:bg-white(?:\/\d+)?|bg-slate-(?:50|100|200|300)|text-slate-(?:400|500|600|700|800|900|950)|border-slate-(?:100|200|300)|ring-slate-(?:100|200|300))/;

  for (const fileName of files) {
    const source = readProjectFile(fileName);
    assert.match(source, /dark:/, `${fileName} should include dark-mode styling`);

    for (const [index, line] of source.split("\n").entries()) {
      if (!neutralLightTokens.test(line)) continue;
      assert.match(
        line,
        /dark:/,
        `${fileName}:${index + 1} needs a dark-mode counterpart`,
      );
    }
  }

  const sidebar = readProjectFile("components/admin/AdminSidebar.tsx");
  const overview = readProjectFile("app/admin/data-quality/DataQualityOverview.tsx");
  const dashboard = readAdminDashboardSource();
  const dashboardComponents = readProjectFile("app/admin/DashboardComponents.tsx");
  const adminCard = readProjectFile("components/admin/AdminCard.tsx");
  const adminButton = readProjectFile("components/admin/AdminButton.tsx");
  const trendChart = readProjectFile("app/admin/TrendChart.tsx");

  assert.doesNotMatch(
    adminCard,
    /"min-w-0 rounded-xl[^"\n]*dark:bg-slate-900/,
    "generic AdminCard must stay light until all legacy consumers are migrated",
  );
  assert.match(dashboardComponents, /<AdminCard className="[^"]*dark:bg-slate-900/);
  assert.match(overview, /<AdminCard className="[^"]*dark:bg-slate-900/);
  assert.match(dashboardComponents, /text-blue-700 dark:text-blue-300/);
  assert.match(adminButton, /focus:ring-blue-600/);
  assert.match(adminButton, /dark:focus:ring-blue-400\/60/);
  assert.equal(
    trendChart.match(/dark:focus-within:ring-blue-400\/60/g)?.length,
    2,
    "both dashboard trend controls need a visible dark focus ring",
  );
  assert.doesNotMatch(trendChart, /dark:fill-slate-500/);
  assert.doesNotMatch(sidebar, /focus-visible:ring-blue-500\/60/);
  assert.doesNotMatch(dashboard, /dark:text-slate-500/);
  assert.doesNotMatch(overview, /dark:text-slate-500/);
  assert.doesNotMatch(sidebar, /dark:text-slate-500/);
  assert.match(overview, /health\.reasonDetail \? "line-clamp-3" : ""/);
  assert.match(sidebar, /dark:hover:bg-slate-800/);
  assert.match(sidebar, /focus-visible:ring-2/);
  assert.match(sidebar, /mobileMenuButtonRef\.current\?\.focus\(\)/);
  assert.match(overview, /dark:hover:bg-blue-950\/60/);
  assert.match(overview, /focus-visible:ring-2/);
});

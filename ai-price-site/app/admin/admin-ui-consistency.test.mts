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
    "app/admin/LegacyDashboard.tsx",
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

test("token-migrated admin surfaces use admin tokens instead of raw neutral classes", () => {
  const globals = readProjectFile("app/globals.css");
  for (const token of ["canvas", "surface", "border", "text", "text-muted", "accent", "shadow"]) {
    assert.match(globals, new RegExp(`--color-admin-${token}: var\\(--admin-${token}\\)`));
  }
  // Dark values must follow the same selection as the custom dark variant.
  assert.match(globals, /@media \(prefers-color-scheme: dark\) \{\n  \[data-admin-theme\]:not\(\[data-admin-theme="light"\]\) \{/);
  assert.match(globals, /\[data-admin-theme="dark"\] \{\n  --admin-canvas: #0e1014;/);
  for (const token of ["accent-soft", "success-soft", "warning-soft", "danger-soft"]) {
    assert.match(globals, new RegExp(`--color-admin-${token}: var\\(--admin-${token}\\)`));
  }
  assert.match(globals, /--radius-admin-card: 16px;/);

  const migrated = [
    "app/admin/layout.tsx",
    "components/admin/AdminCard.tsx",
    "components/admin/AdminTable.tsx",
    "components/admin/AdminInput.tsx",
    "components/admin/AdminDataTable.tsx",
    "components/admin/AdminFilterBar.tsx",
    "components/admin/AdminBulkActionBar.tsx",
    "components/admin/AdminSelectAll.tsx",
    "components/admin/AdminTopBar.tsx",
  ];
  // Base (unprefixed) neutral color utilities; state variants may still use the palette.
  // text-white stays allowed for text on filled accent backgrounds.
  const rawNeutral = /(?<![:\w-])(?:(?:bg|border|divide)-white|(?:bg|text|border|divide)-(?:slate|gray|zinc)-\d{2,3})\b/;
  for (const fileName of migrated) {
    for (const [index, line] of readProjectFile(fileName).split("\n").entries()) {
      assert.doesNotMatch(line, rawNeutral, `${fileName}:${index + 1} should use an admin token`);
    }
  }
});

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
  assert.match(readProjectFile("components/admin/AdminInput.tsx"), /adminControlClassName/);
  assert.match(readProjectFile("components/admin/admin-control.ts"), /rounded-lg/);
  assert.match(readProjectFile("components/admin/AdminSelect.tsx"), /adminControlClassName/);
  assert.match(readProjectFile("components/admin/AdminCard.tsx"), /rounded-admin-card/);
  assert.match(readProjectFile("components/admin/AdminTable.tsx"), /rounded-admin-card/);
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

test("admin lists stay click-only while navigation prefetches only its loading boundary", () => {
  const files = [
    ...listTsxFiles("app/admin"),
    ...listTsxFiles("components/admin"),
  ];
  const adminLink = readProjectFile("components/admin/AdminLink.tsx");
  const sidebar = readProjectFile("components/admin/AdminSidebar.tsx");
  const dashboard = readAdminDashboardSource();
  const loading = readProjectFile("app/admin/loading.tsx");

  assert.match(adminLink, /prefetch = false/);
  assert.match(adminLink, /prefetch=\{prefetch\}/);
  assert.match(adminLink, /prefetchOnIntent/);
  assert.match(adminLink, /router\.prefetch/);
  assert.doesNotMatch(adminLink, /data-admin-navigation-progress/);
  assert.doesNotMatch(adminLink, /aria-busy=\{isNavigating \|\| undefined\}/);
  assert.match(sidebar, /"\/admin\/settings"/);
  assert.match(sidebar, /prefetch="auto"/);
  assert.doesNotMatch(sidebar, /prefetch=\{true\}|prefetchOnIntent=/);
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
  assert.match(button, /h-11 px-4 text-sm/);
  assert.match(products, /AdminLinkButton/);
  assert.doesNotMatch(products, /bg-slate-950/);
  assert.match(settings, /<AdminButton type="submit">/);
  assert.match(pipeline, /<AdminFilterBar\b/);
  assert.match(readProjectFile("components/admin/AdminFilterBar.tsx"), /adminButtonClassName\(\{ variant: "primary" \}\)/);
});

test("affected admin surfaces provide complete dark-mode counterparts", () => {
  const files = [
    "app/admin/layout.tsx",
    "app/admin/LegacyDashboard.tsx",
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
    // Admin tokens (app/globals.css) carry their own dark values.
    assert.match(source, /dark:|\b(?:bg|text|border)-admin-/, `${fileName} should include dark-mode styling`);

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

  assert.match(
    adminCard,
    /"min-w-0 rounded-admin-card[^"\n]*bg-admin-surface/,
    "shared cards provide token surfaces with light and dark values",
  );
  assert.match(dashboardComponents, /<AdminCard className="[^"]*dark:bg-admin-surface/);
  assert.match(overview, /<AdminCard className="[^"]*dark:bg-admin-surface/);
  assert.match(dashboardComponents, /text-blue-700 dark:text-blue-300/);
  assert.match(adminButton, /focus:ring-admin-accent\/30/);
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
  assert.match(sidebar, /hover:bg-admin-surface-subtle/, "sidebar hover uses a token with a dark value");
  assert.match(sidebar, /focus-visible:ring-2/);
  assert.match(sidebar, /mobileMenuButtonRef\.current\?\.focus\(\)/);
  assert.match(overview, /adminButtonClassName/);
  assert.match(adminButton, /hover:bg-admin-surface-subtle/);
  assert.match(adminButton, /focus:ring-admin-accent\/30/);
});


test("admin page filters share the admin segmented control instead of the public-site style", () => {
  for (const fileName of listTsxFiles("app/admin")) {
    assert.doesNotMatch(readProjectFile(fileName), /components\/ui\/SegmentedControl/, `${fileName} must use the admin control`);
  }
  for (const fileName of ["app/admin/Workspace.tsx", "app/admin/analytics/TrafficDashboard.tsx", "app/admin/pipeline/page.tsx"]) {
    assert.match(readProjectFile(fileName), /<AdminSegmentedControl\b/, `${fileName} must share the admin filter treatment`);
  }
});


test("global form font inheritance excludes admin controls so shared typography can win", () => {
  const globals = readProjectFile("app/globals.css");
  assert.match(globals, /:where\(button, select, input, textarea\):not\(\[data-admin-theme\] \*\)\s*\{\s*font: inherit;/);
  assert.doesNotMatch(globals, /(?:^|\n)button,\nselect,\ninput,\ntextarea\s*\{\s*font: inherit;/);
  assert.match(readProjectFile("components/admin/admin-control.ts"), /text-sm font-normal/);
});

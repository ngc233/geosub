import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getLocaleRobotsPolicy,
  seoIndexableLocaleBudget,
  seoIndexableLocales,
  seoLocalePromotionRequirements,
  seoSitemapBudgets,
} from "../lib/seo-indexing-policy.ts";
import {
  indexableStaticGuidePaths,
  launchedMirroredStaticPaths,
  unreleasedPublicPaths,
} from "../lib/public-launch-routes.ts";
import {
  siteLocaleDefinitions,
  supportedSiteLocales,
} from "../lib/site-locale.ts";
import { getPricingLanguageAlternates } from "../lib/pricing-routes.ts";
import { getProductSeoGateMode } from "../lib/product-seo-indexing-policy.ts";

const siteDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = resolve(siteDir, "app");
const sitemapSource = readFileSync(resolve(appDir, "sitemap.ts"), "utf8");
const rootLayoutSource = readFileSync(resolve(appDir, "layout.tsx"), "utf8");
const converterSource = readFileSync(
  resolve(siteDir, "components", "CurrencyConverterPage.tsx"),
  "utf8",
);
const pricingDetailSource = readFileSync(
  resolve(siteDir, "components", "PricingDetailPage.tsx"),
  "utf8",
);
const literalPaths = [
  ...sitemapSource.matchAll(/route\("(\/[^"]+)"/g),
].map((match) => match[1]);

assert.ok(
  seoIndexableLocales.length <= seoIndexableLocaleBudget,
  `Indexable locale count ${seoIndexableLocales.length} exceeds budget ${seoIndexableLocaleBudget}.`,
);
assert.ok(
  supportedSiteLocales.length > seoIndexableLocales.length,
  "Accessible locales and SEO-promoted locales must remain separate.",
);
assert.doesNotMatch(
  sitemapSource,
  /supportedSiteLocales\.(?:map|flatMap)/,
  "Sitemap must use the SEO indexing policy instead of every accessible locale.",
);
assert.match(
  rootLayoutSource,
  /getLocaleRobotsPolicy\(locale\)/,
  "Root metadata must apply the locale indexing policy.",
);
assert.match(
  converterSource,
  /getLocaleRobotsPolicy\(locale\)/,
  "Currency converter metadata must apply the locale indexing policy.",
);
assert.equal(
  getProductSeoGateMode(undefined),
  "observe",
  "Product quality indexing must remain reversible by default.",
);
assert.match(
  sitemapSource,
  /getProductSitemapDecision/,
  "Sitemap must share the product quality indexing decision.",
);
assert.match(
  sitemapSource,
  /indexableStaticGuidePaths\.map/,
  "Sitemap must promote only the curated evergreen guide set.",
);
assert.match(
  pricingDetailSource,
  /getProductRobotsPolicy/,
  "Pricing metadata must share the product quality indexing decision.",
);
assert.match(
  converterSource,
  /pairLocales\.filter\(isSeoIndexableLocale\)/,
  "Currency-pair hreflang must exclude staged locales.",
);

for (const locale of seoIndexableLocales) {
  assert.ok(supportedSiteLocales.includes(locale));
  assert.ok(getPricingLanguageAlternates(locale, "ai"));
  assert.equal(getLocaleRobotsPolicy(locale).index, true);
}

for (const locale of supportedSiteLocales) {
  if (seoIndexableLocales.includes(locale as "zh" | "en")) continue;
  assert.deepEqual(getLocaleRobotsPolicy(locale), {
    index: false,
    follow: true,
  });
  assert.equal(
    getPricingLanguageAlternates(locale, "ai"),
    undefined,
    `${locale} must not emit pricing hreflang until promoted.`,
  );
}

for (const path of unreleasedPublicPaths) {
  assert.ok(
    !literalPaths.some((literalPath) => literalPath.endsWith(path)),
    `Unreleased route must stay out of the sitemap: ${path}`,
  );
}

for (const path of indexableStaticGuidePaths) {
  assert.ok(
    launchedMirroredStaticPaths.has(path),
    `Indexable guide must be available to hreflang: ${path}`,
  );
}

for (const relativePath of launchedMirroredStaticPaths) {
  for (const locale of seoIndexableLocales) {
    const localePath = siteLocaleDefinitions[locale].path;
    const routePath =
      relativePath === "/"
        ? resolve(appDir, localePath, "page.tsx")
        : resolve(appDir, localePath, `.${relativePath}`, "page.tsx");
    assert.ok(
      existsSync(routePath),
      `Promoted hreflang target has no route: /${localePath}${relativePath === "/" ? "" : relativePath}`,
    );
  }
}

for (const path of literalPaths) {
  const localePath = path.split("/")[1];
  assert.ok(
    seoIndexableLocales.some(
      (locale) => siteLocaleDefinitions[locale].path === localePath,
    ),
    `Sitemap literal is outside the indexing policy: ${path}`,
  );
  assert.ok(
    existsSync(resolve(appDir, `.${path}`, "page.tsx")),
    `Sitemap literal has no page route: ${path}`,
  );
}

const report = {
  accessibleLocales: supportedSiteLocales,
  indexableLocales: seoIndexableLocales,
  stagedLocales: supportedSiteLocales.filter(
    (locale) => !seoIndexableLocales.includes(locale as "zh" | "en"),
  ),
  indexableLocaleBudget: seoIndexableLocaleBudget,
  sitemapBudgets: seoSitemapBudgets,
  literalStaticSitemapRoutes: literalPaths.length,
  curatedGuideRoutes:
    indexableStaticGuidePaths.length * seoIndexableLocales.length,
  promotionRequirements: seoLocalePromotionRequirements,
};

console.log(JSON.stringify(report, null, 2));
console.log("SEO indexing policy check passed.");

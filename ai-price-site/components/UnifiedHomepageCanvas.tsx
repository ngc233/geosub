import Link from "next/link";
import HomepageRecentChanges from "./HomepageRecentChanges";
import PublicPriceNumber from "./PublicPriceNumber";
import HomepageCountryFlag from "./HomepageCountryFlag";
import HomepagePricing from "./HomepagePricing";
import PublicSearch from "./PublicSearch";
import PublicIcon from "./PublicIcon";
import { PublicComparisonBar } from "./PublicControls";
import { loadHomepagePriceChanges } from "../lib/cached-homepage-price-changes";
import { homepagePriceChanges } from "../lib/homepage-price-changes";
import { savingsLabel, savingsPercent } from "../lib/homepage-display";
import { loadComparablePrices } from "../lib/comparable-prices-data";
import { loadHomepageRepresentatives } from "../lib/homepage-representatives-data";
import { loadVerifiedPriceSource } from "../lib/cached-verified-price-source";
import {
  homepageStatistics,
  homepageCountries,
  homepageProducts,
  homepageDisplayRates,
  homepageDataFailure,
} from "../lib/homepage-summary";
import { homepageMap } from "../lib/homepage-map";
import { getHomepageCopy } from "../lib/homepage-copy";
import { formatPublicDate } from "../lib/public-date";
import { loadCoreGuideHubStates } from "../lib/core-guide-cms";
import { getCoreGuideDefinition } from "../lib/core-guide-content";
import {
  isHomepageFixtureEnabled,
  fictionalHomepageSource,
  fictionalPriceHistoryRecords,
} from "../lib/test-fixtures/homepage";
import { readGta6OfferSummary } from "../lib/read-game-offers";
import { isGta6NavigationPublished } from "../lib/site-navigation";
import { getLocalizedRegionName } from "../lib/locale-format";
import { canvasIntlLocale, canvasUiCopy, type CanvasLocale } from "../lib/canvas-ui-copy";

export default async function UnifiedHomepageCanvas({ locale }: { locale: CanvasLocale }) {
  const includeGames = locale === "zh";
  const [data, guides, changes, gameOffers, showGameCategory] = await Promise.all([
    Promise.all([
      loadComparablePrices(),
      loadHomepageRepresentatives(),
      isHomepageFixtureEnabled() ? Promise.resolve(fictionalHomepageSource()) : loadVerifiedPriceSource(),
    ]).catch(homepageDataFailure),
    loadCoreGuideHubStates(locale),
    isHomepageFixtureEnabled()
      ? Promise.resolve(homepagePriceChanges(fictionalPriceHistoryRecords(), new Date(), false, locale))
      : loadHomepagePriceChanges(),
    includeGames ? readGta6OfferSummary() : Promise.resolve({ offers: [], savings: null }),
    includeGames ? isGta6NavigationPublished().catch(() => false) : Promise.resolve(false),
  ]);

  const rows = data?.[0] ?? [];
  const products = homepageProducts(data?.[1] ?? [], locale);
  const stats = homepageStatistics(rows);
  const countries = homepageCountries(rows, locale);
  const updated = formatPublicDate(stats?.updatedAt, new Date(), locale);
  const copy = getHomepageCopy(locale);
  const ui = canvasUiCopy[locale];
  const intlLocale = canvasIntlLocale(locale);
  const articles = (["price-guide", "payment-account", "methodology"] as const).filter(
    (slug) => !guides.get(slug)?.managed || guides.get(slug)?.published,
  );

  return (
    <div className="gs-public-unified gs-home">
      <div className="gs-home-container">
        {isHomepageFixtureEnabled() && (
          <aside className="gs-home-test-data" role="note">
            {ui.home.fixtureBanner}
          </aside>
        )}
        <section data-gs-enter="a" className="gs-home-intro">
          <h1>
            {ui.home.heroLead}
            <span>{ui.home.heroAccent}</span>
          </h1>
          <p className="gs-home-description">
            {ui.home.heroDescLead}
            <strong>{ui.home.heroDescStrong}</strong>
            {ui.home.heroDescTail}
          </p>
          <PublicSearch variant="hero" locale={locale} />
          {stats && (
            <p className="gs-home-statistics" aria-label={ui.home.statsAria}>
              <span>
                <strong>
                  <PublicPriceNumber
                    value={stats.products}
                    locale={intlLocale}
                    fractionDigits={0}
                    initialValue={0}
                    changeKey="count-in"
                  />
                </strong>{" "}
                {ui.home.statsProducts}
              </span>
              <span>
                <strong>
                  <PublicPriceNumber
                    value={stats.regions}
                    locale={intlLocale}
                    fractionDigits={0}
                    initialValue={0}
                    changeKey="count-in"
                  />
                </strong>{" "}
                {ui.home.statsRegions}
              </span>
              <span>
                <strong>
                  <PublicPriceNumber
                    value={stats.prices}
                    locale={intlLocale}
                    fractionDigits={0}
                    initialValue={0}
                    changeKey="count-in"
                  />
                </strong>{" "}
                {ui.home.statsPrices}
              </span>
              {updated && (
                <span>
                  {locale === "en" ? (
                    <>
                      {ui.home.statsUpdatedSuffix} <time dateTime={updated.dateTime}>{updated.text}</time>
                    </>
                  ) : (
                    <>
                      <time dateTime={updated.dateTime}>{updated.text}</time>
                      {ui.home.statsUpdatedSuffix}
                    </>
                  )}
                </span>
              )}
            </p>
          )}
        </section>

        <HomepagePricing
          locale={locale}
          products={products}
          rates={homepageDisplayRates(data?.[2].rates ?? {})}
          map={homepageMap}
          recentChanges={changes.length ? <HomepageRecentChanges events={changes} locale={locale} /> : null}
          gameCategoryHref={includeGames && showGameCategory ? "/zh/games" : undefined}
          gameSavings={includeGames ? gameOffers.savings : null}
        />

        {!!countries.length && (
          <section data-gs-enter="a" className="gs-home-section" aria-labelledby="home-countries">
            <div className="gs-home-section-heading">
              <div>
                <h2 id="home-countries">{ui.home.countriesHeading}</h2>
                <p>{ui.home.countriesDesc}</p>
              </div>
              <Link href={`/${locale}/countries`}>
                {ui.home.countriesLink} <PublicIcon name="ArrowRight" size={16} />
              </Link>
            </div>
            <div className="gs-home-countries">
              {countries.slice(0, 6).map((country) => {
                const name = getLocalizedRegionName(country.code, locale) ?? country.code;
                const srText =
                  locale === "en"
                    ? country.median > 0
                      ? `Median savings: ${savingsPercent(country.median)}% cheaper than US`
                      : country.median === 0
                        ? "Median price matches the US baseline"
                        : `Median price is ${savingsPercent(country.median)}% higher than US`
                    : country.median > 0
                      ? `一半的订阅${savingsLabel(country.median).replace("低 ", "便宜约 ")}`
                      : country.median === 0
                        ? "订阅价格的中位水平与美国相同"
                        : `节省率中位数为负：${savingsLabel(country.median)}`;
                const body = (
                  <>
                    <span className="gs-home-country-code" aria-hidden="true">
                      <HomepageCountryFlag code={country.code} />
                    </span>
                    <h3 className="gs-home-country-name">{name}</h3>
                    <p className="gs-sr-only">{srText}</p>
                    <small className="gs-sr-only">
                      {ui.home.countriesSrSummary(country.count, country.cheaper)}
                    </small>
                    <PublicComparisonBar
                      hideValue
                      label={`${country.median > 0 ? "−" : country.median < 0 ? "+" : ""}${savingsPercent(country.median)}%`}
                      value={savingsPercent(country.median)}
                      maximum={20}
                      tone={country.median > 0 ? "low" : country.median < 0 ? "high" : "baseline"}
                    />
                  </>
                );
                return country.href ? (
                  <Link key={country.code} href={country.href} className="gs-home-country-card" data-gs-motion-card>
                    {body}
                  </Link>
                ) : (
                  <article key={country.code} className="gs-home-country-card">
                    {body}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {!!articles.length && (
          <section data-gs-enter="a" className="gs-home-section" aria-labelledby="home-guides">
            <h2 id="home-guides">{ui.home.guidesHeading}</h2>
            <div className="gs-home-guides">
              {articles.map((slug) => {
                const guide = getCoreGuideDefinition(locale, slug);
                return (
                  <Link key={slug} href={`/${locale}/guides/${slug}`} className="gs-home-card" data-gs-motion-card>
                    <span className="gs-home-guide-category">{guide.eyebrow}</span>
                    <h3>{guide.title}</h3>
                    <p>{guide.description}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <p className="gs-home-disclaimer">{copy.disclaimer}</p>
      </div>
    </div>
  );
}

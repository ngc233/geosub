import CountrySavingsMap from "../../../components/CountrySavingsMap";
import { CountryIndexPage } from "../../../components/PriceEvidencePages";
import { loadCountryHub } from "../../../lib/cached-country-hub";
import { loadComparablePrices } from "../../../lib/comparable-prices-data";
import { getCountryHubMetadata } from "../../../lib/country-hub-indexing";
import { homepageMap } from "../../../lib/homepage-map";
import { buildCountrySavingsViews } from "../../../lib/public-map-views";

export const revalidate = 1800;

export function generateMetadata() {
  return getCountryHubMetadata("zh-tw", null, loadCountryHub);
}

export default async function Page() {
  const rows = await loadComparablePrices().catch(() => []);
  const views = buildCountrySavingsViews(rows, "zh-tw");
  return (
    <CountryIndexPage
      locale="zh-tw"
      overviewMap={
        views.byCategory.all.length > 0 ? (
          <CountrySavingsMap map={homepageMap} views={views} locale="zh-tw" />
        ) : undefined
      }
    />
  );
}

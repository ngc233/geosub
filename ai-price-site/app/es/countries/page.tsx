import CountrySavingsMap from "../../../components/CountrySavingsMap";
import { CountryIndexPage } from "../../../components/PriceEvidencePages";
import { loadCountryHub } from "../../../lib/cached-country-hub";
import { loadComparablePrices } from "../../../lib/comparable-prices-data";
import { getCountryHubMetadata } from "../../../lib/country-hub-indexing";
import { homepageMap } from "../../../lib/homepage-map";
import { buildCountrySavingsViews } from "../../../lib/public-map-views";

export const revalidate = 1800;

export function generateMetadata() {
  return getCountryHubMetadata("es", null, loadCountryHub);
}

export default async function Page() {
  const rows = await loadComparablePrices().catch(() => []);
  const views = buildCountrySavingsViews(rows, "es");
  return (
    <CountryIndexPage
      locale="es"
      overviewMap={
        views.byCategory.all.length > 0 ? (
          <CountrySavingsMap map={homepageMap} views={views} locale="es" />
        ) : undefined
      }
    />
  );
}

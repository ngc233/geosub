import { CountryIndexPage } from "../../../components/PriceEvidencePages";
import { loadCountryHub } from "../../../lib/cached-country-hub";
import { getCountryHubMetadata } from "../../../lib/country-hub-indexing";
export const revalidate = 1800;
export function generateMetadata() { return getCountryHubMetadata("en", null, loadCountryHub); }
export default function Page() { return <CountryIndexPage locale="en" />; }

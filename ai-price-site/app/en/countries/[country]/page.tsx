import { CountryHubPage } from "../../../../components/PriceEvidencePages";
import { loadCountryHub } from "../../../../lib/cached-country-hub";
import { getCountryHubMetadata } from "../../../../lib/country-hub-indexing";
export const revalidate = 1800;
type Props = { params: Promise<{ country: string }> };
export async function generateMetadata({ params }: Props) {
  const { country } = await params;
  return getCountryHubMetadata("en", country, loadCountryHub);
}
export default async function Page({ params }: Props) {
  const { country } = await params;
  return <CountryHubPage locale="en" countrySlug={country} />;
}

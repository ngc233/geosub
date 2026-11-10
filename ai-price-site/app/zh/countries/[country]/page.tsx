import "../../../public-country.css";
import CountryCanvasPage from "../../../../components/CountryCanvasPage";
import { loadCountryHub } from "../../../../lib/cached-country-hub";
import { getCountryHubMetadata } from "../../../../lib/country-hub-indexing";
export const revalidate = 1800;
type Props = { params: Promise<{ country: string }> };
export async function generateMetadata({ params }: Props) {
  const { country } = await params;
  return getCountryHubMetadata("zh", country, loadCountryHub);
}
export default async function Page({ params }: Props) {
  const { country } = await params;
  return <CountryCanvasPage countrySlug={country} />;
}

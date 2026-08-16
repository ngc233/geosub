import CountryPricingPilotPage, {
  getCountryPricingPilotMetadata,
  type CountryPricingPilotPageProps,
} from "../../../../../../components/CountryPricingPilotPage";

export const revalidate = 1800;

export function generateMetadata(props: CountryPricingPilotPageProps) {
  return getCountryPricingPilotMetadata({ ...props, locale: "en", category: "ai" });
}

export default function Page(props: CountryPricingPilotPageProps) {
  return <CountryPricingPilotPage {...props} locale="en" category="ai" />;
}

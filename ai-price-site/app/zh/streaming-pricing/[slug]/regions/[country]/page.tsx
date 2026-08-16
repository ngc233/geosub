import CountryPricingPilotPage, {
  getCountryPricingPilotMetadata,
  type CountryPricingPilotPageProps,
} from "../../../../../../components/CountryPricingPilotPage";

export const revalidate = 1800;

export function generateMetadata(props: CountryPricingPilotPageProps) {
  return getCountryPricingPilotMetadata({
    ...props,
    locale: "zh",
    category: "streaming",
  });
}

export default function Page(props: CountryPricingPilotPageProps) {
  return (
    <CountryPricingPilotPage {...props} locale="zh" category="streaming" />
  );
}

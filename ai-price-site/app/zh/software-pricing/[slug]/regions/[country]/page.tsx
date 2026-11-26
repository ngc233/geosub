import "../../../../../public-product-country.css";
import CountryPricingPilotPage, {
  getCountryPricingPilotMetadata,
  type CountryPricingPilotPageProps,
} from "../../../../../../components/CountryPricingPilotPage";

export const revalidate = 1800;

export function generateMetadata(props: CountryPricingPilotPageProps) {
  return getCountryPricingPilotMetadata({
    ...props,
    locale: "zh",
    category: "software",
  });
}

export default function Page(props: CountryPricingPilotPageProps) {
  return <CountryPricingPilotPage {...props} locale="zh" category="software" />;
}

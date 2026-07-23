import type { Metadata } from "next";
import PublicGuidePage from "../../../../components/PublicGuidePage";

export const metadata: Metadata = {
  title: "Price Guide",
  description:
    "Learn how to read local prices, display currencies, exchange-rate dates, taxes and account restrictions in regional subscription comparisons.",
};

export default function EnglishPriceGuidePage() {
  return (
    <PublicGuidePage
      eyebrow="Price Guide"
      title="How to read regional subscription prices"
      description="A low-price ranking is only the starting point. Combine local price, exchange-rate date, tax and eligibility to understand the real cost."
      sections={[
        {
          title: "Start with the local price and collection date",
          body: "The local price is the amount displayed by the platform in that region. Check the plan name, monthly or annual billing cycle, and collection date before comparing records.",
        },
        {
          title: "Then check the display currency and rate date",
          body: "Converted prices support comparison; they are not a promise of the card charge. Exchange-rate movement can change the converted value without changing the local platform price.",
        },
        {
          title: "Confirm tax and purchase conditions",
          body: "Tax, account region, payment method and billing address may affect checkout. A lower regional price does not guarantee that your account can buy it.",
        },
      ]}
      note="GeoSub commonly uses the US price as a comparison baseline. Always confirm the final amount on the official regional checkout page."
    />
  );
}

import type { Metadata } from "next";
import PublicGuidePage from "../../../../components/PublicGuidePage";

export const metadata: Metadata = {
  title: "Payment and Account Guide",
  description:
    "Check service availability, account region, payment method, billing details and the final checkout amount before subscribing.",
};

export default function EnglishPaymentGuidePage() {
  return (
    <PublicGuidePage
      eyebrow="Payment & Account"
      title="Check account and payment conditions"
      description="Regional prices help compare cost, but purchase eligibility depends on local availability, account region and accepted payment details."
      sections={[
        {
          title: "Confirm the service and plan are locally available",
          body: "A service may operate in only some countries, and plan names or benefits can differ. Check the official app or checkout page for the exact plan in your region.",
        },
        {
          title: "Match account region and payment method",
          body: "Your Apple ID or service-account region, card country, billing address and payment currency may need to align. Do not submit false location or billing information.",
        },
        {
          title: "Treat checkout as the final cost",
          body: "Card conversion fees, platform exchange rates, tax and trial eligibility may appear only before payment. GeoSub conversions are comparisons, not charge guarantees.",
        },
      ]}
      note="Cross-region purchases may trigger platform controls or violate service terms. Follow the applicable account, payment and regional rules."
    />
  );
}

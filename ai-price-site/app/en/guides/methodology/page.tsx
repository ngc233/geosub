import type { Metadata } from "next";
import PublicGuidePage from "../../../../components/PublicGuidePage";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "Learn how GeoSub collects, checks and dates regional subscription prices before they appear in comparisons.",
};

export default function EnglishMethodologyPage() {
  return (
    <PublicGuidePage
      eyebrow="Methodology"
      title="How GeoSub checks subscription prices"
      description="Regional observations are matched to a plan, checked for currency and billing cycle, and published only when the result is comparable."
      sections={[
        {
          title: "Collect with the original context",
          body: "Each observation keeps the product, plan, country or region, original currency, billing cycle and collection time. The local platform price is never replaced by a converted estimate.",
        },
        {
          title: "Check identity, stability and range",
          body: "Plan matching, repeated observations and peer-region ranges help detect currency, decimal and billing-cycle errors. Inconsistent values are withheld rather than forced into a ranking.",
        },
        {
          title: "Publish dates with distinct meanings",
          body: "Collection date, exchange-rate date, plan-review date and page-update date are calculated separately. Readers can distinguish a platform price observation from a later currency conversion.",
        },
      ]}
      note="Published comparisons are informational. Platform availability, tax and the final checkout amount can still change after collection."
    />
  );
}

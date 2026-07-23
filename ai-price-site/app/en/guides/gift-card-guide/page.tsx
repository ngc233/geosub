import type { Metadata } from "next";
import PublicGuidePage from "../../../../components/PublicGuidePage";

export const metadata: Metadata = {
  title: "Gift Card Guide",
  description:
    "Check the issuing region, account compatibility, currency, value, redemption conditions and refund policy before buying a digital gift card.",
};

export default function EnglishGiftCardGuidePage() {
  return (
    <PublicGuidePage
      eyebrow="Gift Card Guide"
      title="Checks before buying a digital gift card"
      description="Gift cards are usually tied to a region and account. Confirm compatibility before comparing face value and purchase cost."
      sections={[
        {
          title: "Match the issuing region to the account",
          body: "Apple, Google, Steam and similar gift cards from one country usually cannot be redeemed in another. Confirm that the card region matches the account region.",
        },
        {
          title: "Check currency, value and expiry",
          body: "The same number can represent different currencies. Also review expiry, redemption limits, balance restrictions and whether the credit can fund subscriptions.",
        },
        {
          title: "Use a traceable seller",
          body: "Check the merchant, delivery method, refund policy and support channel. Be cautious with prices far below face value or codes of unclear origin.",
        },
      ]}
      note="Gift-card eligibility and refunds are controlled by the issuing platform and seller. Their official terms remain authoritative."
    />
  );
}

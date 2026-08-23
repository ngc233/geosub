import type { Metadata } from "next";
import LocalizedHomepagePage from "../../components/LocalizedHomepagePage";

export const metadata: Metadata = {
  title: "Global Digital Subscription Pricing",
  description: "Compare AI and streaming subscription prices across App Store regions, with selectable display currencies, tax notes, update dates and affordability context.",
};

export default function EnglishPage() {
  return <LocalizedHomepagePage locale="en" />;
}

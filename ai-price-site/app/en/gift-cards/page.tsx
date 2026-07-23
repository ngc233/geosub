import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { guardUnreleasedPublicPage } from "../../../lib/public-page-guard";

export const metadata: Metadata = {
  title: "Digital Gift Card Prices",
  robots: { index: false, follow: false },
};

export default function GiftCardPricesPage() {
  guardUnreleasedPublicPage();
  notFound();
}

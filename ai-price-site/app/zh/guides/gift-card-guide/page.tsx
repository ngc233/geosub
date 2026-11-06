import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  alternates: { canonical: null, languages: {} },
};

export default function RetiredGiftCardGuidePage() {
  notFound();
}

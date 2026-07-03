import type { Metadata } from "next";
import { ProductCategory } from "@prisma/client";
import DbAiPricingClient from "../../../components/DbAiPricingClient";
import { getDbAiPricingProducts } from "../../../lib/db-ai-pricing";

export const metadata: Metadata = {
  title: "Streaming Subscription Pricing - Netflix, YouTube Premium, Spotify - GeoSub",
  description:
    "Compare Netflix, YouTube Premium, Spotify, Disney+ and other streaming subscription prices across countries and regions.",
};

export default async function EnglishStreamingPricingPage() {
  const products = await getDbAiPricingProducts({
    locale: "en",
    categories: [ProductCategory.STREAMING],
  });

  return (
    <main className="mx-auto max-w-7xl overflow-visible px-6 py-16">
      <div className="mb-10 text-center">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
          GeoSub Streaming Pricing Data
        </p>

        <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-zinc-950 md:text-5xl dark:text-white">
          Streaming Subscription Pricing
        </h1>

        <p className="mx-auto max-w-2xl text-base leading-7 text-zinc-500 dark:text-zinc-400">
          Compare Netflix, YouTube Premium, Spotify, Disney+ and other streaming services across countries and regions. More products will be opened after data coverage improves.
        </p>
      </div>

      <DbAiPricingClient products={products} locale="en" />
    </main>
  );
}

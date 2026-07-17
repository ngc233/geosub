import type { Metadata } from "next";
import { ProductCategory } from "@prisma/client";
import DbAiPricingClient from "../../../components/DbAiPricingClient";
import { getDbAiPricingProducts } from "../../../lib/db-ai-pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Subscription Pricing - ChatGPT, Claude, Gemini Global Prices",
  description:
    "Compare ChatGPT, Claude, Gemini and other AI subscription prices across countries and regions, including App Store prices, USD equivalents, tax notes and regional price differences.",
};

export default async function EnglishAiPricingPage() {
  const products = await getDbAiPricingProducts({
    locale: "en",
    categories: [ProductCategory.AI],
  });

  return (
    <main className="mx-auto max-w-7xl overflow-visible px-6 py-16">
      <div className="mb-10 text-center">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
          GeoSub AI Pricing Data
        </p>

        <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-zinc-950 md:text-5xl dark:text-white">
          AI Subscription Pricing
        </h1>

        <p className="mx-auto max-w-2xl text-base leading-7 text-zinc-500 dark:text-zinc-400">
          Compare ChatGPT, Claude, Gemini and other AI tools across countries and regions, including local prices, USD equivalents, tax notes and regional price differences.
        </p>
      </div>

      <DbAiPricingClient products={products} locale="en" />
    </main>
  );
}

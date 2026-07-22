import { ProductCategory } from "@prisma/client";
import DbAiPricingClient from "../../../components/DbAiPricingClient";
import { getDbAiPricingProducts } from "../../../lib/db-ai-pricing";
import { getPublicPricingCopy } from "../../../lib/public-pricing-copy";
import { getPricingListMetadata } from "../../../lib/pricing-list-seo";

export const dynamic = "force-dynamic";

export const metadata = getPricingListMetadata("en", "ai");

export default async function EnglishAiPricingPage() {
  const products = await getDbAiPricingProducts({
    locale: "en",
    categories: [ProductCategory.AI],
  });
  const copy = getPublicPricingCopy("en").listing.pages.ai;

  return (
    <main className="mx-auto max-w-7xl overflow-visible px-6 py-16">
      <div className="mb-10 text-center">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
          {copy.eyebrow}
        </p>

        <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-zinc-950 md:text-5xl dark:text-white">
          {copy.title}
        </h1>

        <p className="mx-auto max-w-2xl text-base leading-7 text-zinc-500 dark:text-zinc-400">
          {copy.description}
        </p>
      </div>

      <DbAiPricingClient products={products} locale="en" />
    </main>
  );
}

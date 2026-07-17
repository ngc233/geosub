import type { Metadata } from "next";

import { guardUnreleasedPublicPage } from "../../../lib/public-page-guard";

export const metadata: Metadata = {
  title: "Digital Gift Card Prices",
  description: "Compare Apple, Google Play, Steam, Xbox, PlayStation, Nintendo, and other digital gift cards across regions.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function EnglishPage() {
  guardUnreleasedPublicPage();

  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
            Gift Cards
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
            Digital Gift Card Prices
          </h1>

          <p className="mt-5 text-lg leading-8 text-zinc-600">
            Compare Apple, Google Play, Steam, Xbox, PlayStation, Nintendo, and other digital gift cards across regions.
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm shadow-zinc-950/[0.03]">
          <h2 className="text-xl font-black text-zinc-950">
            Page framework ready
          </h2>

          <p className="mt-3 text-sm leading-7 text-zinc-600">
            This section will organize gift card prices, supported regions, redemption limits, currency differences, and platform policy notes.
          </p>

          <p className="mt-5 text-sm leading-7 text-zinc-500">
            This is a basic English page framework. Detailed data modules, comparison tables, filters, and SEO content can be added later.
          </p>
        </div>
      </section>
    </main>
  );
}

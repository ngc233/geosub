import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Global Digital Subscription Pricing - GeoSub",
  description: "Compare AI subscriptions, software subscriptions, gaming services, gift cards, and digital tools across countries and regions.",
};

export default function EnglishPage() {
  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
            GeoSub
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
            Global Digital Subscription Pricing
          </h1>

          <p className="mt-5 text-lg leading-8 text-zinc-600">
            Compare AI subscriptions, software subscriptions, gaming services, gift cards, and digital tools across countries and regions.
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm shadow-zinc-950/[0.03]">
          <h2 className="text-xl font-black text-zinc-950">
            Page framework ready
          </h2>

          <p className="mt-3 text-sm leading-7 text-zinc-600">
            GeoSub helps users understand regional pricing differences, subscription availability, currency impact, and platform policy changes across global digital services.
          </p>

          <p className="mt-5 text-sm leading-7 text-zinc-500">
            This is a basic English page framework. Detailed data modules, comparison tables, filters, and SEO content can be added later.
          </p>
        </div>
      </section>
    </main>
  );
}
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About GeoSub",
  description: "GeoSub is a global digital subscription pricing platform focused on AI subscriptions, software subscriptions, gaming services, gift cards, and digital tools.",
};

export default function EnglishTrustPage() {
  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
          About GeoSub
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
          About GeoSub
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-600">
          GeoSub is a global digital subscription pricing platform focused on AI subscriptions, software subscriptions, gaming services, gift cards, and digital tools.
        </p>

        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm shadow-zinc-950/[0.03]">
          <h2 className="text-xl font-black text-zinc-950">
            Overview
          </h2>

          <p className="mt-4 text-sm leading-8 text-zinc-600">
            Our goal is to make regional subscription prices easier to compare, understand, and track across countries, currencies, and platforms.
          </p>

          <p className="mt-6 text-sm leading-8 text-zinc-500">
            GeoSub presents reviewed App Store regional prices alongside exchange-rate dates, tax notes, price confidence and subscription risk. Data from different sources is labelled and compared separately rather than mixed into one ranking.
          </p>
        </div>
      </section>
    </main>
  );
}

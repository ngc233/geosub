import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About GeoSub",
  description: "GeoSub compares public AI and streaming subscription prices across countries, with exchange rates, tax notes, update dates and affordability context.",
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
          GeoSub compares public AI and streaming subscription prices across countries, with exchange rates, tax notes, update dates and affordability context.
        </p>

        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm shadow-zinc-950/[0.03]">
          <h2 className="text-xl font-black text-zinc-950">
            The problem we solve
          </h2>

          <p className="mt-4 text-sm leading-8 text-zinc-600">
            We organize App Store subscription prices across countries and currencies so regional differences, plan changes and subscription choices are easier to compare and understand.
          </p>

          <p className="mt-6 text-sm leading-8 text-zinc-500">
            Each price keeps its local currency, collection date and exchange-rate basis. Pages use regional prices that pass consistency checks and remind readers to confirm account region, payment method, tax and the official checkout amount.
          </p>
        </div>
      </section>
    </main>
  );
}

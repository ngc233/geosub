import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Sources and Pricing Methodology",
  description:
    "Learn how GeoSub compares reviewed App Store regional subscription prices and presents exchange-rate dates, tax notes and data confidence.",
};

const sourceLayers = [
  {
    title: "Price data",
    badge: "App Store",
    items: [
      "Public App Store subscription prices across supported regions",
      "Structured product, plan, country and currency records",
      "Only reviewed observations are published to public rankings",
    ],
  },
  {
    title: "Conversion and comparison",
    badge: "Regularly updated",
    items: [
      "Regional prices converted into the selected display currency",
      "Regional tax notes and data-confidence status",
      "US baseline comparison, price spread and subscription risk notes",
    ],
  },
  {
    title: "Reading the figures",
    badge: "Checkout prevails",
    items: [
      "Local list prices and converted prices are shown separately",
      "Collection, exchange-rate and plan-review dates are labelled separately",
      "Account region, payment method and tax may affect the final charge",
    ],
  },
];

const qualityRules = [
  "Each plan is checked by original currency, billing cycle, region and USD equivalent.",
  "Prices far outside the usual range, with suspected currency errors or mismatched billing cycles, are withheld and checked again.",
  "Regional rankings use only prices that pass checks and can be compared with the same plan.",
  "Tax notes are informational and are not added again to ranking prices. Final checkout prices remain the source of truth.",
];

export default function EnglishDataSourcesPage() {
  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
          Data Sources
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
          Data Sources and Pricing Methodology
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-600">
          GeoSub compares public App Store regional subscription prices for the same plan and billing cycle, while preserving the local currency, collection date and exchange-rate basis.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {sourceLayers.map((layer) => (
            <section
              key={layer.title}
              className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-950/[0.03]"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-zinc-950">{layer.title}</h2>
                <span className="rounded-full bg-lime-50 px-2.5 py-1 text-xs font-bold text-lime-700 ring-1 ring-lime-200">
                  {layer.badge}
                </span>
              </div>

              <ul className="mt-5 space-y-3 text-sm leading-6 text-zinc-600">
                {layer.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lime-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm shadow-zinc-950/[0.03]">
          <h2 className="text-xl font-black text-zinc-950">How to read the data</h2>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-4 text-sm leading-8 text-zinc-600">
              <p>
                Regional rankings compare the same App Store plan and billing cycle. Local list prices and converted prices are both retained so exchange-rate movement is not mistaken for a platform price change.
              </p>

              <p>
                Exchange rates convert local prices into the display currency selected by the reader. Reference rates normally synchronize every 12 hours. The applicable rate date is shown, and conversion pauses when a required rate is missing or stale.
              </p>

              <p>
                Tax notes come from the regional tax rules collected for GeoSub. We do not add tax again on top of App Store ranking prices, because platform prices often already include regional pricing behavior. Final payment pages remain the source of truth.
              </p>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-5 ring-1 ring-zinc-100">
              <h3 className="text-sm font-black text-zinc-950">Quality controls</h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-600">
                {qualityRules.map((rule) => (
                  <li key={rule} className="flex gap-2">
                    <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-lime-700 ring-1 ring-lime-200">
                      ✓
                    </span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <p className="mt-6 max-w-4xl text-sm leading-7 text-zinc-500">
          Note: GeoSub shows public price differences for comparison. It does not encourage bypassing platform rules. Cross-region subscriptions may be affected by account region, payment method, billing information, tax and platform risk controls.
        </p>
      </section>
    </main>
  );
}

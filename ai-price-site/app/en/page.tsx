import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Global Digital Subscription Pricing",
  description:
    "Compare AI and streaming subscription prices across App Store regions, with USD conversion, CNY estimates, tax notes, and purchasing-power context.",
};

const sections = [
  {
    title: "AI Subscriptions",
    desc: "Compare ChatGPT, Claude, Gemini, Grok and other AI subscription prices by country and region.",
    href: "/en/ai-pricing/",
    tag: "AI",
  },
  {
    title: "Streaming",
    desc: "Compare Netflix, YouTube Premium, Spotify, Disney+ and other streaming subscription prices.",
    href: "/en/streaming-pricing/",
    tag: "Streaming",
  },
  {
    title: "Data Sources",
    desc: "Review GeoSub's official data policy, App Store source priority, exchange rates, tax notes and review rules.",
    href: "/en/data-sources/",
    tag: "Data",
  },
  {
    title: "Guides",
    desc: "Read regional pricing, payment, account, methodology and subscription decision guides.",
    href: "/en/guides/",
    tag: "Guides",
  },
];

export default function EnglishPage() {
  return (
    <main className="min-h-screen bg-[#faf8f2]">
      <section className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-lime-600">
            Global Digital Subscription Pricing
          </p>

          <h1 className="mt-5 text-4xl font-black tracking-tight text-zinc-950 md:text-6xl">
            Global Digital Subscription Pricing
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-zinc-600 md:text-lg">
            GeoSub currently focuses on AI and streaming App Store regional prices, with USD conversion, CNY estimates, tax notes and purchasing-power context.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {sections.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-xl border border-zinc-200 bg-white p-7 shadow-sm shadow-zinc-950/[0.03] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-lime-200 hover:bg-lime-50/40 hover:shadow-md hover:shadow-lime-900/[0.06]"
            >
              <div className="mb-5 inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-500 transition duration-200 ease-out group-hover:bg-lime-100 group-hover:text-lime-700">
                {item.tag}
              </div>

              <h2 className="text-2xl font-black tracking-tight text-zinc-950">
                {item.title}
              </h2>

              <p className="mt-3 min-h-[72px] text-sm leading-6 text-zinc-500">
                {item.desc}
              </p>

              <div className="mt-6 inline-flex items-center gap-2 text-sm font-black text-lime-600 transition duration-200 ease-out group-hover:gap-3">
                Explore
                <span aria-hidden="true">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

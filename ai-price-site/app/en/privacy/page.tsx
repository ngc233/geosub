import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "This page explains how GeoSub handles basic usage data, analytics events, and non-sensitive website interaction data.",
};

export default function EnglishTrustPage() {
  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
          Privacy Policy
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
          Privacy Policy
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-600">
          This page explains how GeoSub handles basic usage data, analytics events, and non-sensitive website interaction data.
        </p>

        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm shadow-zinc-950/[0.03]">
          <h2 className="text-xl font-black text-zinc-950">
            Overview
          </h2>

          <p className="mt-4 text-sm leading-8 text-zinc-600">
            GeoSub focuses on public pricing data and subscription information. We do not require users to submit sensitive identity information to browse the website.
          </p>

          <p className="mt-6 text-sm leading-8 text-zinc-500">
            GeoSub may use Google Analytics or Google Tag Manager to measure page views, general interactions and site performance. These measurements help improve content and reliability; they are not used to request payment details or sensitive identity information.
          </p>
        </div>
      </section>
    </main>
  );
}

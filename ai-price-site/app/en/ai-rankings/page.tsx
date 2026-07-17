import type { Metadata } from "next";
import { guardUnreleasedPublicPage } from "../../../lib/public-page-guard";

export const metadata: Metadata = {
  title: "AI Tool Rankings Under Review",
  description:
    "GeoSub AI tool rankings are under review while model coverage, scoring evidence, pricing data and editorial checks are improved.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function EnglishAiRankingsPage() {
  guardUnreleasedPublicPage();

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center px-6 py-20">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
          GeoSub Beta
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 dark:text-white">
          AI tool rankings are under review
        </h1>
        <p className="mt-5 text-base leading-8 text-zinc-500 dark:text-zinc-400">
          This page will reopen after model coverage, scoring evidence, pricing data and editorial review are strong enough for a public ranking.
        </p>
      </div>
    </main>
  );
}

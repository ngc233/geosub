import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  CreditCard,
  Gift,
  Microscope,
  ShieldCheck,
} from "lucide-react";

import { loadCoreGuideHubStates } from "../lib/core-guide-cms";
import {
  coreGuideSlugs,
  getCoreGuideDefinition,
  type CoreGuideLocale,
} from "../lib/core-guide-content";

const guideIcons = {
  "price-guide": BadgeDollarSign,
  "gift-card-guide": Gift,
  "payment-account": CreditCard,
  methodology: ShieldCheck,
} as const;

const toolReviewCopy = {
  zh: {
    title: "工具测评",
    description: "从真实用途、能力边界、持续成本与证据日期判断工具是否值得订阅。",
  },
  en: {
    title: "Tool reviews",
    description:
      "Evaluate a tool through real use cases, capability limits, ongoing cost and dated evidence.",
  },
} as const;

export const guideHubExcludedArticleSlugs = new Set<string>([
  ...coreGuideSlugs,
  "tool-review",
]);

export default async function CoreGuideHub({
  locale,
}: {
  locale: CoreGuideLocale;
}) {
  const cmsStates = await loadCoreGuideHubStates(locale);
  const states = coreGuideSlugs.map((slug) => ({
    slug,
    definition: getCoreGuideDefinition(locale, slug),
    state: cmsStates.get(slug),
  }));
  const coreGuides = states.filter(
    ({ state }) => !state?.managed || state.published,
  );
  const copy =
    locale === "zh"
      ? {
          eyebrow: "从这里开始",
          title: "核心指南",
          description: "先读懂价格、付款条件与数据方法，再进入具体产品比较。",
          open: "打开指南",
        }
      : {
          eyebrow: "Start here",
          title: "Essential guides",
          description:
            "Understand prices, payment conditions and data methods before comparing products.",
          open: "Open guide",
        };
  const toolReview = toolReviewCopy[locale];

  return (
    <section className="mt-10 border-y border-zinc-200 py-8">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase text-lime-700">{copy.eyebrow}</p>
        <h2 className="mt-2 text-2xl font-black text-zinc-950">{copy.title}</h2>
        <p className="mt-2 text-base leading-7 text-zinc-600">{copy.description}</p>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {coreGuides.map(({ slug, definition }) => {
          const Icon = guideIcons[slug];

          return (
            <Link
              key={slug}
              href={`/${locale}/guides/${slug}`}
              className="group flex min-h-44 flex-col border border-zinc-200 bg-white p-5 transition hover:border-lime-300 hover:bg-lime-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <Icon size={20} aria-hidden="true" className="text-lime-700" />
              <h3 className="mt-4 text-lg font-black text-zinc-950">
                {definition.eyebrow}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">
                {definition.description}
              </p>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-black text-zinc-900 group-hover:text-lime-800">
                {copy.open} <ArrowRight size={15} aria-hidden="true" />
              </span>
            </Link>
          );
        })}

        <Link
          href={`/${locale}/guides/tool-review`}
          className="group flex min-h-44 flex-col border border-zinc-200 bg-white p-5 transition hover:border-lime-300 hover:bg-lime-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
        >
          <Microscope size={20} aria-hidden="true" className="text-lime-700" />
          <h3 className="mt-4 text-lg font-black text-zinc-950">{toolReview.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">
            {toolReview.description}
          </p>
          <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-black text-zinc-900 group-hover:text-lime-800">
            {copy.open} <ArrowRight size={15} aria-hidden="true" />
          </span>
        </Link>
      </div>
    </section>
  );
}

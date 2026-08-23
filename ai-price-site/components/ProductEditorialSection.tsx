import {
  ExternalLink,
  GitCompareArrows,
  Info,
  UserRound,
} from "lucide-react";
import TrackedLink from "./analytics/TrackedLink";
import type { getProductEditorialContent } from "../lib/product-editorial-content";
import type { SiteLocale } from "../lib/site-locale";

type EditorialContent = NonNullable<
  ReturnType<typeof getProductEditorialContent>
>;

export function ProductEditorialSection({
  productSlug,
  planName,
  locale,
  content,
}: {
  productSlug: string;
  planName: string;
  locale: SiteLocale;
  content: EditorialContent;
}) {
  const isChinese = locale === "zh";
  const title = isChinese
    ? `${planName} 适合谁`
    : `Who ${planName} is for`;
  const helper = isChinese
    ? "从使用频率、功能需求和预算判断是否适合；具体权益与动态限额以官方说明为准。"
    : "Use frequency, feature needs and budget to decide; official terms and dynamic limits remain authoritative.";

  return (
    <section className="border-y border-zinc-200 py-6 dark:border-zinc-800">
      <div className="max-w-3xl">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
          {isChinese ? "套餐选择" : "Plan fit"}
        </div>
        <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          {helper}
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <UserRound aria-hidden="true" className="size-4" strokeWidth={1.8} />
            </span>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
              {content.bestForLabel}
            </h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {content.plan.bestFor}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <GitCompareArrows aria-hidden="true" className="size-4" strokeWidth={1.8} />
            </span>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
              {content.differenceLabel}
            </h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {content.plan.difference}
          </p>
        </div>
      </div>

      {content.plan.availabilityNote ? (
        <div className="mt-3 flex gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/70">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-zinc-500" strokeWidth={1.8} />
          <div>
            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              {content.availabilityLabel}
            </div>
            <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {content.plan.availabilityNote}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <p className="hidden text-xs text-zinc-500 sm:block dark:text-zinc-400">
          {isChinese ? "官方页面用于核对当前套餐权益与地区可用性。" : "Use the official page to confirm current benefits and regional availability."}
        </p>
        <TrackedLink
          href={content.plan.sourceUrl}
          eventKey="click_official"
          eventName="Open official plan guide"
          buttonKey={`${productSlug}-plan-guide`}
          placement="plan_editorial"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:text-zinc-950 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:text-white"
        >
          {content.sourceLabel}
          <ExternalLink aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
        </TrackedLink>
      </div>
    </section>
  );
}

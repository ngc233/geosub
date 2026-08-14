import { ArrowUpRight, GitCompareArrows, UserRound } from "lucide-react";
import TrackedLink from "./analytics/TrackedLink";
import type { getProductEditorialContent } from "../lib/product-editorial-content";

type EditorialContent = NonNullable<
  ReturnType<typeof getProductEditorialContent>
>;

export function ProductEditorialSection({
  productSlug,
  planName,
  content,
}: {
  productSlug: string;
  planName: string;
  content: EditorialContent;
}) {
  return (
    <section className="border-y border-zinc-200 py-6 dark:border-zinc-800">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-4xl">
          <div className="text-xs font-semibold text-lime-700 dark:text-lime-400">
            {planName}
          </div>
          <h2 className="mt-1 text-xl font-semibold text-zinc-950 dark:text-white">
            {content.sectionTitle}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            {content.summary}
          </p>
        </div>

        <TrackedLink
          href={content.plan.sourceUrl}
          eventKey="click_official"
          eventName="Open official plan guide"
          buttonKey={`${productSlug}-plan-guide`}
          placement="plan_editorial"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-lime-300 hover:bg-lime-50 hover:text-lime-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-lime-700 dark:hover:bg-lime-950/40 dark:hover:text-lime-300"
        >
          {content.sourceLabel}
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </TrackedLink>
      </div>

      <div className="mt-6 grid border-t border-zinc-200 dark:border-zinc-800 md:grid-cols-2">
        <div className="py-5 md:pr-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-lime-50 text-lime-700 dark:bg-lime-950/50 dark:text-lime-400">
              <UserRound aria-hidden="true" className="size-4" />
            </span>
            <span>{content.bestForLabel}</span>
          </div>
          <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-zinc-800 dark:text-zinc-100">
            {content.plan.bestFor}
          </p>
        </div>
        <div className="border-t border-zinc-200 py-5 dark:border-zinc-800 md:border-l md:border-t-0 md:pl-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <GitCompareArrows aria-hidden="true" className="size-4" />
            </span>
            <span>{content.differenceLabel}</span>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-700 dark:text-zinc-200">
            {content.plan.difference}
          </p>
        </div>
      </div>

      {content.plan.availabilityNote ? (
        <div className="mt-4 border-l-2 border-amber-400 pl-3">
          <div className="text-xs font-semibold text-amber-700">
            {content.availabilityLabel}
          </div>
          <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {content.plan.availabilityNote}
          </p>
        </div>
      ) : null}
    </section>
  );
}

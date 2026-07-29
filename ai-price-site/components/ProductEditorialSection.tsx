import TrackedLink from "./analytics/TrackedLink";
import type { getProductEditorialContent } from "../lib/product-editorial-content";

type EditorialContent = NonNullable<
  ReturnType<typeof getProductEditorialContent>
>;

export function ProductEditorialSection({
  productSlug,
  content,
}: {
  productSlug: string;
  content: EditorialContent;
}) {
  return (
    <section className="border-y border-zinc-200 py-5 dark:border-zinc-800">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold text-zinc-950 dark:text-white">
            {content.sectionTitle}
          </h2>
          <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
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
          className="shrink-0 text-xs font-semibold text-zinc-500 transition hover:text-lime-700"
        >
          {content.sourceLabel} &rarr;
        </TrackedLink>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-xs font-semibold text-zinc-400">
            {content.bestForLabel}
          </div>
          <p className="mt-1 text-sm leading-6 text-zinc-700 dark:text-zinc-200">
            {content.plan.bestFor}
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold text-zinc-400">
            {content.differenceLabel}
          </div>
          <p className="mt-1 text-sm leading-6 text-zinc-700 dark:text-zinc-200">
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

import { getPurchaseEligibility } from "../lib/purchase-eligibility";
import type { ProductPlan } from "../lib/public-pricing-model";
import type { SiteLocale } from "../lib/site-locale";

export default function PurchaseEligibilityNote({ locale, productSlug, plans }: {
  locale: SiteLocale; productSlug: string; plans: ProductPlan[];
}) {
  const note = getPurchaseEligibility(locale, productSlug, plans);
  if (!note) return null;
  return (
    <aside data-purchase-eligibility className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
      <p className="font-semibold text-zinc-950 dark:text-white">{note.title}</p>
      <p>{note.description}</p>
      <a href={note.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 focus-visible:outline focus-visible:outline-2">
        {note.sourceLabel}
      </a>
      <span className="ml-2 text-xs">{note.checkedLabel}: {note.checkedAt}</span>
    </aside>
  );
}

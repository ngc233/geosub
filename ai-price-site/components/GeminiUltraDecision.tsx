import Link from "next/link";
import type { SubscriptionProduct } from "../lib/public-pricing-model";
import type { SiteLocale } from "../lib/site-locale";
import { geminiDecisionEvidence as evidence, hasGeminiUltraDecision } from "../lib/gemini-plan-decision";
import PublishedPlanComparison from "./PublishedPlanComparison";
import styles from "./ManagedContent.module.css";

export default function GeminiUltraDecision({ product, locale, planSlug }: {
  product: SubscriptionProduct; locale: SiteLocale; planSlug: string;
}) {
  if (!hasGeminiUltraDecision(locale, product.slug, planSlug)) return null;
  const linkClass = "inline-flex min-h-11 items-center rounded-md underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]";
  return (
    <>
      <PublishedPlanComparison product={product} locale={locale} planSlugs={["pro", "ultra"]}
        title="Should you choose Pro or Ultra?"
        intro="Compare the same country, billing period and channel first. These are published US monthly App Store prices in USD, not Google website offers or introductory discounts. Open each plan for its regional prices."
        footer="Names, prices, coverage and collection dates follow the published price data. Missing comparable prices remain unavailable. Use the currency selector in the regional table for conversions; a converted price does not establish eligibility to buy in that country."
        choices={evidence.choices} placement="gemini_ultra_comparison" />
      <section aria-labelledby="gemini-ultra-purchase-title" className={`${styles.scope} rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 text-sm leading-6 text-[var(--color-text-secondary)]`}>
        <h2 id="gemini-ultra-purchase-title" className="text-xl font-semibold text-[var(--color-text-primary)]">Check what your Ultra offer includes</h2>
        <p className="mt-3">{evidence.tiers}</p>
        <p className="mt-3">{evidence.family}</p>
        <p className="mt-3">For an overview of the available tiers, <Link href="/en/ai-pricing/gemini" className={linkClass}>compare all Gemini plans</Link>. If you need video benefits for a household, review <Link href="/en/streaming-pricing/youtube-premium/family" className={linkClass}>YouTube Premium Family prices and requirements</Link> separately.</p>
        <ul className="mt-3 flex flex-col items-start">
          {evidence.sources.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer" className={linkClass}>{source.label}</a></li>)}
        </ul>
        <p className="mt-2 text-xs">Benefit guidance checked: {evidence.checkedAt}. Price collection dates are shown separately in the comparison.</p>
      </section>
    </>
  );
}

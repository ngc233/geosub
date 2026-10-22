import Link from "next/link";
import type { SubscriptionProduct } from "../lib/public-pricing-model";
import type { SiteLocale } from "../lib/site-locale";
import { geminiDecisionEvidence as evidence, hasGeminiUltraDecision } from "../lib/gemini-plan-decision";
import { youtubeFamilyEvidence, hasYouTubeFamilyDecision } from "../lib/youtube-family-decision";
import { grokSuperEvidence, hasGrokSuperAppStoreDecision } from "../lib/grok-super-decision";
import PublishedPlanComparison from "./PublishedPlanComparison";
import styles from "./ManagedContent.module.css";
import { chatgptPro100Evidence, hasChatGPTPro100Decision } from "../lib/chatgpt-pro100-decision";

export default function PlanDecisionGuidance({ product, locale, planSlug }: {
  product: SubscriptionProduct; locale: SiteLocale; planSlug: string;
}) {
  const youtube = hasYouTubeFamilyDecision(locale, product.slug, planSlug);
  const chatgpt = hasChatGPTPro100Decision(locale, product.slug, planSlug);
  const grok = hasGrokSuperAppStoreDecision(locale, product.slug, product.plans.filter((plan) => plan.slug === planSlug));
  if (!chatgpt && !grok && !youtube && !hasGeminiUltraDecision(locale, product.slug, planSlug)) return null;
  const guide = chatgpt ? chatgptPro100Evidence : grok ? grokSuperEvidence : youtube ? youtubeFamilyEvidence : evidence;
  const purchaseId = chatgpt ? "chatgpt-pro100-purchase-title" : grok ? "grok-super-purchase-title" : youtube ? "youtube-family-purchase-title" : "gemini-ultra-purchase-title";
  const linkClass = "inline-flex min-h-11 items-center rounded-md underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]";
  return (
    <>
      <PublishedPlanComparison product={product} locale={locale} planSlugs={chatgpt ? ["plus", "pro-5x", "pro"] : grok ? ["super-lite", "super", "super-heavy"] : youtube ? ["lite", "individual", "family"] : ["pro", "ultra"]}
        title={chatgpt ? chatgptPro100Evidence.comparisonTitle : grok ? grokSuperEvidence.comparisonTitle : youtube ? youtubeFamilyEvidence.comparisonTitle : "Should you choose Pro or Ultra?"}
        intro={chatgpt ? chatgptPro100Evidence.comparisonIntro : grok ? grokSuperEvidence.comparisonIntro : youtube ? youtubeFamilyEvidence.comparisonIntro : "Compare the same country, billing period and channel first. These are published US monthly App Store prices in USD, not Google website offers or introductory discounts. Open each plan for its regional prices."}
        footer={chatgpt ? chatgptPro100Evidence.comparisonFooter : grok ? grokSuperEvidence.comparisonFooter : youtube ? youtubeFamilyEvidence.comparisonFooter : "Names, prices, coverage and collection dates follow the published price data. Missing comparable prices remain unavailable. Use the currency selector in the regional table for conversions; a converted price does not establish eligibility to buy in that country."}
        choices={guide.choices} placement={chatgpt ? "chatgpt_pro100_comparison" : grok ? "grok_super_comparison" : youtube ? "youtube_family_comparison" : "gemini_ultra_comparison"} />
      <section aria-labelledby={purchaseId} className={`${styles.scope} rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 text-sm leading-6 text-[var(--color-text-secondary)]`}>
        <h2 id={purchaseId} className="text-xl font-semibold text-[var(--color-text-primary)]">{chatgpt ? chatgptPro100Evidence.purchaseTitle : grok ? grokSuperEvidence.purchaseTitle : youtube ? youtubeFamilyEvidence.purchaseTitle : "Check what your Ultra offer includes"}</h2>
        {(chatgpt ? chatgptPro100Evidence.paragraphs : grok ? grokSuperEvidence.paragraphs : youtube ? youtubeFamilyEvidence.paragraphs : [evidence.tiers, evidence.family]).map((paragraph) => <p key={paragraph} className="mt-3">{paragraph}</p>)}
        {chatgpt ? <p className="mt-3">Use the <Link href="/en/ai-pricing/chatgpt" className={linkClass}>ChatGPT plan overview</Link> for the wider published lineup, or open a plan in the comparison above for its regional evidence. Compare your current allowance and renewal before choosing a country price.</p> : grok ? <p className="mt-3">Use the <Link href="/en/ai-pricing/grok" className={linkClass}>Grok plan overview</Link> for the collected lineup and coverage, then open a specific plan above to compare that plan&apos;s country prices on the same billing basis.</p> : youtube ? <nav aria-label="Related subscription comparisons" className="mt-3 flex flex-col items-start">
          <Link href="/en/streaming-pricing/youtube-premium" className={linkClass}>All YouTube Premium plans and regional coverage</Link>
          <p className="mt-3">An Individual membership included in an AI bundle does not provide Family sharing.</p>
          <Link href="/en/ai-pricing/gemini/ultra#gemini-ultra-purchase-title" className={linkClass}>Check Gemini Ultra&apos;s YouTube benefit</Link>
        </nav> : <p className="mt-3">For an overview of the available tiers, <Link href="/en/ai-pricing/gemini" className={linkClass}>compare all Gemini plans</Link>. If you need video benefits for a household, review <Link href="/en/streaming-pricing/youtube-premium/family" className={linkClass}>YouTube Premium Family prices and requirements</Link> separately.</p>}
        <ul className="mt-3 flex flex-col items-start">
          {guide.sources.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer" className={linkClass}>{source.label}</a></li>)}
        </ul>
        <p className="mt-2 text-xs">Benefit guidance checked: {guide.checkedAt}. Price collection dates are shown separately in the comparison.</p>
      </section>
    </>
  );
}

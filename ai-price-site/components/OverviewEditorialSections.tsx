import styles from "./ManagedContent.module.css";
import type { SiteLocale } from "../lib/site-locale";
import type { OverviewContent } from "../lib/managed-content";
export default function OverviewEditorialSections({ content, locale = "en" }: { content: OverviewContent; locale?: SiteLocale }) {
  return <div className={`${styles.scope} space-y-4`}>{content.sections.map((section) => <section data-managed-editorial="true" key={section.heading} className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 text-[var(--color-text-primary)]"><h2 className="text-xl font-semibold">{section.heading}</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--color-text-secondary)]">{section.body}</p></section>)}<p className="flex flex-wrap gap-3 text-sm text-[var(--color-text-secondary)]">{locale === "zh" ? "官方参考：" : "Official references:"} {content.sources.map((source, i) => <a data-managed-source="true" className="underline focus-visible:outline-2" key={source} href={source} target="_blank" rel="noreferrer">{locale === "zh" ? "来源" : "Source"} {i + 1}</a>)}</p></div>;
}

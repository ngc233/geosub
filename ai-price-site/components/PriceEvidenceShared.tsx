import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Database, Globe2, History, Search } from "lucide-react";
import { PublicSection } from "./ui/PublicPage";
import type { HubLocale } from "../lib/country-hubs";
import { getPriceEvidencePreview } from "../lib/price-evidence-preview";

export const mutedClass = "text-sm leading-6 text-[var(--color-text-secondary)]";
export const metaClass = "text-xs leading-5 text-[var(--color-text-muted)]";
export const headingClass = "text-xl font-semibold tracking-tight text-[var(--color-text-primary)]";
export const linkClass = "inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]";

export function evidenceMetadata(locale: HubLocale, path: string, title: string): Metadata {
  return { title, alternates: { canonical: `/${locale}${path}` }, robots: { index: false, follow: true } };
}
export function money(amount: number, currency: string, locale: HubLocale) {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}
export function countryName(code: string, locale: HubLocale) {
  return new Intl.DisplayNames([locale === "zh" ? "zh-CN" : "en"], { type: "region" }).of(code) || code;
}
export function dateTime(value: string, locale: HubLocale) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC";
}
// Existing page headers vary by template. Keep this composition local; sections,
// statistics and product identity use the site's shared public components.
export function PageHeading({ title, description, locale, centered = false, identity }: {
  title: string; description: string; locale: HubLocale; centered?: boolean; identity?: ReactNode;
}) {
  const preview = getPriceEvidencePreview();
  return <header className={`mb-8 ${centered ? "text-center" : ""}`}>
    <div className={`flex items-center gap-4 ${centered ? "justify-center" : ""}`}>
      {identity}
      <h1 className="min-w-0 text-3xl font-semibold tracking-[-0.025em] text-[var(--color-text-primary)] md:text-4xl">{title}</h1>
    </div>
    <p className={`mt-4 max-w-3xl text-base leading-7 text-[var(--color-text-secondary)] ${centered ? "mx-auto" : ""}`}>{description}</p>
    {preview ? <aside className="mt-5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-4 py-3 text-start text-xs leading-6 text-[var(--color-text-secondary)]">
      <p className="font-semibold text-[var(--color-text-primary)]">{locale === "zh" ? "线上真实公开数据 · 只读预览" : "Live public data · read-only preview"} · {dateTime(preview.capturedAt, locale)}</p>
      <p>{locale === "zh" ? "本机副本覆盖土耳其、印度、菲律宾、日本及美国基准；历史记录也限于这五个地区。“比较所有地区”进入线上网站。" : "This local copy covers Turkey, India, the Philippines, Japan and the US baseline. History is limited to those five regions. “Compare all regions” opens the live website."}</p>
    </aside> : null}
  </header>;
}
export function PageLinks({ locale, active, controls = false }: { locale: HubLocale; active?: "countries" | "history"; controls?: boolean }) {
  const links = [
    { key: "countries", path: "countries", label: locale === "zh" ? "按国家找订阅" : "Browse by country", icon: Globe2 },
    { key: "history", path: "price-history", label: locale === "zh" ? "价格变化记录" : "Price change records", icon: History },
    { key: "sources", path: "data-sources", label: locale === "zh" ? "数据来源" : "Data sources", icon: Database },
  ];
  return <nav aria-label={locale === "zh" ? "价格探索" : "Explore prices"} className={controls ? (active === "countries" ? "gs-country-index-nav" : "gs-evidence-nav") : "mb-8 flex flex-wrap gap-x-5 border-b border-[var(--color-border-default)]"}>
    {links.map(({ key, path, label, icon: Icon }) => <Link key={key} href={`/${locale}/${path}`} aria-current={active === key ? "page" : undefined}
      data-gs-ui={controls ? "button" : undefined} data-gs-variant={controls && active === key ? "primary" : undefined}
      className={controls ? undefined : `${linkClass} border-b-2 py-2 ${active === key ? "border-[var(--color-accent)] !text-[var(--color-text-primary)]" : "border-transparent"}`}>
      <Icon size={15} aria-hidden="true" />{label}
    </Link>)}
  </nav>;
}
export function EmptyState({ title, children, unavailable = false }: { title: string; children: ReactNode; unavailable?: boolean }) {
  const Icon = unavailable ? Database : Search;
  return <PublicSection className="my-6 px-5 py-10 text-center md:px-6" >
    <div role={unavailable ? "status" : undefined}>
      <Icon className="mx-auto mb-4 text-[var(--color-text-muted)]" size={24} aria-hidden="true" />
      <h2 className={headingClass}>{title}</h2>
      <p className={`mx-auto mt-3 max-w-2xl ${mutedClass}`}>{children}</p>
    </div>
  </PublicSection>;
}
export function Unavailable({ locale }: { locale: HubLocale }) {
  return <EmptyState unavailable title={locale === "zh" ? "暂时无法读取价格记录" : "Price records are temporarily unavailable"}>
    {locale === "zh" ? "请稍后刷新重试。读取失败不代表没有价格或没有变化。" : "Refresh later to try again. A read failure does not mean there are no prices or changes."}
  </EmptyState>;
}

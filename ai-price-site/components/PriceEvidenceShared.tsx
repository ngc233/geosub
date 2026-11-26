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

function intlLocaleFor(locale: HubLocale): string {
  switch (locale) {
    case "zh-tw":
      return "zh-TW";
    case "en":
      return "en-US";
    case "ja":
      return "ja-JP";
    case "ko":
      return "ko-KR";
    case "es":
      return "es-ES";
    case "zh":
    default:
      return "zh-CN";
  }
}

const sharedCopy: Record<
  HubLocale,
  {
    previewTitle: string;
    previewBody: string;
    navAria: string;
    navCountries: string;
    navHistory: string;
    navSources: string;
    unavailableTitle: string;
    unavailableBody: string;
    historyTitle: string;
    snapshotTitle: string;
  }
> = {
  zh: {
    previewTitle: "线上真实公开数据 · 只读预览",
    previewBody:
      "本机副本覆盖土耳其、印度、菲律宾、日本及美国基准；历史记录也限于这五个地区。“比较所有地区”进入线上网站。",
    navAria: "价格探索",
    navCountries: "按国家找订阅",
    navHistory: "价格变化记录",
    navSources: "数据来源",
    unavailableTitle: "暂时无法读取价格记录",
    unavailableBody: "请稍后刷新重试。读取失败不代表没有价格或没有变化。",
    historyTitle: "价格变化记录",
    snapshotTitle: "原始价格快照",
  },
  "zh-tw": {
    previewTitle: "線上真實公開資料 · 唯讀預覽",
    previewBody:
      "本機副本涵蓋土耳其、印度、菲律賓、日本及美國基準；歷史紀錄亦限於這五個地區。「比較所有地區」會前往線上網站。",
    navAria: "價格探索",
    navCountries: "按國家找訂閱",
    navHistory: "價格變化紀錄",
    navSources: "資料來源",
    unavailableTitle: "暫時無法讀取價格紀錄",
    unavailableBody: "請稍後重新整理再試。讀取失敗不代表沒有價格或沒有變動。",
    historyTitle: "價格變化紀錄",
    snapshotTitle: "原始價格快照",
  },
  en: {
    previewTitle: "Live public data · read-only preview",
    previewBody:
      "This local copy covers Turkey, India, the Philippines, Japan and the US baseline. History is limited to those five regions. “Compare all regions” opens the live website.",
    navAria: "Explore prices",
    navCountries: "Browse by country",
    navHistory: "Price change records",
    navSources: "Data sources",
    unavailableTitle: "Price records are temporarily unavailable",
    unavailableBody: "Refresh later to try again. A read failure does not mean there are no prices or changes.",
    historyTitle: "Price change records",
    snapshotTitle: "Original price snapshot",
  },
  ja: {
    previewTitle: "公開本番データ · 読み取り専用プレビュー",
    previewBody:
      "このローカルコピーはトルコ、インド、フィリピン、日本および米国基準を対象としています。履歴もこの5地域に限定されます。「すべての地域を比較」は本番サイトを開きます。",
    navAria: "価格データを探す",
    navCountries: "国別に探す",
    navHistory: "価格改定履歴",
    navSources: "データソース",
    unavailableTitle: "価格記録を一時的に読み込めません",
    unavailableBody: "しばらくしてから再読み込みしてください。読み込み失敗は価格や改定がないことを意味しません。",
    historyTitle: "価格改定履歴",
    snapshotTitle: "取得時の元価格スナップショット",
  },
  ko: {
    previewTitle: "실제 공개 데이터 · 읽기 전용 미리보기",
    previewBody:
      "이 로컬 사본은 튀르키예, 인도, 필리핀, 일본 및 미국 기준을 포함합니다. 변동 기록 역시 해당 5개 지역으로 제한됩니다. ‘모든 지역 비교’는 라이브 사이트로 이동합니다.",
    navAria: "가격 데이터 탐색",
    navCountries: "국가별 탐색",
    navHistory: "가격 변동 기록",
    navSources: "데이터 출처",
    unavailableTitle: "가격 기록을 일시적으로 불러올 수 없습니다",
    unavailableBody: "잠시 후 새로고침하여 다시 시도해 주세요. 읽기 실패가 가격이나 변동이 없음을 의미하지는 않습니다.",
    historyTitle: "가격 변동 기록",
    snapshotTitle: "원본 가격 스냅샷",
  },
  es: {
    previewTitle: "Datos públicos reales · vista previa de solo lectura",
    previewBody:
      "Esta copia local cubre Turquía, India, Filipinas, Japón y la referencia de EE. UU. El historial también se limita a esas cinco regiones. «Comparar todas las regiones» abre el sitio en vivo.",
    navAria: "Explorar precios",
    navCountries: "Explorar por país",
    navHistory: "Historial de cambios de precio",
    navSources: "Fuentes de datos",
    unavailableTitle: "Los registros de precios no están disponibles temporalmente",
    unavailableBody: "Vuelve a cargar más tarde. Un error de lectura no significa que no haya precios ni cambios.",
    historyTitle: "Historial de cambios de precio",
    snapshotTitle: "Captura original de precios",
  },
};

export function getEvidenceSharedCopy(locale: HubLocale) {
  return sharedCopy[locale];
}

export function evidenceMetadata(locale: HubLocale, path: string, title?: string): Metadata {
  const resolvedTitle =
    title ?? (path.startsWith("/price-records") ? sharedCopy[locale].snapshotTitle : sharedCopy[locale].historyTitle);
  return { title: resolvedTitle, alternates: { canonical: `/${locale}${path}` }, robots: { index: false, follow: true } };
}
export function money(amount: number, currency: string, locale: HubLocale) {
  return new Intl.NumberFormat(intlLocaleFor(locale), { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}
export function countryName(code: string, locale: HubLocale) {
  const displayLocale = locale === "zh" ? "zh-CN" : locale === "zh-tw" ? "zh-TW" : locale;
  return new Intl.DisplayNames([displayLocale], { type: "region" }).of(code) || code;
}
export function dateTime(value: string, locale: HubLocale) {
  const dtLocale = locale === "en" ? "en-GB" : intlLocaleFor(locale);
  return new Intl.DateTimeFormat(dtLocale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC";
}
// Existing page headers vary by template. Keep this composition local; sections,
// statistics and product identity use the site's shared public components.
export function PageHeading({ title, description, locale, centered = false, identity }: {
  title: string; description: string; locale: HubLocale; centered?: boolean; identity?: ReactNode;
}) {
  const preview = getPriceEvidencePreview();
  const copy = sharedCopy[locale];
  return <header className={`mb-8 ${centered ? "text-center" : ""}`}>
    <div className={`flex items-center gap-4 ${centered ? "justify-center" : ""}`}>
      {identity}
      <h1 className="min-w-0 text-3xl font-semibold tracking-[-0.025em] text-[var(--color-text-primary)] md:text-4xl">{title}</h1>
    </div>
    <p className={`mt-4 max-w-3xl text-base leading-7 text-[var(--color-text-secondary)] ${centered ? "mx-auto" : ""}`}>{description}</p>
    {preview ? <aside className="mt-5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-4 py-3 text-start text-xs leading-6 text-[var(--color-text-secondary)]">
      <p className="font-semibold text-[var(--color-text-primary)]">{copy.previewTitle} · {dateTime(preview.capturedAt, locale)}</p>
      <p>{copy.previewBody}</p>
    </aside> : null}
  </header>;
}
export function PageLinks({ locale, active, controls = false }: { locale: HubLocale; active?: "countries" | "history"; controls?: boolean }) {
  const copy = sharedCopy[locale];
  const links = [
    { key: "countries", path: "countries", label: copy.navCountries, icon: Globe2 },
    { key: "history", path: "price-history", label: copy.navHistory, icon: History },
    { key: "sources", path: "data-sources", label: copy.navSources, icon: Database },
  ];
  return <nav aria-label={copy.navAria} className={controls ? (active === "countries" ? "gs-country-index-nav" : "gs-evidence-nav") : "mb-8 flex flex-wrap gap-x-5 border-b border-[var(--color-border-default)]"}>
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
  const copy = sharedCopy[locale];
  return <EmptyState unavailable title={copy.unavailableTitle}>
    {copy.unavailableBody}
  </EmptyState>;
}

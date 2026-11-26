import AuxiliaryStyles from "./AuxiliaryStyles";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, ExternalLink, History } from "lucide-react";
import BrandIcon from "./BrandIcon";
import CountryIdentity from "./CountryIdentity";
import { DataNote, MetricItem, MetricStrip, PublicSection, PublicSectionHeader } from "./ui/PublicPage";
import { getBillingCycleLabel } from "../lib/billing-cycle-label";
import type { ProductPlan } from "../lib/public-pricing-model";
import { loadCountryHub } from "../lib/cached-country-hub";
import { getPriorityCountry, priorityCountries, type HubLocale } from "../lib/country-hubs";
import { getEvidencePlanHref } from "../lib/price-evidence-preview";
import { getPublicPriceSnapshot } from "../lib/price-records";
import { getPriceSnapshotById } from "../lib/price-records-data";
import { fictionalPriceHistoryRecords, isHomepageFixtureEnabled } from "../lib/test-fixtures/homepage";
import { HistoryPage as SharedHistoryPage } from "./PriceHistoryPage";
import {
  countryName,
  dateTime,
  EmptyState,
  getEvidenceSharedCopy,
  headingClass,
  linkClass,
  metaClass,
  money,
  PageHeading,
  PageLinks,
  Unavailable,
} from "./PriceEvidenceShared";
import styles from "./PriceEvidencePages.module.css";

const pageClass = `${styles.page} mx-auto max-w-6xl px-5 py-12 md:py-14`;
const gridClass = "my-6 grid gap-5 md:grid-cols-2";
const pillClass = "inline-flex items-center rounded-md bg-[var(--color-bg-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]";

export { evidenceMetadata } from "./PriceEvidenceShared";

const snapshotCopyByLocale: Record<
  HubLocale,
  {
    backToPlan: string;
    viewHistory: string;
    headingTitle: (product: string, country: string) => string;
    headingDesc: string;
    observedPrice: string;
    collected: string;
    billingPeriod: string;
    periodNotRetained: string;
    openOfficial: string;
    originalItemsTitle: string;
    originalItemsDesc: string;
    colItemName: string;
    colPriceText: string;
    selectedItem: string;
    truncatedNote: string;
    checksumSummary: string;
    checksumNote: string;
  }
> = {
  zh: {
    backToPlan: "返回套餐价格",
    viewHistory: "查看该产品价格历史",
    headingTitle: (product, country) => `${product} · ${country}原始价格快照`,
    headingDesc:
      "以下为采集当时保存的 App Store 套餐条目。它是历史观测，不代表当前结算价格；未采用条目不自动等于错误或不可购买。",
    observedPrice: "当时本币标价",
    collected: "采集时间",
    billingPeriod: "计费周期",
    periodNotRetained: "历史记录未保存周期",
    openOfficial: "查看当前官方页面",
    originalItemsTitle: "采集时的原始套餐条目",
    originalItemsDesc:
      "“采用条目”表示采集器保存的名称和原始价格文本均与该行一致，不意味着其他条目已被逐一核实或排除。",
    colItemName: "原始套餐名称",
    colPriceText: "原始价格文本",
    selectedItem: "采用条目",
    truncatedNote: "条目超过展示上限，仅展示前 200 条。",
    checksumSummary: "记录标识与内容校验值",
    checksumNote: "校验值用于识别本站展示记录的内容，不是 Apple 签名或第三方认证。",
  },
  "zh-tw": {
    backToPlan: "返回方案價格",
    viewHistory: "查看該產品價格歷史",
    headingTitle: (product, country) => `${product} · ${country}原始價格快照`,
    headingDesc:
      "以下為採集當時保存的 App Store 方案項目。此為歷史觀測，不代表目前結帳價格；未採用項目不自動等於錯誤或不可購買。",
    observedPrice: "當時當地標價",
    collected: "採集時間",
    billingPeriod: "計費週期",
    periodNotRetained: "歷史紀錄未保存週期",
    openOfficial: "查看目前官方頁面",
    originalItemsTitle: "採集時的原始方案項目",
    originalItemsDesc:
      "「採用項目」表示採集器保存的名稱與原始價格文字均與該列一致，不代表其他項目已被逐一核實或排除。",
    colItemName: "原始方案名稱",
    colPriceText: "原始價格文字",
    selectedItem: "採用項目",
    truncatedNote: "項目超過顯示上限，僅顯示前 200 筆。",
    checksumSummary: "紀錄識別碼與內容雜湊值",
    checksumNote: "雜湊值用於識別本站顯示紀錄的內容，並非 Apple 簽章或第三方認證。",
  },
  en: {
    backToPlan: "Back to plan prices",
    viewHistory: "View this product's price history",
    headingTitle: (product, country) => `${product} · ${country} original price snapshot`,
    headingDesc:
      "These App Store items were retained at collection time. This is a historical observation, not a current checkout quote. Unselected items are not necessarily incorrect or unavailable.",
    observedPrice: "Observed local price",
    collected: "Collected",
    billingPeriod: "Billing period",
    periodNotRetained: "Period was not retained",
    openOfficial: "Open the current official page",
    originalItemsTitle: "Original items at collection",
    originalItemsDesc:
      "“Selected item” means both the saved name and original price text match this row. It does not assert that every other item has been verified or excluded.",
    colItemName: "Original item name",
    colPriceText: "Original price text",
    selectedItem: "Selected item",
    truncatedNote: "Showing the first 200 items; the retained list is longer.",
    checksumSummary: "Record ID and content checksum",
    checksumNote:
      "The checksum identifies the source fields displayed here; it is not an Apple signature or independent certification.",
  },
  ja: {
    backToPlan: "プラン価格に戻る",
    viewHistory: "このサービスの価格履歴を見る",
    headingTitle: (product, country) => `${product} · ${country} 取得時の元価格スナップショット`,
    headingDesc:
      "以下は取得時点で保存された App Store のアプリ内課金項目です。過去の観測記録であり、現在の決済価格を保証するものではありません。未採用の項目が誤りや購入不可であることを意味するものではありません。",
    observedPrice: "取得時の現地価格",
    collected: "取得日時",
    billingPeriod: "請求サイクル",
    periodNotRetained: "周期データなし",
    openOfficial: "現在の公式ページを開く",
    originalItemsTitle: "取得時の元プラン項目",
    originalItemsDesc:
      "「採用項目」は保存された名称と元の価格テキストがこの行と一致することを示します。他の項目が検証・除外されたことを意味するものではありません。",
    colItemName: "元の項目名",
    colPriceText: "元の価格テキスト",
    selectedItem: "採用項目",
    truncatedNote: "表示上限を超えたため、先頭 200 件のみ表示しています。",
    checksumSummary: "レコード ID とコンテンツチェックサム",
    checksumNote:
      "チェックサムは当サイトに表示されている元フィールドを識別するものであり、Apple の署名や第三者認証ではありません。",
  },
  ko: {
    backToPlan: "요금제 가격으로 돌아가기",
    viewHistory: "이 서비스의 가격 변동 기록 보기",
    headingTitle: (product, country) => `${product} · ${country} 원본 가격 스냅샷`,
    headingDesc:
      "수집 시점에 보존된 App Store 인앱 상품 항목입니다. 과거 관측 기록이며 현재 결제 금액을 보장하지 않습니다. 미선택 항목이 오류이거나 구매 불가능함을 의미하지는 않습니다.",
    observedPrice: "관측 당시 현지 가격",
    collected: "수집 시각",
    billingPeriod: "결제 주기",
    periodNotRetained: "주기 정보 미보존",
    openOfficial: "현재 공식 페이지 열기",
    originalItemsTitle: "수집 당시 원본 항목",
    originalItemsDesc:
      "‘채택 항목’은 저장된 항목명과 원본 가격 텍스트가 이 행과 일치함을 뜻하며, 다른 항목이 모두 검증·배제되었음을 의미하지 않습니다.",
    colItemName: "원본 항목명",
    colPriceText: "원본 가격 텍스트",
    selectedItem: "채택 항목",
    truncatedNote: "표시 한도를 초과하여 상위 200개 항목만 표시합니다.",
    checksumSummary: "레코드 ID 및 콘텐츠 체크섬",
    checksumNote:
      "체크섬은 여기에 표시된 원본 필드를 식별하기 위한 값이며 Apple 서명이나 제3자 인증이 아닙니다.",
  },
  es: {
    backToPlan: "Volver a precios del plan",
    viewHistory: "Ver historial de precios de este servicio",
    headingTitle: (product, country) => `${product} · Captura original de precios en ${country}`,
    headingDesc:
      "Estos elementos de App Store se conservaron en el momento de la captura. Es una observación histórica, no una cotización de pago actual. Los elementos no seleccionados no son necesariamente incorrectos ni inaccesibles.",
    observedPrice: "Precio local observado",
    collected: "Capturado",
    billingPeriod: "Ciclo de facturación",
    periodNotRetained: "Ciclo no conservado",
    openOfficial: "Abrir página oficial actual",
    originalItemsTitle: "Elementos originales en la captura",
    originalItemsDesc:
      "«Elemento seleccionado» indica que tanto el nombre guardado como el texto original del precio coinciden con esta fila. No implica que los demás elementos hayan sido descartados.",
    colItemName: "Nombre original del elemento",
    colPriceText: "Texto original del precio",
    selectedItem: "Elemento seleccionado",
    truncatedNote: "Mostrando los primeros 200 elementos; la lista conservada es más larga.",
    checksumSummary: "ID de registro y suma de verificación",
    checksumNote:
      "La suma de verificación identifica los campos mostrados aquí; no es una firma de Apple ni una certificación independiente.",
  },
};

const countryIndexCopyByLocale: Record<
  HubLocale,
  {
    title: string;
    description: string;
    featuredHeading: string;
    featuredBadge: string;
    statsText: (products: number, plans: number, ai: number, streaming: number) => string;
    statsUnavailable: string;
    upToOff: (pct: number) => string;
    cheaperCount: (count: number) => string;
    colPlan: string;
    colMonthly: string;
    colVsUs: string;
    lowestBadge: string;
    perMonth: string;
    sameLabel: string;
    lastCollected: (date: string) => string;
    monthlyVerified: string;
    viewAllPlans: (count: number) => string;
    explorePrices: string;
    scopeNote: string;
  }
> = {
  zh: {
    title: "按国家找订阅",
    description: "集中查看各地区已核验的 App Store 月付订阅，比较当地标价、美国同套餐基准与采集记录。",
    featuredHeading: "重点国家与地区",
    featuredBadge: "深度核验专页 · 4 个地区",
    statsText: (products, plans, ai, streaming) =>
      `${products} 个产品 · ${plans} 个套餐 · AI ${ai} / 流媒体 ${streaming}`,
    statsUnavailable: "覆盖数量暂时无法读取",
    upToOff: (pct) => `最高省 ${pct}%`,
    cheaperCount: (count) => `${count} 款低于美区`,
    colPlan: "已核验套餐",
    colMonthly: "折合月付",
    colVsUs: "对比美国",
    lowestBadge: "低价",
    perMonth: "/月",
    sameLabel: "持平",
    lastCollected: (date) => `最近采集: ${date}`,
    monthlyVerified: "App Store · 月付已核验",
    viewAllPlans: (count) => `查看全部 ${count} 个套餐`,
    explorePrices: "查看地区价格",
    scopeNote:
      "收录范围：App Store · 月付 · 已核验。逐个套餐与美国相同套餐比较，不发布国家综合指数，也不保证跨区购买资格。",
  },
  "zh-tw": {
    title: "按國家找訂閱",
    description: "集中查看各地區已核驗的 App Store 月付訂閱，比較當地標價、美國同方案基準與採集紀錄。",
    featuredHeading: "重點國家與地區",
    featuredBadge: "深度核驗專頁 · 4 個地區",
    statsText: (products, plans, ai, streaming) =>
      `${products} 個產品 · ${plans} 個方案 · AI ${ai} / 串流媒體 ${streaming}`,
    statsUnavailable: "涵蓋數量暫時無法讀取",
    upToOff: (pct) => `最高省 ${pct}%`,
    cheaperCount: (count) => `${count} 款低於美區`,
    colPlan: "已核驗方案",
    colMonthly: "折合月付",
    colVsUs: "對比美國",
    lowestBadge: "低價",
    perMonth: "/月",
    sameLabel: "持平",
    lastCollected: (date) => `最近採集: ${date}`,
    monthlyVerified: "App Store · 月付已核驗",
    viewAllPlans: (count) => `查看全部 ${count} 個方案`,
    explorePrices: "查看地區價格",
    scopeNote:
      "收錄範圍：App Store · 月付 · 已核驗。逐個方案與美國相同方案比較，不發布國家綜合指數，亦不保證跨區購買資格。",
  },
  en: {
    title: "Browse subscriptions by country",
    description:
      "Explore verified monthly App Store subscriptions in selected countries, with local prices, same-plan US comparisons and source records.",
    featuredHeading: "Featured countries and regions",
    featuredBadge: "Deep-dive hubs · 4 regions",
    statsText: (products, plans, ai, streaming) =>
      `${products} products · ${plans} plans · AI ${ai} / Streaming ${streaming}`,
    statsUnavailable: "Coverage is temporarily unavailable",
    upToOff: (pct) => `Up to ${pct}% off`,
    cheaperCount: (count) => `${count} cheaper than US`,
    colPlan: "Verified plan",
    colMonthly: "Converted / mo",
    colVsUs: "vs US",
    lowestBadge: "Lowest",
    perMonth: "/mo",
    sameLabel: "Same",
    lastCollected: (date) => `Last collected: ${date}`,
    monthlyVerified: "App Store · Monthly verified",
    viewAllPlans: (count) => `View all ${count} plans`,
    explorePrices: "Explore regional prices",
    scopeNote:
      "Scope: verified monthly App Store plans. Each plan is compared with the same US plan. This is not a national price index or a guarantee of purchase eligibility.",
  },
  ja: {
    title: "国・地域からサブスクを探す",
    description:
      "主要国の検証済み App Store 月額サブスクリプションを一覧比較。現地価格、米国の同一プランとの価格差、取得記録を確認できます。",
    featuredHeading: "注目の国・地域",
    featuredBadge: "詳細検証ハブ · 4 地域",
    statsText: (products, plans, ai, streaming) =>
      `${products} サービス · ${plans} プラン · AI ${ai} / 動画配信 ${streaming}`,
    statsUnavailable: "収録件数を一時的に読み込めません",
    upToOff: (pct) => `最大 ${pct}% 安い`,
    cheaperCount: (count) => `${count} 件が米国より割安`,
    colPlan: "検証済みプラン",
    colMonthly: "月額換算",
    colVsUs: "米国比",
    lowestBadge: "最安",
    perMonth: "/月",
    sameLabel: "同額",
    lastCollected: (date) => `最終取得: ${date}`,
    monthlyVerified: "App Store · 月額検証済み",
    viewAllPlans: (count) => `全 ${count} プランを見る`,
    explorePrices: "地域別価格を見る",
    scopeNote:
      "対象範囲：検証済み App Store 月額プラン。米国の同一プランと個別に比較しており、国全体の物価指数や購入資格を保証するものではありません。",
  },
  ko: {
    title: "국가별 구독 가격 찾기",
    description:
      "주요 국가의 검증된 App Store 월간 구독을 한곳에서 모아 현지 정가, 미국 동일 요금제 비교 및 수집 기록을 확인하세요.",
    featuredHeading: "주요 국가 및 지역",
    featuredBadge: "심층 검증 허브 · 4개 지역",
    statsText: (products, plans, ai, streaming) =>
      `${products}개 서비스 · ${plans}개 요금제 · AI ${ai} / 스트리밍 ${streaming}`,
    statsUnavailable: "수록 건수를 일시적으로 불러올 수 없습니다",
    upToOff: (pct) => `최대 ${pct}% 절약`,
    cheaperCount: (count) => `${count}개 미국보다 저렴`,
    colPlan: "검증된 요금제",
    colMonthly: "월 환산가",
    colVsUs: "미국 대비",
    lowestBadge: "최저가",
    perMonth: "/월",
    sameLabel: "동일",
    lastCollected: (date) => `최근 수집: ${date}`,
    monthlyVerified: "App Store · 월간 검증됨",
    viewAllPlans: (count) => `전체 ${count}개 요금제 보기`,
    explorePrices: "지역별 가격 보기",
    scopeNote:
      "수록 범위: 검증된 App Store 월간 요금제. 각 요금제를 미국 동일 요금제와 개별 비교하며 국가 종합 물가지수나 타 지역 구매 자격을 보증하지 않습니다.",
  },
  es: {
    title: "Explorar suscripciones por país",
    description:
      "Consulta suscripciones mensuales verificadas de App Store en países destacados, con precios locales, comparación frente a EE. UU. y registros originales.",
    featuredHeading: "Países y regiones destacados",
    featuredBadge: "Centros verificados · 4 regiones",
    statsText: (products, plans, ai, streaming) =>
      `${products} servicios · ${plans} planes · IA ${ai} / Streaming ${streaming}`,
    statsUnavailable: "La cobertura no está disponible temporalmente",
    upToOff: (pct) => `Hasta ${pct}% menos`,
    cheaperCount: (count) => `${count} más baratos que EE. UU.`,
    colPlan: "Plan verificado",
    colMonthly: "Convertido / mes",
    colVsUs: "vs EE. UU.",
    lowestBadge: "Mínimo",
    perMonth: "/mes",
    sameLabel: "Igual",
    lastCollected: (date) => `Última captura: ${date}`,
    monthlyVerified: "App Store · Mensual verificado",
    viewAllPlans: (count) => `Ver los ${count} planes`,
    explorePrices: "Ver precios regionales",
    scopeNote:
      "Alcance: planes mensuales verificados de App Store. Cada plan se compara con el mismo plan de EE. UU.; no constituye un índice nacional de precios ni garantiza elegibilidad de compra.",
  },
};

function priorityCountryLabel(
  country: { code: string; zh: string; en: string },
  locale: HubLocale,
): string {
  if (locale === "zh") return country.zh;
  if (locale === "en") return country.en;
  return countryName(country.code, locale);
}

export function HistoryPage({ locale, slug }: { locale: HubLocale; slug?: string }) {
  return <SharedHistoryPage locale={locale} slug={slug} pageClass={pageClass} />;
}

export async function SnapshotPage({ id, locale }: { id: string; locale: HubLocale }) {
  const unified = true;
  const copy = snapshotCopyByLocale[locale];
  const shared = getEvidenceSharedCopy(locale);
  let snapshot;
  try {
    if (isHomepageFixtureEnabled()) {
      const fixtureMatch = fictionalPriceHistoryRecords().find((row) => row.id === id);
      snapshot = fixtureMatch ? getPublicPriceSnapshot(fixtureMatch) : await getPriceSnapshotById(id);
    } else {
      snapshot = await getPriceSnapshotById(id);
    }
  } catch {
    return (
      <div className={unified ? "gs-public-unified gs-evidence-page" : pageClass}>
        {unified && <AuxiliaryStyles kind="evidence" />}
        <PageHeading locale={locale} title={shared.snapshotTitle} description="App Store" />
        <Unavailable locale={locale} />
        <PageLinks locale={locale} controls={unified} />
      </div>
    );
  }
  if (!snapshot) notFound();
  const path = getEvidencePlanHref(
    `/${locale}/${snapshot.category === "ai" ? "ai-pricing" : "streaming-pricing"}/${snapshot.productSlug}/${snapshot.planSlug}`,
  );
  return (
    <div className={unified ? "gs-public-unified gs-evidence-page" : pageClass}>
      {unified && <AuxiliaryStyles kind="evidence" />}
      <div className="mb-6 flex flex-wrap gap-x-6">
        <Link className={linkClass} href={path}>
          <ArrowLeft size={16} aria-hidden="true" />
          {copy.backToPlan}
        </Link>
        <Link className={linkClass} href={`/${locale}/price-history/${snapshot.productSlug}`}>
          <History size={16} aria-hidden="true" />
          {copy.viewHistory}
        </Link>
      </div>
      <PageHeading
        locale={locale}
        identity={<BrandIcon product={{ slug: snapshot.productSlug, name: snapshot.productName }} size="lg" priority />}
        title={copy.headingTitle(snapshot.productName, countryName(snapshot.countryCode, locale))}
        description={copy.headingDesc}
      />
      <PublicSection className="mb-6">
        <PublicSectionHeader title={snapshot.planName} actions={<span className={pillClass}>App Store</span>} />
        <MetricStrip columns={3}>
          <MetricItem label={copy.observedPrice} value={money(snapshot.amount, snapshot.currency, locale)} />
          <MetricItem
            label={copy.collected}
            value={<span className="text-sm">{dateTime(snapshot.observedAt, locale)}</span>}
          />
          <MetricItem
            label={copy.billingPeriod}
            value={
              <span className="text-sm">
                {snapshot.billingCycle
                  ? getBillingCycleLabel(snapshot.billingCycle as ProductPlan["billing"], locale)
                  : copy.periodNotRetained}
              </span>
            }
          />
        </MetricStrip>
        <DataNote>
          <a className={linkClass} href={snapshot.sourceUrl} target="_blank" rel="noreferrer">
            {copy.openOfficial}
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        </DataNote>
      </PublicSection>
      <PublicSection>
        <PublicSectionHeader title={copy.originalItemsTitle} description={copy.originalItemsDesc} />
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 bg-[var(--color-bg-subtle)] px-5 py-3 text-xs text-[var(--color-text-muted)] md:px-6">
          <span>{copy.colItemName}</span>
          <span className="text-right">{copy.colPriceText}</span>
        </div>
        <div className="divide-y divide-[var(--color-border-default)]">
          {snapshot.items.map((item, index) => (
            <div
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-4 px-5 py-4 text-sm md:px-6"
              key={index}
            >
              <div className="min-w-0 break-words text-[var(--color-text-primary)]">
                {item.name}
                {item.selected ? (
                  <span className="mt-1 block w-fit rounded-md bg-[var(--color-accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--color-accent)]">
                    {copy.selectedItem}
                  </span>
                ) : null}
              </div>
              <span className="min-w-0 break-words text-right font-semibold tabular-nums text-[var(--color-text-primary)]">
                {item.priceText}
              </span>
            </div>
          ))}
        </div>
        {snapshot.truncated ? <DataNote>{copy.truncatedNote}</DataNote> : null}
        <details className="group border-t border-[var(--color-border-default)] px-5 md:px-6">
          <summary className={`${linkClass} flex cursor-pointer justify-between py-3`}>
            <span>{copy.checksumSummary}</span>
            <ChevronDown className="shrink-0 group-open:rotate-180" size={16} aria-hidden="true" />
          </summary>
          <div className="pb-5">
            <p className="break-all font-mono text-xs leading-6 text-[var(--color-text-secondary)]">
              {snapshot.id}
              <br />
              SHA-256: {snapshot.contentHash}
            </p>
            <p className={`mt-3 ${metaClass}`}>{copy.checksumNote}</p>
          </div>
        </details>
      </PublicSection>
      <div className="mt-8">
        <PageLinks locale={locale} controls={unified} />
      </div>
    </div>
  );
}

export async function CountryIndexPage({ locale, overviewMap }: { locale: HubLocale; overviewMap?: ReactNode }) {
  const coverage = await Promise.allSettled(priorityCountries.map((country) => loadCountryHub(country.code)));
  const copy = countryIndexCopyByLocale[locale];
  const compactPillCodeOnly = locale === "en" || locale === "es";

  return (
    <div className="gs-public-unified gs-country-index">
      <AuxiliaryStyles kind="countryIndex" />
      <PageHeading
        centered={false}
        locale={locale}
        title={copy.title}
        description={copy.description}
      />
      {overviewMap}
      <div className="gs-country-index-heading">
        <h2 className={headingClass}>{copy.featuredHeading}</h2>
        <span className={metaClass}>{copy.featuredBadge}</span>
      </div>
      <div className="gs-country-index-grid">
        {priorityCountries.map((country, index) => {
          const result = coverage[index];
          const rows = result.status === "fulfilled" ? result.value : null;
          const products = rows ? new Set(rows.map((row) => row.productSlug)).size : 0;
          const aiCount = rows ? rows.filter((row) => row.category === "ai").length : 0;
          const streamingCount = rows ? rows.filter((row) => row.category === "streaming").length : 0;
          const previewRows = rows
            ? rows
                .filter(
                  (row) =>
                    typeof row.planName === "string" &&
                    typeof row.productName === "string" &&
                    Number.isFinite(row.amount),
                )
                .slice(0, 4)
            : [];
          const cheaperCount = rows
            ? rows.filter((row) => typeof row.difference === "number" && row.difference < 0).length
            : 0;
          const bestSaving = previewRows.reduce<number | null>((best, row) => {
            if (typeof row.difference !== "number" || row.difference >= 0) return best;
            const pct = Math.abs(row.difference);
            return best === null || pct > best ? pct : best;
          }, null);
          const latestDate = previewRows
            .map((row) => (typeof row.checkedAt === "string" ? row.checkedAt.slice(0, 10) : ""))
            .filter(Boolean)
            .sort()
            .at(-1);

          return (
            <PublicSection key={country.code} className="gs-country-index-item">
              <Link href={`/${locale}/countries/${country.slug}`} className="gs-country-index-card">
                <div className="gs-country-index-head">
                  <div className="gs-country-index-brandline">
                    <CountryIdentity code={country.code} />
                    <div className="gs-country-index-titlewrap">
                      <div className="gs-country-index-headline">
                        <div>
                          <div className="gs-country-index-name">
                            <h3 className={headingClass}>{priorityCountryLabel(country, locale)}</h3>
                            <span className="gs-country-index-pill">
                              {compactPillCodeOnly ? country.code : `${country.en} · ${country.code}`}
                            </span>
                          </div>
                          <p className="gs-country-index-stats">
                            {rows
                              ? copy.statsText(products, rows.length, aiCount, streamingCount)
                              : copy.statsUnavailable}
                          </p>
                        </div>
                        {(bestSaving !== null || cheaperCount > 0) && (
                          <div className="gs-country-index-meta">
                            {bestSaving !== null && <span>{copy.upToOff(bestSaving)}</span>}
                            {cheaperCount > 0 && <span>{copy.cheaperCount(cheaperCount)}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {previewRows.length > 0 && (
                  <div className="gs-country-index-tablewrap">
                    <table className="gs-country-index-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>{copy.colPlan}</th>
                          <th>{copy.colMonthly}</th>
                          <th>{copy.colVsUs}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, rowIndex) => {
                          const diff = typeof row.difference === "number" ? row.difference : null;
                          const isLow = diff !== null && diff < 0;
                          const isHigh = diff !== null && diff > 0;
                          const hasUsd = row.usd !== null && Number.isFinite(row.usd);
                          return (
                            <tr key={`${row.productSlug}:${row.planSlug ?? rowIndex}`}>
                              <td className="gs-country-index-rank">{rowIndex + 1}</td>
                              <td>
                                <div className="gs-country-index-plan">
                                  <BrandIcon
                                    product={{ slug: row.productSlug, name: row.productName }}
                                    size="xs"
                                    decorative
                                    className="gs-country-index-brand"
                                  />
                                  <div className="gs-country-index-plantext">
                                    <span className="gs-country-index-planname">{row.productName}</span>
                                    <span className="gs-country-index-plantier">{row.planName}</span>
                                    {rowIndex === 0 && isLow && (
                                      <span className="gs-country-index-badge is-low">
                                        {copy.lowestBadge}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div
                                  className={`gs-country-index-value${rowIndex === 0 && isLow ? " is-low" : isHigh ? " is-high" : ""}`}
                                >
                                  {hasUsd ? money(row.usd!, "USD", locale) : money(row.amount, row.currency, locale)}
                                  <span className="gs-country-index-period">{copy.perMonth}</span>
                                </div>
                                {hasUsd && row.currency !== "USD" && (
                                  <div className="gs-country-index-local">
                                    ≈ {money(row.amount, row.currency, locale)}
                                  </div>
                                )}
                              </td>
                              <td className="gs-country-index-comparison">
                                <span className={isLow ? "is-low" : isHigh ? "is-high" : undefined}>
                                  {diff === null
                                    ? "—"
                                    : diff === 0
                                      ? copy.sameLabel
                                      : isLow
                                        ? `−${Math.abs(diff)}%`
                                        : `+${diff}%`}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="gs-country-index-foot">
                  <span className="gs-country-index-updated">
                    {latestDate ? copy.lastCollected(latestDate) : copy.monthlyVerified}
                  </span>
                  <span className="gs-country-index-action">
                    <span>
                      {rows && rows.length > previewRows.length
                        ? copy.viewAllPlans(rows.length)
                        : copy.explorePrices}
                    </span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </PublicSection>
          );
        })}
      </div>
      <PublicSection className="gs-country-index-note">
        <DataNote>{copy.scopeNote}</DataNote>
      </PublicSection>
    </div>
  );
}

export async function CountryHubPage({ countrySlug, locale }: { countrySlug: string; locale: HubLocale }) {
  const country = getPriorityCountry(countrySlug);
  if (!country) notFound();
  const label = priorityCountryLabel(country, locale);
  const zhLike = locale === "zh" || locale === "zh-tw";
  let rows;
  try {
    rows = await loadCountryHub(country.code);
  } catch {
    return (
      <div className={pageClass}>
        <PageHeading
          locale={locale}
          title={`${label}${zhLike ? "订阅价格" : " subscription prices"}`}
          description="App Store"
        />
        <Unavailable locale={locale} />
        <PageLinks locale={locale} />
      </div>
    );
  }
  const productCount = new Set(rows.map((row) => row.productSlug)).size;
  const comparable = rows.filter((row) => row.difference !== null);
  return (
    <div className={pageClass}>
      <Link className={`${linkClass} mb-6`} href={`/${locale}/countries`}>
        <ArrowLeft size={16} aria-hidden="true" />
        {zhLike ? "全部国家与地区" : "All countries and regions"}
      </Link>
      <PageHeading
        locale={locale}
        identity={<CountryIdentity code={country.code} />}
        title={`${label}${zhLike ? "订阅价格" : " subscription prices"}`}
        description={
          zhLike
            ? "查看当地已核验的 App Store 月付套餐，逐个比较本币标价、美元参考和美国同套餐价格。"
            : "Explore verified local monthly App Store plans, with local prices, USD references and same-plan US comparisons."
        }
      />
      <PageLinks locale={locale} active="countries" />
      <PublicSection>
        <PublicSectionHeader
          title={zhLike ? "已核验价格概况" : "Verified price coverage"}
          actions={<span className={pillClass}>App Store · {zhLike ? "月付" : "Monthly"}</span>}
        />
        <MetricStrip mobileColumns={2}>
          <MetricItem label={zhLike ? "收录产品" : "Products"} value={productCount} />
          <MetricItem label={zhLike ? "已核验套餐" : "Verified plans"} value={rows.length} />
          <MetricItem label={zhLike ? "可与美国比较" : "US-comparable plans"} value={comparable.length} />
          <MetricItem
            label={zhLike ? "比美国便宜" : "Cheaper than US"}
            value={comparable.filter((row) => row.difference! < 0).length}
            tone="saving"
          />
        </MetricStrip>
        <DataNote>
          {zhLike
            ? "仅纳入最近 14 天内采集的已发布核验价格。样本数量只描述本站收录，不代表该国全部订阅或整体物价。"
            : "Includes published, verified prices collected within 14 days. Coverage describes this catalogue, not all subscriptions or the country's overall price level."}
        </DataNote>
      </PublicSection>
      {!rows.length ? (
        <EmptyState title={zhLike ? "暂无符合条件的套餐" : "No eligible plans currently"}>
          {zhLike
            ? "缺失、过期、待审或来源证据不足的价格不参与本页。请稍后回来查看。"
            : "Missing, stale, pending and insufficiently sourced prices are excluded. Check back later."}
        </EmptyState>
      ) : null}
      {(["ai", "streaming"] as const).map((category) => {
        const group = rows.filter((row) => row.category === category);
        return group.length ? (
          <section key={category} id={`${category}-plans`} className="mt-9 scroll-mt-24">
            <div className="flex items-end justify-between gap-4">
              <h2 className={headingClass}>
                {category === "ai"
                  ? zhLike
                    ? "AI 订阅"
                    : "AI subscriptions"
                  : zhLike
                    ? "流媒体订阅"
                    : "Streaming subscriptions"}
              </h2>
              <span className={metaClass}>
                {group.length} {zhLike ? "个套餐" : "plans"}
              </span>
            </div>
            <div className={gridClass}>
              {group.map((row) => (
                <PublicSection key={`${row.productSlug}:${row.planSlug}`} className="shadow-sm">
                  <div className="p-5 md:p-6">
                    <div className="flex items-start gap-4">
                      <BrandIcon product={{ slug: row.productSlug, name: row.productName }} size="md" />
                      <div className="min-w-0">
                        <h3 className={headingClass}>{row.planName}</h3>
                        <p className={`mt-1 ${metaClass}`}>
                          {row.productName} · App Store · {zhLike ? "月付" : "monthly"}
                        </p>
                      </div>
                    </div>
                  </div>
                </PublicSection>
              ))}
            </div>
          </section>
        ) : null;
      })}
    </div>
  );
}

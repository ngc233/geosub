import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { ArrowLeft, ArrowRight } from "lucide-react";
import BrandIcon from "./BrandIcon";
import PriceHistoryRadarClient from "./PriceHistoryRadarClient";
import { PublicSection, PublicSectionHeader } from "./ui/PublicPage";
import { loadPriceHistoryGlobalRadar } from "../lib/cached-price-history-radar";
import { homepageMap } from "../lib/homepage-map";
import type { HubLocale } from "../lib/country-hubs";
import type { RadarEventItem } from "../lib/public-map-views";
import { getPriceEvidencePreview } from "../lib/price-evidence-preview";
import { getPriceHistorySummary } from "../lib/price-records";
import { getPriceRecordProducts, getProductPriceRecords } from "../lib/price-records-data";
import { PUBLIC_PRICING_CACHE_TAG, PUBLIC_PRICING_REVALIDATE_SECONDS } from "../lib/public-pricing-cache";
import { canvasUiCopy } from "../lib/canvas-ui-copy";
import {
  fictionalPriceHistoryRecords,
  fictionalPriceRecordProducts,
  isHomepageFixtureEnabled,
} from "../lib/test-fixtures/homepage";
import {
  countryName,
  dateTime,
  headingClass,
  metaClass,
  mutedClass,
  PageHeading,
  Unavailable,
} from "./PriceEvidenceShared";

const previewCacheScope = () => getPriceEvidencePreview()?.capturedAt || "public";
const loadRecords = (slug: string) =>
  unstable_cache(
    async () => {
      const result = await getProductPriceRecords(slug);
      const observedCodes = [
        ...new Set(result.records.filter((row) => /^[A-Z]{2}$/.test(row.countryCode)).map((row) => row.countryCode)),
      ].sort();
      return { ...getPriceHistorySummary(result.records), observedCodes, truncated: result.truncated };
    },
    ["price-records-v4", slug, previewCacheScope()],
    {
      revalidate: PUBLIC_PRICING_REVALIDATE_SECONDS,
      tags: [PUBLIC_PRICING_CACHE_TAG],
    },
  )();
const loadProducts = () =>
  unstable_cache(getPriceRecordProducts, ["price-record-products-v1", previewCacheScope()], {
    revalidate: PUBLIC_PRICING_REVALIDATE_SECONDS,
    tags: [PUBLIC_PRICING_CACHE_TAG],
  })();

const historyPageCopy: Record<
  HubLocale,
  {
    baseTitle: string;
    productTitle: (productName: string) => string;
    description: string;
    allRecords: string;
    coverageHeading: string;
    coverageStats: (days: number, countries: number, records: string) => string;
    coverageNote: string;
    latest100Note: string;
    recentSnapshotsTitle: string;
    recentSnapshotsDesc: string;
    directoryAria: string;
    directoryHeading: string;
    directoryDesc: string;
    directoryBack: string;
    changesIn120d: (count: number) => string;
    stableRecently: string;
    windowNote: string;
    truncatedSuffix: string;
    sequenceBreakNote: string;
  }
> = {
  zh: {
    baseTitle: "价格变化记录",
    productTitle: (name) => `${name} 价格变化记录`,
    description:
      "追踪同一套餐、地区与计费周期的 App Store 当地官方调价。每条记录均可核对原始采集快照，日常汇率浮动不计入调价。",
    allRecords: "全部价格变化记录",
    coverageHeading: "采集覆盖说明",
    coverageStats: (days, countries, records) =>
      `${days} 个采样日 · ${countries} 个曾观测地区 · ${records} 条观测记录`,
    coverageNote: "以上为窗口内读取到的原始采集记录；不推断两次采集之间的具体改价时刻。",
    latest100Note: "显示最近 100 个已确认事件。",
    recentSnapshotsTitle: "最近原始采集快照",
    recentSnapshotsDesc: "查看采集当时保存的 App Store 套餐条目与原始价格文本。",
    directoryAria: "按产品查阅历史档案",
    directoryHeading: "按产品查阅历史档案",
    directoryDesc: "进入单个订阅服务专页，查看该产品近 120 天的地区监测覆盖、调价轨迹与原始商店快照。",
    directoryBack: "全站调价总览",
    changesIn120d: (count) => `近 120 天 ${count} 次调价`,
    stableRecently: "近期价格稳定",
    windowNote: "观察窗口：最近 120 天，分页读取，安全上限为最近 50,000 条观测；不推断两次采集之间的生效时刻。",
    truncatedSuffix: " 本次已触及读取上限，当前结果不是完整历史。",
    sequenceBreakNote: "缺少周期身份、审核中断或来源改变时，不连接两次价格。",
  },
  "zh-tw": {
    baseTitle: "價格變化紀錄",
    productTitle: (name) => `${name} 價格變化紀錄`,
    description:
      "追蹤同一方案、地區與計費週期的 App Store 當地官方調價。每筆紀錄皆可核對原始採集快照，日常匯率波動不計入調價。",
    allRecords: "全部價格變化紀錄",
    coverageHeading: "採集涵蓋說明",
    coverageStats: (days, countries, records) =>
      `${days} 個取樣日 · ${countries} 個曾觀測地區 · ${records} 筆觀測紀錄`,
    coverageNote: "以上為視窗內讀取到的原始採集紀錄；不推斷兩次採集之間的具體改價時刻。",
    latest100Note: "顯示最近 100 筆已確認事件。",
    recentSnapshotsTitle: "最近原始採集快照",
    recentSnapshotsDesc: "查看採集當時保存的 App Store 方案項目與原始價格文字。",
    directoryAria: "按產品查閱歷史檔案",
    directoryHeading: "按產品查閱歷史檔案",
    directoryDesc: "進入單一訂閱服務專頁，查看該產品近 120 天的地區監測涵蓋、調價軌跡與原始商店快照。",
    directoryBack: "全站調價總覽",
    changesIn120d: (count) => `近 120 天 ${count} 次調價`,
    stableRecently: "近期價格穩定",
    windowNote: "觀察視窗：最近 120 天，分頁讀取，安全上限為最近 50,000 筆觀測；不推斷兩次採集之間的生效時刻。",
    truncatedSuffix: " 本次已觸及讀取上限，目前結果並非完整歷史。",
    sequenceBreakNote: "缺少週期識別、審核中斷或來源變更時，不連接兩次價格。",
  },
  en: {
    baseTitle: "Price change records",
    productTitle: (name) => `${name} Price change records`,
    description:
      "Track local App Store price changes for the same plan, country and billing period. Each change links to its source records. Exchange-rate movements are not price changes.",
    allRecords: "All price change records",
    coverageHeading: "Observation coverage",
    coverageStats: (days, countries, records) =>
      `${days} sampled days · ${countries} observed regions · ${records} observations`,
    coverageNote:
      "Coverage describes the retrieved raw observations, including unverified records. It does not establish continuous monitoring, current availability or unchanged prices throughout the window.",
    latest100Note: "Showing the latest 100 confirmed events.",
    recentSnapshotsTitle: "Recent original observations",
    recentSnapshotsDesc: "Inspect the plan items and original price text retained at collection.",
    directoryAria: "Browse price history by product",
    directoryHeading: "Browse Price History by Product",
    directoryDesc:
      "Open a dedicated product archive to inspect 120-day regional monitoring coverage, confirmed adjustments, and raw store snapshots.",
    directoryBack: "All products overview",
    changesIn120d: (count) => `${count} ${count === 1 ? "change" : "changes"} in 120d`,
    stableRecently: "Stable recently",
    windowNote:
      "Window: the last 120 days, paginated with a safety limit of 50,000 recent observations. Observation times do not establish exactly when a change took effect.",
    truncatedSuffix: " The read limit was reached; this is not a complete history.",
    sequenceBreakNote: "Missing period identity, review interruptions and source changes break the comparison.",
  },
  ja: {
    baseTitle: "価格改定履歴",
    productTitle: (name) => `${name} 価格改定履歴`,
    description:
      "同一プラン・国・請求サイクルにおける App Store の現地公式価格改定を追跡します。各記録から取得時の元スナップショットを確認でき、日々の為替変動は含まれません。",
    allRecords: "すべての価格改定履歴",
    coverageHeading: "観測データの範囲",
    coverageStats: (days, countries, records) =>
      `取得日数 ${days} 日 · 観測地域 ${countries} か所 · 観測レコード ${records} 件`,
    coverageNote:
      "上記は対象期間内に取得された生レコードを示しており、2回の取得間の正確な改定日時を特定するものではありません。",
    latest100Note: "確認済みの最新 100 件を表示しています。",
    recentSnapshotsTitle: "最近の取得スナップショット",
    recentSnapshotsDesc: "取得時点で保存された App Store プラン項目と元の価格テキストを確認できます。",
    directoryAria: "サービス別の価格履歴アーカイブ",
    directoryHeading: "サービス別に価格履歴を見る",
    directoryDesc:
      "各サービスの専用アーカイブを開き、過去120日間の地域モニタリング状況、確認済み価格改定、元のストアスナップショットを確認できます。",
    directoryBack: "全サービス一覧へ",
    changesIn120d: (count) => `直近120日で ${count} 件の改定`,
    stableRecently: "直近は価格安定",
    windowNote:
      "観測期間：直近120日間（最大 50,000 件の安全上限付きページネーション）。観測日時は改定が発効した正確な瞬間を示すものではありません。",
    truncatedSuffix: " 読み取り上限に達したため、完全な履歴ではありません。",
    sequenceBreakNote: "請求サイクルの欠落、審査の中断、取得元の変更がある場合は前後の価格を連結しません。",
  },
  ko: {
    baseTitle: "가격 변동 기록",
    productTitle: (name) => `${name} 가격 변동 기록`,
    description:
      "동일 요금제·국가·결제 주기의 App Store 현지 공식 가격 인하·인상을 추적합니다. 모든 기록은 원본 수집 스냅샷과 연결되며 일일 환율 변동은 포함되지 않습니다.",
    allRecords: "전체 가격 변동 기록",
    coverageHeading: "관측 커버리지 안내",
    coverageStats: (days, countries, records) =>
      `샘플링 ${days}일 · 관측 지역 ${countries}곳 · 관측 레코드 ${records}건`,
    coverageNote:
      "위 수치는 기간 내 조회된 원본 관측 기록을 설명하며 두 수집 시점 사이의 정확한 가격 변경 시각을 추정하지 않습니다.",
    latest100Note: "최근 확인된 이벤트 100건을 표시합니다.",
    recentSnapshotsTitle: "최근 원본 수집 스냅샷",
    recentSnapshotsDesc: "수집 시점에 보존된 App Store 요금제 항목과 원본 가격 텍스트를 확인하세요.",
    directoryAria: "서비스별 가격 변동 기록 탐색",
    directoryHeading: "서비스별 가격 변동 아카이브",
    directoryDesc:
      "개별 구독 서비스 아카이브에서 최근 120일간의 지역별 모니터링 범위, 확정된 가격 조정 및 원본 스토어 스냅샷을 확인하세요.",
    directoryBack: "전체 서비스 요약",
    changesIn120d: (count) => `최근 120일 ${count}회 변동`,
    stableRecently: "최근 가격 안정",
    windowNote:
      "관측 기간: 최근 120일(최근 50,000건 안전 상한 페이지네이션). 관측 시각이 실제 가격 변경 발효 시점을 의미하지는 않습니다.",
    truncatedSuffix: " 읽기 상한에 도달하여 전체 기록이 아닐 수 있습니다.",
    sequenceBreakNote: "결제 주기 식별 누락, 검토 중단 또는 출처 변경이 있으면 두 가격을 연결하지 않습니다.",
  },
  es: {
    baseTitle: "Historial de cambios de precio",
    productTitle: (name) => `Historial de precios de ${name}`,
    description:
      "Sigue los ajustes oficiales en moneda local de App Store para el mismo plan, país y ciclo de facturación. Cada cambio enlaza con sus capturas originales; las fluctuaciones cambiarias no cuentan como cambios de precio.",
    allRecords: "Todos los cambios de precio",
    coverageHeading: "Cobertura de observación",
    coverageStats: (days, countries, records) =>
      `${days} días muestreados · ${countries} regiones observadas · ${records} observaciones`,
    coverageNote:
      "La cobertura describe las observaciones brutas recuperadas y no establece el instante exacto en que entró en vigor un cambio entre dos capturas.",
    latest100Note: "Mostrando los últimos 100 eventos confirmados.",
    recentSnapshotsTitle: "Capturas originales recientes",
    recentSnapshotsDesc: "Inspecciona los planes y textos originales de precios conservados en cada captura.",
    directoryAria: "Explorar historial de precios por servicio",
    directoryHeading: "Historial de Precios por Servicio",
    directoryDesc:
      "Abre el archivo dedicado de cada servicio para revisar su cobertura regional de 120 días, ajustes confirmados y capturas originales.",
    directoryBack: "Resumen de todos los servicios",
    changesIn120d: (count) => `${count} ${count === 1 ? "cambio" : "cambios"} en 120d`,
    stableRecently: "Estable recientemente",
    windowNote:
      "Ventana: últimos 120 días, paginada con un límite de seguridad de 50.000 observaciones recientes. Las fechas de captura no determinan el momento exacto del ajuste.",
    truncatedSuffix: " Se alcanzó el límite de lectura; este historial no está completo.",
    sequenceBreakNote: "La falta de ciclo, interrupciones de revisión o cambios de fuente cortan la comparación.",
  },
};

type HistoryProps = { locale: HubLocale; slug?: string; pageClass?: string };

export async function HistoryPage(props: HistoryProps) {
  const { locale, slug } = props;
  const copy = historyPageCopy[locale];
  const ui = canvasUiCopy[locale];
  const className = "gs-public-unified gs-evidence-page gs-history-page";
  const useFixture = isHomepageFixtureEnabled();

  let products;
  try {
    products = useFixture ? fictionalPriceRecordProducts() : await loadProducts();
  } catch {
    return (
      <div className={className}>
        <PageHeading locale={locale} title={copy.baseTitle} description="App Store" />
        <Unavailable locale={locale} />
      </div>
    );
  }

  const product = slug ? products.find((item) => item.slug === slug) : null;
  if (slug && !product) notFound();

  let result = null;
  let unavailable = false;
  let globalRadar: { events: RadarEventItem[]; observedCodes: string[] } = { events: [], observedCodes: [] };

  try {
    globalRadar = await loadPriceHistoryGlobalRadar();
  } catch {
    globalRadar = { events: [], observedCodes: [] };
  }

  if (product) {
    try {
      if (useFixture) {
        const productRecords = fictionalPriceHistoryRecords().filter((row) => row.productSlug === product.slug);
        const observedCodes = [
          ...new Set(productRecords.filter((row) => /^[A-Z]{2}$/.test(row.countryCode)).map((row) => row.countryCode)),
        ].sort();
        result = { ...getPriceHistorySummary(productRecords), observedCodes, truncated: false };
      } else {
        result = await loadRecords(product.slug);
      }
    } catch {
      unavailable = true;
    }
  }

  const events = result?.events || [];
  const snapshots = result?.snapshots || [];
  const productRadarEvents: RadarEventItem[] = product
    ? events.map(({ before, after, direction, percent }) => ({
        id: after.id,
        beforeId: before.id,
        productSlug: product.slug,
        productName: product.name,
        planName: after.planName,
        countryCode: after.countryCode,
        observedAt: after.observedAt,
        beforeObservedAt: before.observedAt,
        beforeAmount: before.amount,
        afterAmount: after.amount,
        currency: after.currency,
        billingCycle: after.billingCycle,
        direction,
        percent,
      }))
    : [];

  const productEventCounts: Record<string, number> = {};
  for (const event of globalRadar.events) {
    productEventCounts[event.productSlug] = (productEventCounts[event.productSlug] ?? 0) + 1;
  }

  const sortedDirectoryProducts = [...products].sort((a, b) => {
    const countA = productEventCounts[a.slug] ?? 0;
    const countB = productEventCounts[b.slug] ?? 0;
    if (countA !== countB) return countB - countA;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className={className}>
      {useFixture && (
        <aside className="gs-home-test-data" role="note">
          {ui.home.fixtureBanner}
        </aside>
      )}

      {product && (
        <nav className="gs-history-breadcrumb" aria-label={ui.common.breadcrumbAria}>
          <Link href={`/${locale}/price-history`}>
            <ArrowLeft size={16} aria-hidden="true" />
            {copy.allRecords}
          </Link>
          <span aria-hidden="true">/</span>
          <span>{product.name}</span>
        </nav>
      )}

      <PageHeading
        centered={false}
        locale={locale}
        identity={product ? <BrandIcon product={product} size="lg" priority /> : undefined}
        title={product ? copy.productTitle(product.name) : copy.baseTitle}
        description={copy.description}
      />

      {!unavailable && (
        <PriceHistoryRadarClient
          locale={locale}
          map={homepageMap}
          events={product ? productRadarEvents : globalRadar.events}
          observedCodes={product ? (result?.observedCodes ?? []) : globalRadar.observedCodes}
          productName={product?.name}
          showProductColumn={!product}
        />
      )}

      {result && result.coverage.recordCount > 0 ? (
        <PublicSection className="mb-6 p-5 md:p-6">
          <h2 className={headingClass}>{copy.coverageHeading}</h2>
          <p className={`mt-2 ${mutedClass}`}>
            {copy.coverageStats(
              result.coverage.observedDays,
              result.coverage.countryCount,
              result.coverage.recordCount.toLocaleString(),
            )}
          </p>
          <p className={`mt-2 ${metaClass}`}>
            {dateTime(result.coverage.firstObservedAt!, locale)} → {dateTime(result.coverage.lastObservedAt!, locale)}
          </p>
          <p className={`mt-2 ${metaClass}`}>{copy.coverageNote}</p>
        </PublicSection>
      ) : null}

      {unavailable ? <Unavailable locale={locale} /> : null}

      {(result?.eventCount || 0) > 100 ? <p className={mutedClass}>{copy.latest100Note}</p> : null}

      {snapshots.length ? (
        <PublicSection className="mt-6">
          <PublicSectionHeader
            title={copy.recentSnapshotsTitle}
            description={copy.recentSnapshotsDesc}
          />
          <div className="divide-y divide-[var(--color-border-default)]">
            {snapshots.map((snapshot) => (
              <Link
                key={snapshot.id}
                href={`/${locale}/price-records/${snapshot.id}`}
                className="flex min-h-11 items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--color-bg-subtle)] md:px-6"
              >
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {countryName(snapshot.countryCode, locale)} · {snapshot.planName}
                  </span>
                  <p className={`mt-1 ${metaClass}`}>{snapshot.observedAt.slice(0, 10)} · App Store</p>
                </div>
                <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-[var(--color-text-muted)]" />
              </Link>
            ))}
          </div>
        </PublicSection>
      ) : null}

      {sortedDirectoryProducts.length > 0 && (
        <nav className="gs-history-directory" aria-label={copy.directoryAria}>
          <div className="gs-history-directory-head">
            <div>
              <h2>{copy.directoryHeading}</h2>
              <p>{copy.directoryDesc}</p>
            </div>
            {product && (
              <Link className="gs-history-directory-back" href={`/${locale}/price-history`}>
                <ArrowLeft size={14} aria-hidden="true" />
                {copy.directoryBack}
              </Link>
            )}
          </div>
          <div className="gs-history-directory-grid">
            {sortedDirectoryProducts.map((item) => {
              const count = productEventCounts[item.slug] ?? 0;
              return (
                <Link
                  key={item.slug}
                  href={`/${locale}/price-history/${item.slug}`}
                  aria-current={product?.slug === item.slug ? "page" : undefined}
                  className="gs-history-directory-tile"
                >
                  <BrandIcon product={item} size="sm" decorative className="gs-history-directory-brand" />
                  <div className="gs-history-directory-copy">
                    <strong>{item.name}</strong>
                    <small data-has-changes={count > 0 || undefined}>
                      {count > 0 ? copy.changesIn120d(count) : copy.stableRecently}
                    </small>
                  </div>
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {result ? (
        <div className={`mt-6 ${metaClass}`}>
          <p>
            {copy.windowNote}
            {result.truncated ? copy.truncatedSuffix : ""}
          </p>
          <p className="mt-2">{copy.sequenceBreakNote}</p>
        </div>
      ) : null}
    </div>
  );
}

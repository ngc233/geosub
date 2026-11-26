import Link from "next/link";
import { notFound } from "next/navigation";
import { loadVerifiedPriceSource } from "../lib/cached-verified-price-source";
import { getComparablePriceRows, getCountryHubRows, getPriorityCountry } from "../lib/country-hubs";
import {
  getCountryDisplayName,
  getPublicCountryHref,
  resolvePublicCountryByCode,
  resolvePublicCountryBySlug,
} from "../lib/country-route-catalog";
import { countryCanvasRows, countrySummary } from "../lib/country-canvas";
import { homepageCountries, homepageDisplayRates } from "../lib/homepage-summary";
import { savingsPercent } from "../lib/homepage-display";
import { getCoreGuideDefinition } from "../lib/core-guide-content";
import { fictionalHomepageSource, isHomepageFixtureEnabled } from "../lib/test-fixtures/homepage";
import { canvasIntlLocale, canvasUiCopy, type CanvasLocale } from "../lib/canvas-ui-copy";
import PublicIcon from "./PublicIcon";
import PublicPriceNumber from "./PublicPriceNumber";
import CountryIdentity from "./CountryIdentity";
import { PublicComparisonBar } from "./PublicControls";
import CountryCanvasPricing from "./CountryCanvasPricing";
import CountryDataDisclosure from "./CountryDataDisclosure";

const countryPageCopy: Record<
  CanvasLocale,
  {
    titleSummary: (country: string, pct: number, cheaper: boolean) => string;
    titlePlain: (country: string) => string;
    methodBody: string;
    exploreAria: string;
    browseCountries: string;
    priceHistory: string;
    dataSources: string;
    notesHeading: (country: string) => string;
    notesItems: [string, string, string];
    peersHeading: string;
    peersSub: string;
    medianSavingsLabel: string;
    basedOnPlans: (count: number) => string;
    allCountries: string;
    introLead: (country: string) => string;
    introCountPrefix: string;
    introCountStrong: (count: number) => string;
    introCountSuffix: string;
    introTail: string;
    metricsAria: string;
    medianMetricSub: (cheaper: boolean) => string;
    cheaperMetricSub: string;
    bestMetricSub: (positive: boolean) => string;
    unavailableTitle: string;
    unavailableDesc: string;
    emptyTitle: string;
    emptyDesc: string;
  }
> = {
  zh: {
    titleSummary: (country, pct, cheaper) =>
      `在${country}订阅，一半比美国${cheaper ? "便宜" : "贵"} ${pct}% 以上`,
    titlePlain: (country) => `${country}订阅价格`,
    methodBody:
      "仅纳入最近 14 天内采集的已发布核验价格。样本数量只描述本站收录，不代表该国全部订阅或整体物价。每个可比套餐权重相同，使用原始美元值计算节省率并取中位数，负值保留。少于 5 个可比套餐时不显示中位数结论。",
    exploreAria: "价格探索",
    browseCountries: "按国家找订阅",
    priceHistory: "价格变化记录",
    dataSources: "数据来源",
    notesHeading: (country) => `在${country}区订阅要注意`,
    notesItems: [
      "当地商店列出价格不代表其他地区账号可购买。",
      "账号、付款方式、服务覆盖与最终税费请以官方结算页为准。",
      "折算使用 18 小时内有效汇率；税费不重复加算。缺少汇率或美国同套餐价格时不生成价差。",
    ],
    peersHeading: "和其他地区比",
    peersSub: "各国订阅节省率的中位数",
    medianSavingsLabel: "节省率中位数",
    basedOnPlans: (count) => `按 ${count} 个订阅计算`,
    allCountries: "全部国家与地区",
    introLead: (country) => `按 App Store ${country}区的已核验月付价格，与美国同套餐逐个比较，`,
    introCountPrefix: "按 ",
    introCountStrong: (count) => `${count} 个订阅`,
    introCountSuffix: "计算。",
    introTail: "汇率变化会影响折算价。",
    metricsAria: "订阅价格统计",
    medianMetricSub: (cheaper) => `一半订阅至少${cheaper ? "低" : "高"}这么多`,
    cheaperMetricSub: "个订阅比美国便宜",
    bestMetricSub: (positive) => (positive ? "最多能省" : "最小涨幅"),
    unavailableTitle: "价格数据暂时无法读取",
    unavailableDesc: "请稍后重试；当前不显示未经核实的价格结论。",
    emptyTitle: "暂无符合条件的套餐",
    emptyDesc: "缺失、过期、待审或来源证据不足的价格不参与本页。请稍后回来查看。",
  },
  "zh-tw": {
    titleSummary: (country, pct, cheaper) =>
      `在${country}訂閱，一半比美國${cheaper ? "便宜" : "貴"} ${pct}% 以上`,
    titlePlain: (country) => `${country}訂閱價格`,
    methodBody:
      "僅納入最近 14 天內採集的已發布核驗價格。樣本數量僅描述本站收錄，不代表該國全部訂閱或整體物價。每個可比方案權重相同，使用原始美元值計算節省率並取中位數，負值保留。少於 5 個可比方案時不顯示中位數結論。",
    exploreAria: "價格探索",
    browseCountries: "按國家找訂閱",
    priceHistory: "價格變化紀錄",
    dataSources: "資料來源",
    notesHeading: (country) => `在${country}區訂閱要注意`,
    notesItems: [
      "當地商店列出價格不代表其他地區帳號可購買。",
      "帳號地區、付款方式、服務涵蓋與最終稅費請以官方結帳頁為準。",
      "換算使用 18 小時內有效匯率；稅費不重複加算。缺少匯率或美國同方案價格時不產生價差。",
    ],
    peersHeading: "和其他地區比",
    peersSub: "各國訂閱節省率的中位數",
    medianSavingsLabel: "節省率中位數",
    basedOnPlans: (count) => `按 ${count} 個訂閱計算`,
    allCountries: "全部國家與地區",
    introLead: (country) => `按 App Store ${country}區的已核驗月付價格，與美國同方案逐個比較，`,
    introCountPrefix: "按 ",
    introCountStrong: (count) => `${count} 個訂閱`,
    introCountSuffix: "計算。",
    introTail: "匯率波動會影響換算價。",
    metricsAria: "訂閱價格統計",
    medianMetricSub: (cheaper) => `一半訂閱至少${cheaper ? "低" : "高"}這麼多`,
    cheaperMetricSub: "個訂閱比美國便宜",
    bestMetricSub: (positive) => (positive ? "最多能省" : "最小漲幅"),
    unavailableTitle: "價格資料暫時無法讀取",
    unavailableDesc: "請稍後重試；目前不顯示未經核實的價格結論。",
    emptyTitle: "暫無符合條件的方案",
    emptyDesc: "缺失、過期、待審或來源證據不足的價格不參與本頁。請稍後回來查看。",
  },
  en: {
    titleSummary: (country, pct, cheaper) =>
      `Subscriptions in ${country}: median is ${pct}% ${cheaper ? "cheaper" : "higher"} than the US`,
    titlePlain: (country) => `${country} Subscription Prices`,
    methodBody:
      "Includes published, verified App Store prices collected within the last 14 days. Sample counts describe this catalogue rather than national inflation. Each comparable plan carries equal weight; median savings are computed from exact USD equivalents (retaining negative values) when at least 5 comparable plans exist.",
    exploreAria: "Explore pricing",
    browseCountries: "Browse countries",
    priceHistory: "Price history",
    dataSources: "Data sources",
    notesHeading: (country) => `Before subscribing in ${country}`,
    notesItems: [
      "A local store listing does not guarantee cross-region purchase eligibility.",
      "Account region, payment method, service availability, and final taxes are governed by official checkout.",
      "Conversions use FX snapshots within 18 hours without double-counting taxes; missing FX or US baselines produce no diff.",
    ],
    peersHeading: "Compare with Other Regions",
    peersSub: "Median subscription savings vs US",
    medianSavingsLabel: "Median savings",
    basedOnPlans: (count) => `Based on ${count} plans`,
    allCountries: "All countries & regions",
    introLead: (country) =>
      `Verified monthly App Store prices in ${country}, compared plan-by-plan against the US`,
    introCountPrefix: " across ",
    introCountStrong: (count) => `${count} subscriptions`,
    introCountSuffix: "",
    introTail: ". Exchange-rate movements affect converted totals.",
    metricsAria: "Subscription price metrics",
    medianMetricSub: (cheaper) => `Median plan is ${cheaper ? "lower" : "higher"}`,
    cheaperMetricSub: "plans cheaper than US",
    bestMetricSub: (positive) => (positive ? "max savings" : "smallest markup"),
    unavailableTitle: "Pricing data temporarily unavailable",
    unavailableDesc: "Please retry shortly; unverified figures are withheld.",
    emptyTitle: "No eligible plans currently",
    emptyDesc:
      "Missing, stale, pending, or insufficiently sourced prices are excluded. Please check back later.",
  },
  ja: {
    titleSummary: (country, pct, cheaper) =>
      `${country}のサブスク料金：中央値は米国より ${pct}% ${cheaper ? "安い" : "高い"}`,
    titlePlain: (country) => `${country}のサブスクリプション価格`,
    methodBody:
      "直近14日以内に取得された公開・検証済みの App Store 価格のみを対象としています。件数は当サイトの収録範囲を示すもので、国全体の物価水準を表すものではありません。比較可能な各プランを均等加重とし、5件以上ある場合に正確な米ドル換算値（マイナス値を含む）から節約率の中央値を算出しています。",
    exploreAria: "価格データを探す",
    browseCountries: "国別に探す",
    priceHistory: "価格改定履歴",
    dataSources: "データソース",
    notesHeading: (country) => `${country}ストアで契約する前の注意点`,
    notesItems: [
      "現地ストアに価格が表示されていても、他地域アカウントから購入できるとは限りません。",
      "アカウント地域、支払い方法、提供範囲、最終税額は公式の決済画面に従います。",
      "通貨換算には18時間以内の為替レートを使用し、税金の二重計上は行いません。為替または米国基準がない場合は価格差を算出しません。",
    ],
    peersHeading: "他の国・地域と比較",
    peersSub: "米国基準に対する節約率の中央値",
    medianSavingsLabel: "節約率の中央値",
    basedOnPlans: (count) => `${count} プランで算出`,
    allCountries: "すべての国・地域",
    introLead: (country) =>
      `${country}の App Store 検証済み月額価格を米国の同一プランと個別に比較`,
    introCountPrefix: "（",
    introCountStrong: (count) => `${count} 件のサブスク`,
    introCountSuffix: "対象）",
    introTail: "。為替変動により換算額は変動します。",
    metricsAria: "サブスクリプション価格統計",
    medianMetricSub: (cheaper) => `半数のプランがこれ以上${cheaper ? "割安" : "割高"}`,
    cheaperMetricSub: "プランが米国より割安",
    bestMetricSub: (positive) => (positive ? "最大節約率" : "最小上乗せ幅"),
    unavailableTitle: "価格データを一時的に読み込めません",
    unavailableDesc: "しばらくしてから再度お試しください。未検証の数値は表示しません。",
    emptyTitle: "条件を満たすプランがありません",
    emptyDesc: "未取得、期限切れ、審査中、または根拠不十分な価格は除外されています。",
  },
  ko: {
    titleSummary: (country, pct, cheaper) =>
      `${country} 구독 가격: 중앙값이 미국보다 ${pct}% ${cheaper ? "저렴" : "비쌈"}`,
    titlePlain: (country) => `${country} 구독 가격`,
    methodBody:
      "최근 14일 이내 수집된 공개·검증 완료 App Store 가격만 포함합니다. 표본 수는 본 사이트 수록 범위를 나타내며 국가 전체 물가를 대변하지 않습니다. 비교 가능한 각 요금제는 동일 가중치를 가지며, 5개 이상일 때 정확한 미화 환산값(음수 포함)으로 절약률 중앙값을 계산합니다.",
    exploreAria: "가격 데이터 탐색",
    browseCountries: "국가별 탐색",
    priceHistory: "가격 변동 기록",
    dataSources: "데이터 출처",
    notesHeading: (country) => `${country} 스토어 구독 전 유의사항`,
    notesItems: [
      "현지 스토어에 표시된 가격이 타 지역 계정의 구매 가능 여부를 보장하지는 않습니다.",
      "계정 국가, 결제 수단, 서비스 제공 범위 및 최종 세금은 공식 결제 페이지 기준입니다.",
      "환산에는 18시간 이내 유효 환율을 사용하며 세금을 중복 합산하지 않습니다. 환율 또는 미국 기준가가 없으면 차이를 표시하지 않습니다.",
    ],
    peersHeading: "다른 국가·지역과 비교",
    peersSub: "미국 기준 대비 구독 절약률 중앙값",
    medianSavingsLabel: "절약률 중앙값",
    basedOnPlans: (count) => `구독 ${count}개 기준`,
    allCountries: "전체 국가 및 지역",
    introLead: (country) =>
      `${country} App Store의 검증된 월간 가격을 미국 동일 요금제와 개별 비교`,
    introCountPrefix: " (",
    introCountStrong: (count) => `구독 ${count}개`,
    introCountSuffix: " 기준)",
    introTail: ". 환율 변동에 따라 환산 금액이 달라질 수 있습니다.",
    metricsAria: "구독 가격 통계",
    medianMetricSub: (cheaper) => `절반 이상의 구독이 최소 이만큼 ${cheaper ? "저렴" : "비쌈"}`,
    cheaperMetricSub: "개 요금제가 미국보다 저렴",
    bestMetricSub: (positive) => (positive ? "최대 절약폭" : "최소 인상폭"),
    unavailableTitle: "가격 데이터를 일시적으로 불러올 수 없습니다",
    unavailableDesc: "잠시 후 다시 시도해 주세요. 검증되지 않은 수치는 표시하지 않습니다.",
    emptyTitle: "조건에 부합하는 요금제가 없습니다",
    emptyDesc: "누락, 만료, 검토 대기 또는 출처 근거가 부족한 가격은 제외됩니다.",
  },
  es: {
    titleSummary: (country, pct, cheaper) =>
      `Suscripciones en ${country}: la mediana es un ${pct}% más ${cheaper ? "barata" : "cara"} que en EE. UU.`,
    titlePlain: (country) => `Precios de Suscripciones en ${country}`,
    methodBody:
      "Incluye únicamente precios públicos verificados de App Store capturados en los últimos 14 días. El tamaño de muestra describe este catálogo y no la inflación nacional. Cada plan comparable tiene el mismo peso; el ahorro mediano se calcula sobre equivalentes exactos en USD (conservando valores negativos) cuando existen al menos 5 planes comparables.",
    exploreAria: "Explorar precios",
    browseCountries: "Explorar países",
    priceHistory: "Historial de precios",
    dataSources: "Fuentes de datos",
    notesHeading: (country) => `Antes de suscribirte en ${country}`,
    notesItems: [
      "Que figure un precio en la tienda local no garantiza elegibilidad de compra desde otra región.",
      "La región de la cuenta, el método de pago, la disponibilidad y los impuestos finales dependen del pago oficial.",
      "Las conversiones usan tipos de cambio de las últimas 18 horas sin duplicar impuestos; sin cambio o sin base de EE. UU. no se calcula diferencia.",
    ],
    peersHeading: "Comparar con Otras Regiones",
    peersSub: "Ahorro mediano de suscripciones frente a EE. UU.",
    medianSavingsLabel: "Ahorro mediano",
    basedOnPlans: (count) => `Basado en ${count} planes`,
    allCountries: "Todos los países y regiones",
    introLead: (country) =>
      `Precios mensuales verificados de App Store en ${country}, comparados plan por plan frente a EE. UU.`,
    introCountPrefix: " en ",
    introCountStrong: (count) => `${count} suscripciones`,
    introCountSuffix: "",
    introTail: ". Las variaciones cambiarias afectan el total convertido.",
    metricsAria: "Métricas de precios de suscripción",
    medianMetricSub: (cheaper) => `El plan mediano es más ${cheaper ? "bajo" : "alto"}`,
    cheaperMetricSub: "planes más baratos que EE. UU.",
    bestMetricSub: (positive) => (positive ? "ahorro máximo" : "menor sobrecoste"),
    unavailableTitle: "Datos de precios no disponibles temporalmente",
    unavailableDesc: "Vuelve a intentarlo en breve; no mostramos cifras sin verificar.",
    emptyTitle: "No hay planes elegibles actualmente",
    emptyDesc:
      "Se excluyen precios faltantes, vencidos, pendientes o sin respaldo suficiente. Vuelve a consultar más tarde.",
  },
};

export default async function CountryCanvasPage({
  countrySlug,
  locale = "zh",
}: {
  countrySlug: string;
  locale?: CanvasLocale;
}) {
  const copy = countryPageCopy[locale];
  const common = canvasUiCopy[locale].common;
  const intlLocale = canvasIntlLocale(locale);
  const country = getPriorityCountry(countrySlug) ?? resolvePublicCountryBySlug(countrySlug);
  if (!country) notFound();
  const countryLabel = getCountryDisplayName(country, locale);
  let source;
  try {
    source = isHomepageFixtureEnabled() ? fictionalHomepageSource() : await loadVerifiedPriceSource();
  } catch (error) {
    console.error({ event: "country_canvas_read_failed", errorType: error instanceof Error ? "Error" : typeof error });
  }
  const now = new Date();
  const rows = source ? getCountryHubRows(source.prices, country.code, source.rates, now) : [];
  const summary = countrySummary(rows, country.code, locale);
  const peers = source
    ? homepageCountries(getComparablePriceRows(source.prices, source.rates, now), locale)
        .filter((row) => Boolean(resolvePublicCountryByCode(row.code)))
        .slice(0, 6)
    : [];

  const title = summary
    ? copy.titleSummary(countryLabel, savingsPercent(summary.median), summary.median >= 0)
    : copy.titlePlain(countryLabel);

  const guide = getCoreGuideDefinition(
    locale as Parameters<typeof getCoreGuideDefinition>[0],
    "payment-account",
  );

  const method = (
    <aside className="gs-country-method">
      <p>{copy.methodBody}</p>
      <nav aria-label={copy.exploreAria}>
        <Link href={`/${locale}/countries`}>{copy.browseCountries}</Link>
        <Link href={`/${locale}/price-history`}>{copy.priceHistory}</Link>
        <Link href={`/${locale}/data-sources`}>{copy.dataSources}</Link>
      </nav>
    </aside>
  );

  const support = (
    <div className="gs-country-support">
      <section className="gs-country-panel gs-country-notes">
        <h2>{copy.notesHeading(countryLabel)}</h2>
        <ol>
          {copy.notesItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <Link href={`/${locale}/guides/payment-account`}>
          {guide.title}
          <PublicIcon name="ArrowRight" size={16} />
        </Link>
      </section>

      {peers.length > 1 && (
        <section className="gs-country-panel gs-country-peers">
          <div>
            <h2>{copy.peersHeading}</h2>
            <small>{copy.peersSub}</small>
          </div>
          {peers.map((peer) => {
            const target = resolvePublicCountryByCode(peer.code)!;
            const peerHref = getPublicCountryHref(peer.code, locale) ?? `/${locale}/countries`;
            return (
              <Link
                key={peer.code}
                href={peerHref}
                aria-current={peer.code === country.code ? "page" : undefined}
                data-gs-motion-card
              >
                <span className="gs-country-flag">
                  <CountryIdentity code={peer.code} defer />
                </span>
                <strong>{getCountryDisplayName(target, locale)}</strong>
                <PublicComparisonBar
                  label={copy.medianSavingsLabel}
                  value={Math.abs(peer.median)}
                  maximum={1}
                  tone={peer.median >= 0 ? "low" : "high"}
                  hideValue
                />
                <span data-tone={peer.median >= 0 ? "low" : "high"}>
                  {peer.median >= 0 ? "−" : "+"}
                  {savingsPercent(peer.median)}%
                </span>
                <small>{copy.basedOnPlans(peer.count)}</small>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );

  return (
    <div className="gs-public-unified gs-country-scope">
      <div className="gs-country-page">
        <nav className="gs-country-breadcrumb" aria-label={common.breadcrumbAria}>
          <Link href={`/${locale}/countries`}>{copy.allCountries}</Link>
          <span aria-hidden="true">/</span>
          <span>{countryLabel}</span>
        </nav>
        <header className="gs-country-intro">
          <div className="gs-country-lead">
            <div className="gs-country-title">
              <span className="gs-country-flag">
                <CountryIdentity code={country.code} fetchPriority="low" />
              </span>
              <h1>{title}</h1>
            </div>
            <p>
              {copy.introLead(countryLabel)}
              {summary && (
                <>
                  {copy.introCountPrefix}
                  <strong>{copy.introCountStrong(summary.count)}</strong>
                  {copy.introCountSuffix}
                </>
              )}
              {copy.introTail}
            </p>
          </div>
          {summary && (
            <div className="gs-country-metrics" aria-label={copy.metricsAria}>
              <div data-highlight={summary.median >= 0}>
                <strong>
                  <PublicPriceNumber
                    value={savingsPercent(summary.median)}
                    fractionDigits={0}
                    locale={intlLocale}
                    prefix={summary.median >= 0 ? "−" : "+"}
                    suffix="%"
                    countIn
                  />
                </strong>
                <span>{copy.medianMetricSub(summary.median >= 0)}</span>
              </div>
              <div>
                <strong>
                  <PublicPriceNumber
                    value={summary.cheaper}
                    fractionDigits={0}
                    locale={intlLocale}
                    countIn
                  />
                  <small>/{summary.count}</small>
                </strong>
                <span>{copy.cheaperMetricSub}</span>
              </div>
              <div>
                <strong data-tone={summary.best >= 0 ? "low" : "high"}>
                  <PublicPriceNumber
                    value={savingsPercent(summary.best)}
                    fractionDigits={0}
                    locale={intlLocale}
                    suffix="%"
                    countIn
                  />
                </strong>
                <span>{copy.bestMetricSub(summary.best >= 0)}</span>
              </div>
            </div>
          )}
        </header>
        {!source ? (
          <section className="gs-country-panel" role="status">
            <h2>{copy.unavailableTitle}</h2>
            <p>{copy.unavailableDesc}</p>
          </section>
        ) : !rows.length ? (
          <section className="gs-country-panel" role="status">
            <h2>{copy.emptyTitle}</h2>
            <p>{copy.emptyDesc}</p>
          </section>
        ) : (
          <CountryCanvasPricing
            locale={locale}
            name={countryLabel}
            rows={countryCanvasRows(rows, now, locale)}
            rates={homepageDisplayRates(source.rates, now)}
            method={method}
            support={support}
          />
        )}
        {!rows.length && (
          <>
            {support}
            <CountryDataDisclosure locale={locale}>{method}</CountryDataDisclosure>
          </>
        )}
      </div>
    </div>
  );
}

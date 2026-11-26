"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import BrandIcon from "./BrandIcon";
import HomepageCountryFlag from "./HomepageCountryFlag";
import PublicIcon from "./PublicIcon";
import { PublicSegments } from "./PublicControls";
import PublicWorldMapStage, { PublicMapCapsules, type WorldMapDot } from "./PublicWorldMapStage";
import { getBillingCycleLabel } from "../lib/billing-cycle-label";
import { getLocalizedRegionName } from "../lib/locale-format";
import { getCanvasPlanDisplayName } from "../lib/homepage-display";
import type { ProductPlan } from "../lib/public-pricing-model";
import { buildPriceHistoryRadar, type RadarEventItem } from "../lib/public-map-views";
import { canvasIntlLocale, canvasUiCopy, type CanvasLocale } from "../lib/canvas-ui-copy";

const ALL_REGIONS_ID = "__ALL__";

function formatLocalMoney(amount: number, currency: string, locale: CanvasLocale) {
  return new Intl.NumberFormat(canvasIntlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

const radarCopyByLocale: Record<
  CanvasLocale,
  {
    monitoredDotAria: (name: string) => string;
    changedDotAria: (name: string, count: number) => string;
    panelAria: string;
    headingProduct: (productName: string) => string;
    headingGlobal: string;
    legendAria: string;
    dropsPill: (count: number) => string;
    hikesPill: (count: number) => string;
    changedRegionsPill: (changed: number, monitored: number) => string;
    unchangedRegionsPill: (monitored: number) => string;
    filterDirectionLabel: string;
    dropsOption: string;
    hikesOption: string;
    mapAriaProduct: (productName: string) => string;
    mapAriaGlobal: string;
    pickerLabel: string;
    bubbleDrop: string;
    bubbleHike: string;
    bubbleEventsSuffix: (count: number) => string;
    bubbleNoChangePrefix: string;
    bubbleUnchangedText: string;
    bubbleStableTag: string;
    capsulesLabel: string;
    allChangedRegions: string;
    allChangedCount: (count: number) => string | number;
    nodeMultipleCount: (count: number) => string;
    noteChanged: string;
    noteUnchanged: (monitored: number) => string;
    tableHeadingCountry: (country: string) => string;
    tableHeadingProduct: (productName: string) => string;
    tableHeadingGlobal: string;
    verifiedRecordsCount: (count: number) => string;
    showAllRegions: string;
    cols: [string, string, string, string, string];
    defaultMonthly: string;
    priorPrefix: string;
    hikeBadge: string;
    dropBadge: string;
    beforeLink: string;
    afterLink: string;
    emptyCardAria: string;
    emptyNoDrops: string;
    emptyNoHikes: string;
    emptyStableProduct: (productName: string) => string;
    emptyStableGlobal: string;
    emptyDesc: string;
  }
> = {
  zh: {
    monitoredDotAria: (name) => `${name} 已纳入监测，近 120 天官方标价未变`,
    changedDotAria: (name, count) => `${name} 近 120 天 ${count} 次官方调价（点击筛选记录）`,
    panelAria: "全球订阅官方调价地图",
    headingProduct: (product) => `${product} · 近 120 天官方调价地图`,
    headingGlobal: "全球订阅调价地图 · 近 120 天 App Store 官方改价",
    legendAria: "调价统计",
    dropsPill: (count) => `降价 ${count} 次`,
    hikesPill: (count) => `涨价 ${count} 次`,
    changedRegionsPill: (changed, monitored) => `涉及 ${changed} 个地区（共监测 ${monitored} 区）`,
    unchangedRegionsPill: (monitored) => `已监测 ${monitored} 个地区 · 近 120 天官方标价均未变动`,
    filterDirectionLabel: "调价方向筛选",
    dropsOption: "降价",
    hikesOption: "涨价",
    mapAriaProduct: (product) => `${product} 全球调价分布地图`,
    mapAriaGlobal: "全球订阅官方调价分布地图",
    pickerLabel: "查看地区",
    bubbleDrop: "官方降价",
    bubbleHike: "官方涨价",
    bubbleEventsSuffix: (count) => ` · 共 ${count} 次`,
    bubbleNoChangePrefix: "近期无调价 · ",
    bubbleUnchangedText: "当地标价未变",
    bubbleStableTag: "稳定",
    capsulesLabel: "按调价地区筛选",
    allChangedRegions: "全部调价地区",
    allChangedCount: (count) => `${count}条`,
    nodeMultipleCount: (count) => `${count}次`,
    noteChanged: "悬停预览调价详情，点击地图高亮圆点或下方地区胶囊可筛选调价记录；日常汇率波动不计入调价",
    noteUnchanged: (monitored) =>
      `过去 120 天内，已监测的 ${monitored} 个地区 App Store 当地标价均未调整（日常折算金额波动仅来自实时汇率变化）`,
    tableHeadingCountry: (country) => `${country} · 官方调价记录`,
    tableHeadingProduct: (product) => `${product} · 近 120 天官方调价记录`,
    tableHeadingGlobal: "近 120 天官方调价记录",
    verifiedRecordsCount: (count) => `共 ${count} 条已核验记录`,
    showAllRegions: "显示全部地区",
    cols: ["调价日期", "订阅套餐与地区", "当地官方标价", "变动幅度", "核验快照"],
    defaultMonthly: "月付",
    priorPrefix: "前次采集 ",
    hikeBadge: "涨价",
    dropBadge: "降价",
    beforeLink: "调价前",
    afterLink: "调价后",
    emptyCardAria: "调价状态说明",
    emptyNoDrops: "近 120 天暂无官方降价记录",
    emptyNoHikes: "近 120 天暂无官方涨价记录",
    emptyStableProduct: (product) => `${product} 近 120 天官方标价保持稳定`,
    emptyStableGlobal: "近 120 天全站已监测订阅官方标价保持稳定",
    emptyDesc:
      "我们持续比对同一套餐、同一地区与同一计费周期的 App Store 当地标价；若日常人民币或美元扣款金额有轻微浮动，通常来自实时汇率变化而非官方改价。",
  },
  "zh-tw": {
    monitoredDotAria: (name) => `${name} 已納入監測，近 120 天官方標價未變`,
    changedDotAria: (name, count) => `${name} 近 120 天 ${count} 次官方調價（點擊篩選紀錄）`,
    panelAria: "全球訂閱官方調價地圖",
    headingProduct: (product) => `${product} · 近 120 天官方調價地圖`,
    headingGlobal: "全球訂閱調價地圖 · 近 120 天 App Store 官方改價",
    legendAria: "調價統計",
    dropsPill: (count) => `降價 ${count} 次`,
    hikesPill: (count) => `漲價 ${count} 次`,
    changedRegionsPill: (changed, monitored) => `涵蓋 ${changed} 個地區（共監測 ${monitored} 區）`,
    unchangedRegionsPill: (monitored) => `已監測 ${monitored} 個地區 · 近 120 天官方標價均未變動`,
    filterDirectionLabel: "調價方向篩選",
    dropsOption: "降價",
    hikesOption: "漲價",
    mapAriaProduct: (product) => `${product} 全球調價分布地圖`,
    mapAriaGlobal: "全球訂閱官方調價分布地圖",
    pickerLabel: "查看地區",
    bubbleDrop: "官方降價",
    bubbleHike: "官方漲價",
    bubbleEventsSuffix: (count) => ` · 共 ${count} 次`,
    bubbleNoChangePrefix: "近期無調價 · ",
    bubbleUnchangedText: "當地標價未變",
    bubbleStableTag: "穩定",
    capsulesLabel: "按調價地區篩選",
    allChangedRegions: "全部調價地區",
    allChangedCount: (count) => `${count}筆`,
    nodeMultipleCount: (count) => `${count}次`,
    noteChanged: "懸停預覽調價詳情，點擊地圖高亮圓點或下方地區膠囊可篩選調價紀錄；日常匯率波動不計入調價",
    noteUnchanged: (monitored) =>
      `過去 120 天內，已監測的 ${monitored} 個地區 App Store 當地標價均未調整（日常換算金額波動僅來自即時匯率變化）`,
    tableHeadingCountry: (country) => `${country} · 官方調價紀錄`,
    tableHeadingProduct: (product) => `${product} · 近 120 天官方調價紀錄`,
    tableHeadingGlobal: "近 120 天官方調價紀錄",
    verifiedRecordsCount: (count) => `共 ${count} 筆已核驗紀錄`,
    showAllRegions: "顯示全部地區",
    cols: ["調價日期", "訂閱方案與地區", "當地官方標價", "變動幅度", "核驗快照"],
    defaultMonthly: "月付",
    priorPrefix: "前次採集 ",
    hikeBadge: "漲價",
    dropBadge: "降價",
    beforeLink: "調價前",
    afterLink: "調價後",
    emptyCardAria: "調價狀態說明",
    emptyNoDrops: "近 120 天暫無官方降價紀錄",
    emptyNoHikes: "近 120 天暫無官方漲價紀錄",
    emptyStableProduct: (product) => `${product} 近 120 天官方標價保持穩定`,
    emptyStableGlobal: "近 120 天全站已監測訂閱官方標價保持穩定",
    emptyDesc:
      "我們持續比對同一方案、同一地區與同一計費週期的 App Store 當地標價；若日常刷卡或換算扣款金額有輕微浮動，通常來自即時匯率變化而非官方改價。",
  },
  en: {
    monitoredDotAria: (name) => `${name} monitored, local list price unchanged in the last 120 days`,
    changedDotAria: (name, count) =>
      `${name}: ${count} official price ${count === 1 ? "change" : "changes"} in 120 days (click to filter)`,
    panelAria: "Global official price-change map",
    headingProduct: (product) => `${product} · 120-Day Official Price Change Map`,
    headingGlobal: "Global Price-Change Radar · 120-Day App Store Adjustments",
    legendAria: "Price change summary",
    dropsPill: (count) => `Drops ${count}`,
    hikesPill: (count) => `Hikes ${count}`,
    changedRegionsPill: (changed, monitored) => `${changed} regions changed (${monitored} monitored)`,
    unchangedRegionsPill: (monitored) => `${monitored} regions monitored · Unchanged in last 120 days`,
    filterDirectionLabel: "Filter by direction",
    dropsOption: "Drops",
    hikesOption: "Hikes",
    mapAriaProduct: (product) => `${product} global price change map`,
    mapAriaGlobal: "Global official subscription price change map",
    pickerLabel: "Select region",
    bubbleDrop: "Price drop",
    bubbleHike: "Price hike",
    bubbleEventsSuffix: (count) => ` · ${count} events`,
    bubbleNoChangePrefix: "No recent change · ",
    bubbleUnchangedText: "Local list price unchanged",
    bubbleStableTag: "Stable",
    capsulesLabel: "Filter by changed region",
    allChangedRegions: "All changed regions",
    allChangedCount: (count) => count,
    nodeMultipleCount: (count) => `${count}x`,
    noteChanged:
      "Hover to preview price changes; click a highlighted marker or region pill to filter records. Daily FX movement is excluded.",
    noteUnchanged: (monitored) =>
      `Across ${monitored} monitored regions, official App Store local list prices were unchanged over the last 120 days (converted USD fluctuations reflect live FX only).`,
    tableHeadingCountry: (country) => `${country} · Confirmed Price Changes`,
    tableHeadingProduct: (product) => `${product} · 120-Day Confirmed Price Changes`,
    tableHeadingGlobal: "120-Day Confirmed Price Changes",
    verifiedRecordsCount: (count) => `${count} verified ${count === 1 ? "record" : "records"}`,
    showAllRegions: "Show all regions",
    cols: ["Observed date", "Plan & region", "Local list price", "Change", "Snapshots"],
    defaultMonthly: "Monthly",
    priorPrefix: "Prior ",
    hikeBadge: "Hike",
    dropBadge: "Drop",
    beforeLink: "Before",
    afterLink: "After",
    emptyCardAria: "Price stability note",
    emptyNoDrops: "No official price drops in the last 120 days",
    emptyNoHikes: "No official price hikes in the last 120 days",
    emptyStableProduct: (product) => `${product} official local prices remained stable over 120 days`,
    emptyStableGlobal: "Monitored official App Store list prices remained stable over 120 days",
    emptyDesc:
      "We compare local App Store list prices for the exact same plan, region, and billing period. Day-to-day shifts in converted USD or EUR charges reflect live exchange rates rather than official store price adjustments.",
  },
  ja: {
    monitoredDotAria: (name) => `${name} は監視対象・直近120日間の公式現地価格は変更なし`,
    changedDotAria: (name, count) => `${name}：直近120日間で ${count} 件の公式価格改定（クリックで絞り込み）`,
    panelAria: "世界の公式価格改定マップ",
    headingProduct: (product) => `${product} · 直近120日間の公式価格改定マップ`,
    headingGlobal: "世界の価格改定レーダー · 直近120日間の App Store 価格改定",
    legendAria: "価格改定の集計",
    dropsPill: (count) => `値下げ ${count} 件`,
    hikesPill: (count) => `値上げ ${count} 件`,
    changedRegionsPill: (changed, monitored) => `${changed} 地域で改定（${monitored} 地域を監視中）`,
    unchangedRegionsPill: (monitored) => `${monitored} 地域を監視中 · 直近120日間の現地価格変更なし`,
    filterDirectionLabel: "改定方向で絞り込み",
    dropsOption: "値下げ",
    hikesOption: "値上げ",
    mapAriaProduct: (product) => `${product} の世界価格改定マップ`,
    mapAriaGlobal: "世界の公式サブスク価格改定マップ",
    pickerLabel: "地域を選択",
    bubbleDrop: "公式値下げ",
    bubbleHike: "公式値上げ",
    bubbleEventsSuffix: (count) => ` · 計 ${count} 件`,
    bubbleNoChangePrefix: "直近の改定なし · ",
    bubbleUnchangedText: "現地価格は変更なし",
    bubbleStableTag: "安定",
    capsulesLabel: "改定地域で絞り込み",
    allChangedRegions: "すべての改定地域",
    allChangedCount: (count) => `${count}件`,
    nodeMultipleCount: (count) => `${count}回`,
    noteChanged:
      "ホバーで改定内容をプレビュー、強調マーカーや地域ピルをクリックして履歴を絞り込み可能（日々の為替変動は除外）",
    noteUnchanged: (monitored) =>
      `監視中の ${monitored} 地域において、過去120日間の App Store 公式現地価格に変更はありませんでした（換算額の変動は為替レートによるものです）。`,
    tableHeadingCountry: (country) => `${country} · 確認済みの価格改定`,
    tableHeadingProduct: (product) => `${product} · 直近120日間の確認済み価格改定`,
    tableHeadingGlobal: "直近120日間の確認済み価格改定",
    verifiedRecordsCount: (count) => `検証済みレコード ${count} 件`,
    showAllRegions: "すべての地域を表示",
    cols: ["観測日", "プラン・地域", "公式現地価格", "変動幅", "検証スナップショット"],
    defaultMonthly: "月額",
    priorPrefix: "前回取得 ",
    hikeBadge: "値上げ",
    dropBadge: "値下げ",
    beforeLink: "改定前",
    afterLink: "改定後",
    emptyCardAria: "価格安定に関する注記",
    emptyNoDrops: "直近120日間に公式の値下げ記録はありません",
    emptyNoHikes: "直近120日間に公式の値上げ記録はありません",
    emptyStableProduct: (product) => `${product} の公式現地価格は直近120日間安定しています`,
    emptyStableGlobal: "監視対象の App Store 公式現地価格は直近120日間安定しています",
    emptyDesc:
      "同一プラン・同一地域・同一請求サイクルの App Store 現地価格を継続比較しています。日々の決済額のわずかな変動は公式の価格改定ではなく為替レートの変動によるものです。",
  },
  ko: {
    monitoredDotAria: (name) => `${name} 모니터링 중, 최근 120일간 공식 현지 정가 변동 없음`,
    changedDotAria: (name, count) => `${name}: 최근 120일간 공식 가격 변동 ${count}회 (클릭하여 필터)`,
    panelAria: "글로벌 공식 가격 변동 지도",
    headingProduct: (product) => `${product} · 최근 120일 공식 가격 변동 지도`,
    headingGlobal: "글로벌 가격 변동 레이더 · 최근 120일 App Store 가격 조정",
    legendAria: "가격 변동 요약",
    dropsPill: (count) => `인하 ${count}건`,
    hikesPill: (count) => `인상 ${count}건`,
    changedRegionsPill: (changed, monitored) => `${changed}개 지역 변동 (총 ${monitored}개 지역 모니터링)`,
    unchangedRegionsPill: (monitored) => `${monitored}개 지역 모니터링 · 최근 120일간 현지 정가 변동 없음`,
    filterDirectionLabel: "변동 방향 필터",
    dropsOption: "인하",
    hikesOption: "인상",
    mapAriaProduct: (product) => `${product} 글로벌 가격 변동 지도`,
    mapAriaGlobal: "글로벌 공식 구독 가격 변동 지도",
    pickerLabel: "지역 선택",
    bubbleDrop: "공식 인하",
    bubbleHike: "공식 인상",
    bubbleEventsSuffix: (count) => ` · 총 ${count}회`,
    bubbleNoChangePrefix: "최근 변동 없음 · ",
    bubbleUnchangedText: "현지 정가 변동 없음",
    bubbleStableTag: "안정",
    capsulesLabel: "변동 지역별 필터",
    allChangedRegions: "전체 변동 지역",
    allChangedCount: (count) => `${count}건`,
    nodeMultipleCount: (count) => `${count}회`,
    noteChanged:
      "호버하여 변동 내역을 미리보고 강조 마커나 지역 캡슐을 클릭해 기록을 필터링하세요. 일일 환율 변동은 제외됩니다.",
    noteUnchanged: (monitored) =>
      `모니터링 중인 ${monitored}개 지역에서 지난 120일간 App Store 공식 현지 정가 변동이 없었습니다(환산 금액 변동은 실시간 환율에 따른 것입니다).`,
    tableHeadingCountry: (country) => `${country} · 확정된 가격 변동`,
    tableHeadingProduct: (product) => `${product} · 최근 120일 확정 가격 변동`,
    tableHeadingGlobal: "최근 120일 확정 가격 변동",
    verifiedRecordsCount: (count) => `검증된 기록 총 ${count}건`,
    showAllRegions: "전체 지역 보기",
    cols: ["관측일", "요금제 및 지역", "공식 현지 정가", "변동폭", "검증 스냅샷"],
    defaultMonthly: "월간",
    priorPrefix: "이전 수집 ",
    hikeBadge: "인상",
    dropBadge: "인하",
    beforeLink: "변동 전",
    afterLink: "변동 후",
    emptyCardAria: "가격 안정 안내",
    emptyNoDrops: "최근 120일간 공식 가격 인하 기록이 없습니다",
    emptyNoHikes: "최근 120일간 공식 가격 인상 기록이 없습니다",
    emptyStableProduct: (product) => `${product}의 공식 현지 가격은 최근 120일간 안정적으로 유지되었습니다`,
    emptyStableGlobal: "모니터링 중인 App Store 공식 현지 가격은 최근 120일간 안정적으로 유지되었습니다",
    emptyDesc:
      "동일한 요금제·지역·결제 주기의 App Store 현지 정가를 지속 비교합니다. 일일 원화·달러 결제 금액의 미세한 변동은 공식 가격 조정이 아닌 실시간 환율 변화에 따른 것입니다.",
  },
  es: {
    monitoredDotAria: (name) => `${name} monitorizado, sin cambios en el precio local en los últimos 120 días`,
    changedDotAria: (name, count) =>
      `${name}: ${count} ${count === 1 ? "cambio oficial" : "cambios oficiales"} en 120 días (clic para filtrar)`,
    panelAria: "Mapa mundial de cambios oficiales de precio",
    headingProduct: (product) => `${product} · Mapa de Cambios Oficiales (120 Días)`,
    headingGlobal: "Radar Global de Precios · Ajustes de App Store en 120 Días",
    legendAria: "Resumen de cambios de precio",
    dropsPill: (count) => `Bajadas ${count}`,
    hikesPill: (count) => `Subidas ${count}`,
    changedRegionsPill: (changed, monitored) => `${changed} regiones con cambios (${monitored} monitorizadas)`,
    unchangedRegionsPill: (monitored) => `${monitored} regiones monitorizadas · Sin cambios en 120 días`,
    filterDirectionLabel: "Filtrar por dirección",
    dropsOption: "Bajadas",
    hikesOption: "Subidas",
    mapAriaProduct: (product) => `Mapa mundial de cambios de precio de ${product}`,
    mapAriaGlobal: "Mapa mundial de cambios oficiales de suscripciones",
    pickerLabel: "Seleccionar región",
    bubbleDrop: "Bajada de precio",
    bubbleHike: "Subida de precio",
    bubbleEventsSuffix: (count) => ` · ${count} eventos`,
    bubbleNoChangePrefix: "Sin cambios recientes · ",
    bubbleUnchangedText: "Precio local sin cambios",
    bubbleStableTag: "Estable",
    capsulesLabel: "Filtrar por región con cambios",
    allChangedRegions: "Todas las regiones con cambios",
    allChangedCount: (count) => count,
    nodeMultipleCount: (count) => `${count}x`,
    noteChanged:
      "Pasa el cursor para previsualizar cambios; haz clic en un marcador o región para filtrar registros. Se excluye el cambio diario de divisas.",
    noteUnchanged: (monitored) =>
      `En las ${monitored} regiones monitorizadas, los precios locales oficiales de App Store no cambiaron en los últimos 120 días (las variaciones en USD/EUR reflejan solo el tipo de cambio).`,
    tableHeadingCountry: (country) => `${country} · Cambios Confirmados de Precio`,
    tableHeadingProduct: (product) => `${product} · Cambios Confirmados en 120 Días`,
    tableHeadingGlobal: "Cambios Confirmados de Precio en 120 Días",
    verifiedRecordsCount: (count) => `${count} ${count === 1 ? "registro verificado" : "registros verificados"}`,
    showAllRegions: "Mostrar todas las regiones",
    cols: ["Fecha observada", "Plan y región", "Precio lista local", "Cambio", "Capturas"],
    defaultMonthly: "Mensual",
    priorPrefix: "Anterior ",
    hikeBadge: "Subida",
    dropBadge: "Bajada",
    beforeLink: "Antes",
    afterLink: "Después",
    emptyCardAria: "Nota sobre estabilidad de precios",
    emptyNoDrops: "Sin bajadas oficiales de precio en los últimos 120 días",
    emptyNoHikes: "Sin subidas oficiales de precio en los últimos 120 días",
    emptyStableProduct: (product) => `Los precios locales oficiales de ${product} se mantuvieron estables en 120 días`,
    emptyStableGlobal: "Los precios locales oficiales monitorizados en App Store se mantuvieron estables en 120 días",
    emptyDesc:
      "Comparamos precios locales de App Store para exactamente el mismo plan, región y ciclo de facturación. Las variaciones diarias al convertir a USD o EUR reflejan tipos de cambio en vivo y no ajustes oficiales.",
  },
};

export default function PriceHistoryRadarClient({
  map,
  events,
  observedCodes,
  productName,
  showProductColumn = false,
  locale = "zh",
}: {
  map: { land: string; points: Record<string, number[]> };
  events: RadarEventItem[];
  observedCodes: string[];
  productName?: string;
  showProductColumn?: boolean;
  locale?: CanvasLocale;
}) {
  const copy = radarCopyByLocale[locale];
  const common = canvasUiCopy[locale].common;
  const regionName = (code: string) => getLocalizedRegionName(code, locale) ?? code;
  const [directionFilter, setDirectionFilter] = useState<"all" | "decrease" | "increase">("all");
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);

  const directionFilteredEvents = useMemo(
    () => (directionFilter === "all" ? events : events.filter((e) => e.direction === directionFilter)),
    [directionFilter, events],
  );

  const radar = useMemo(
    () => buildPriceHistoryRadar(directionFilteredEvents, observedCodes),
    [directionFilteredEvents, observedCodes],
  );

  const changedNodes = useMemo(() => radar.nodes.filter((n) => n.eventCount > 0), [radar.nodes]);

  const activeNode = useMemo(() => {
    const targetCode = countryFilter ?? hoveredCode;
    if (targetCode) {
      return radar.nodes.find((node) => node.code === targetCode) ?? changedNodes[0] ?? null;
    }
    return changedNodes[0] ?? null;
  }, [countryFilter, hoveredCode, radar.nodes, changedNodes]);

  const dots: WorldMapDot[] = useMemo(
    () =>
      radar.nodes.map((node) => {
        const name = getLocalizedRegionName(node.code, locale) ?? node.code;
        if (node.status === "monitored") {
          return {
            code: node.code,
            tone: "monitored",
            regionName: name,
            ariaLabel: copy.monitoredDotAria(name),
          };
        }
        const isHigh = node.status === "increase" || node.status === "mixed";
        return {
          code: node.code,
          tone: isHigh ? "high" : "low",
          pulseTone: isHigh ? "high" : "low",
          badge: node.eventCount,
          regionName: name,
          ariaLabel: copy.changedDotAria(name, node.eventCount),
        };
      }),
    [copy, locale, radar.nodes],
  );

  const tableEvents = useMemo(
    () =>
      countryFilter
        ? directionFilteredEvents.filter((event) => event.countryCode === countryFilter)
        : directionFilteredEvents,
    [countryFilter, directionFilteredEvents],
  );

  const handleSelectCountry = (code: string) => {
    setHoveredCode(code);
    const node = radar.nodes.find((n) => n.code === code);
    if (node && node.eventCount > 0) {
      setCountryFilter((prev) => (prev === code ? null : code));
    }
  };

  const bubbleTone: "low" | "high" | "baseline" =
    !activeNode || activeNode.status === "monitored"
      ? "baseline"
      : activeNode.status === "decrease"
        ? "low"
        : "high";

  return (
    <>
      {radar.monitoredCount > 0 && (
        <section className="gs-home-map-panel gs-history-radar-panel" aria-label={copy.panelAria}>
          <div className="gs-home-map">
            <div className="gs-home-map-heading">
              <div>
                <strong>
                  {productName ? copy.headingProduct(productName) : copy.headingGlobal}
                </strong>
                <div className="gs-radar-legend" aria-label={copy.legendAria}>
                  {radar.decreaseEvents > 0 && (
                    <span className="gs-radar-pill" data-tone="low">
                      <i aria-hidden="true" />
                      {copy.dropsPill(radar.decreaseEvents)}
                    </span>
                  )}
                  {radar.increaseEvents > 0 && (
                    <span className="gs-radar-pill" data-tone="high">
                      <i aria-hidden="true" />
                      {copy.hikesPill(radar.increaseEvents)}
                    </span>
                  )}
                  <span className="gs-radar-pill" data-tone="monitored">
                    <i aria-hidden="true" />
                    {radar.changedCount > 0
                      ? copy.changedRegionsPill(radar.changedCount, radar.monitoredCount)
                      : copy.unchangedRegionsPill(radar.monitoredCount)}
                  </span>
                </div>
              </div>
              {events.length > 0 && (
                <PublicSegments
                  label={copy.filterDirectionLabel}
                  value={directionFilter}
                  onChange={(next) => {
                    setDirectionFilter(next as "all" | "decrease" | "increase");
                    setCountryFilter(null);
                  }}
                  options={[
                    { value: "all", label: common.all },
                    { value: "decrease", label: copy.dropsOption },
                    { value: "increase", label: copy.hikesOption },
                  ]}
                />
              )}
            </div>

            <PublicWorldMapStage
              map={map}
              dots={dots}
              selectedCode={activeNode?.code ?? null}
              primaryCode={changedNodes[0]?.code ?? null}
              ariaLabel={productName ? copy.mapAriaProduct(productName) : copy.mapAriaGlobal}
              pickerLabel={copy.pickerLabel}
              bubbleTone={bubbleTone}
              onHover={(code) => setHoveredCode(code)}
              onSelect={handleSelectCountry}
              bubble={
                activeNode ? (
                  activeNode.latestEvent ? (
                    <>
                      <small>
                        {activeNode.latestEvent.direction === "decrease"
                          ? copy.bubbleDrop
                          : copy.bubbleHike}{" "}
                        · <HomepageCountryFlag code={activeNode.code} defer={false} />
                        {regionName(activeNode.code)}
                        {activeNode.eventCount > 1 ? copy.bubbleEventsSuffix(activeNode.eventCount) : ""}
                      </small>
                      <div className="gs-home-bubble-values">
                        <strong>
                          {showProductColumn
                            ? getCanvasPlanDisplayName(
                                activeNode.latestEvent.productName,
                                activeNode.latestEvent.planName,
                                locale,
                              )
                            : activeNode.latestEvent.planName}
                        </strong>
                        <span>
                          {activeNode.latestEvent.percent > 0 ? "+" : "−"}
                          {Math.abs(activeNode.latestEvent.percent)}%
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <small>
                        {copy.bubbleNoChangePrefix}
                        <HomepageCountryFlag code={activeNode.code} defer={false} />
                        {regionName(activeNode.code)}
                      </small>
                      <div className="gs-home-bubble-values">
                        <strong>{copy.bubbleUnchangedText}</strong>
                        <span>{copy.bubbleStableTag}</span>
                      </div>
                    </>
                  )
                ) : undefined
              }
            />

            {changedNodes.length > 0 && (
              <PublicMapCapsules
                label={copy.capsulesLabel}
                activeId={countryFilter ?? ALL_REGIONS_ID}
                onHover={(code) => {
                  if (code !== ALL_REGIONS_ID) setHoveredCode(code);
                }}
                onSelect={(code) => {
                  if (code === ALL_REGIONS_ID) {
                    setCountryFilter(null);
                    setHoveredCode(null);
                    return;
                  }
                  setHoveredCode(code);
                  setCountryFilter((prev) => (prev === code ? null : code));
                }}
                items={[
                  {
                    id: ALL_REGIONS_ID,
                    content: (
                      <>
                        <span>{copy.allChangedRegions}</span>
                        <b className="gs-map-pill-stat">
                          {copy.allChangedCount(directionFilteredEvents.length)}
                        </b>
                      </>
                    ),
                  },
                  ...changedNodes.slice(0, 7).map((node) => {
                    const latest = node.latestEvent!;
                    const isHigh = node.status === "increase" || node.status === "mixed";
                    return {
                      id: node.code,
                      content: (
                        <>
                          <HomepageCountryFlag code={node.code} defer={false} />
                          <span>{regionName(node.code)}</span>
                          <b className="gs-map-pill-stat" data-tone={isHigh ? "high" : "low"}>
                            {node.eventCount > 1
                              ? copy.nodeMultipleCount(node.eventCount)
                              : `${latest.percent > 0 ? "+" : "−"}${Math.abs(latest.percent)}%`}
                          </b>
                        </>
                      ),
                    };
                  }),
                ]}
              />
            )}

            <p className="gs-home-carousel-note">
              {changedNodes.length > 0 ? copy.noteChanged : copy.noteUnchanged(radar.monitoredCount)}
            </p>
          </div>
        </section>
      )}

      {tableEvents.length > 0 ? (
        <section className="gs-history-changes" aria-labelledby="history-changes-title">
          <div className="gs-history-changes-head">
            <div>
              <h2 id="history-changes-title">
                {countryFilter
                  ? copy.tableHeadingCountry(regionName(countryFilter))
                  : productName
                    ? copy.tableHeadingProduct(productName)
                    : copy.tableHeadingGlobal}
              </h2>
              <span>{copy.verifiedRecordsCount(tableEvents.length)}</span>
            </div>
            {countryFilter && (
              <button type="button" data-gs-ui="button" onClick={() => setCountryFilter(null)}>
                {copy.showAllRegions}
                <PublicIcon name="X" size={16} />
              </button>
            )}
          </div>

          <div className="gs-history-tablewrap">
            <table className="gs-history-table" aria-labelledby="history-changes-title">
              <thead>
                <tr>
                  {copy.cols.map((col) => (
                    <th key={col} scope="col">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableEvents.map((event) => {
                  const billingLabel = event.billingCycle
                    ? getBillingCycleLabel(event.billingCycle as ProductPlan["billing"], locale)
                    : copy.defaultMonthly;
                  const planTitle = showProductColumn
                    ? getCanvasPlanDisplayName(event.productName, event.planName, locale)
                    : `${event.productName} ${event.planName}`;
                  return (
                    <tr key={`${event.beforeId}:${event.id}`}>
                      <td className="gs-history-date">
                        <time dateTime={event.observedAt}>{event.observedAt.slice(0, 10)}</time>
                        <small>
                          {copy.priorPrefix}
                          {event.beforeObservedAt.slice(0, 10)}
                        </small>
                      </td>
                      <th className="gs-history-plan" scope="row">
                        <div className="gs-history-plan-cell">
                          <BrandIcon
                            product={{ slug: event.productSlug, name: event.productName }}
                            size="xs"
                            decorative
                            className="gs-history-row-brand"
                          />
                          <div className="gs-history-plan-meta">
                            {showProductColumn ? (
                              <Link
                                className="gs-history-plan-link"
                                href={`/${locale}/price-history/${event.productSlug}`}
                              >
                                {planTitle}
                              </Link>
                            ) : (
                              <strong>{planTitle}</strong>
                            )}
                            <small>
                              <HomepageCountryFlag code={event.countryCode} defer />
                              <span>
                                {regionName(event.countryCode)} · {billingLabel} · App Store
                              </span>
                            </small>
                          </div>
                        </div>
                      </th>
                      <td className="gs-history-price">
                        <span className="gs-history-old-price">
                          {formatLocalMoney(event.beforeAmount, event.currency, locale)}
                        </span>
                        <ArrowRight size={14} aria-hidden="true" />
                        <strong>{formatLocalMoney(event.afterAmount, event.currency, locale)}</strong>
                      </td>
                      <td className="gs-history-delta">
                        <span data-direction={event.direction}>
                          {event.direction === "increase" ? copy.hikeBadge : copy.dropBadge}{" "}
                          {event.percent > 0 ? "+" : "−"}
                          {Math.abs(event.percent)}%
                        </span>
                      </td>
                      <td className="gs-history-sources">
                        <Link href={`/${locale}/price-records/${event.beforeId}`}>
                          {copy.beforeLink}
                        </Link>
                        <Link href={`/${locale}/price-records/${event.id}`}>
                          {copy.afterLink}
                          <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="gs-history-empty-card" aria-label={copy.emptyCardAria}>
          <h2>
            {directionFilter === "decrease"
              ? copy.emptyNoDrops
              : directionFilter === "increase"
                ? copy.emptyNoHikes
                : productName
                  ? copy.emptyStableProduct(productName)
                  : copy.emptyStableGlobal}
          </h2>
          <p>{copy.emptyDesc}</p>
        </section>
      )}
    </>
  );
}

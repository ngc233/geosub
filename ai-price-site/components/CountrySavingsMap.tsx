"use client";
import { useState } from "react";
import Link from "next/link";
import HomepageCountryFlag from "./HomepageCountryFlag";
import PublicIcon from "./PublicIcon";
import PublicPriceNumber from "./PublicPriceNumber";
import { PublicSegments } from "./PublicControls";
import PublicWorldMapStage, { PublicMapCapsules, type WorldMapDot } from "./PublicWorldMapStage";
import { savingsLabel, savingsPercent } from "../lib/homepage-display";
import { getLocalizedRegionName } from "../lib/locale-format";
import type { CountrySavingsCategory, buildCountrySavingsViews } from "../lib/public-map-views";
import { canvasIntlLocale, canvasUiCopy, type CanvasLocale } from "../lib/canvas-ui-copy";

const countryMapCopy: Record<
  CanvasLocale,
  {
    sectionAria: string;
    heading: string;
    caption: string;
    viewAllPlans: (region: string) => string;
    categoryAria: string;
    usBaseline: string;
    mapAria: string;
    pickerLabel: string;
    rankLabel: (rank: number, cheaper: boolean) => string;
    matchesUs: string;
    medianPrefix: (cheaper: boolean) => string;
    cheaperCount: (cheaper: number, count: number) => string;
    capsulesLabel: string;
    note: string;
    emptyStatus: string;
    dotAria: (region: string, median: number) => string;
  }
> = {
  zh: {
    sectionAria: "全球订阅低价洼地地图",
    heading: "全球订阅低价洼地 · App Store · 月付",
    caption: "与美国同套餐逐一对比，取节省率中位数",
    viewAllPlans: (region) => `查看${region}全部套餐`,
    categoryAria: "国家地图分类",
    usBaseline: "美国 · 基准",
    mapAria: "全球各国家与地区订阅节省率中位数分布地图",
    pickerLabel: "查看国家",
    rankLabel: (rank, cheaper) => (cheaper ? `低价区 #${rank} ·` : "地区中位水平 ·"),
    matchesUs: "与美区持平",
    medianPrefix: (cheaper) => (cheaper ? "一半省 " : "中位贵 "),
    cheaperCount: (cheaper, count) => `${cheaper}/${count} 款更低`,
    capsulesLabel: "低价国家与地区",
    note: "悬停预览各国节省率中位数，点击地图点位或地区胶囊直达该国订阅详情",
    emptyStatus: "该分类下满足至少 3 个可比月付套餐的地区暂不足，请切换查看「全部」。",
    dotAria: (region, median) => `查看${region}订阅价格（一半订阅${savingsLabel(median, "zh")}）`,
  },
  "zh-tw": {
    sectionAria: "全球訂閱低價地區地圖",
    heading: "全球訂閱低價地區 · App Store · 月付",
    caption: "與美國同方案逐一對比，取節省率中位數",
    viewAllPlans: (region) => `查看${region}全部方案`,
    categoryAria: "國家地圖分類",
    usBaseline: "美國 · 基準",
    mapAria: "全球各國家與地區訂閱節省率中位數分布地圖",
    pickerLabel: "查看國家",
    rankLabel: (rank, cheaper) => (cheaper ? `低價區 #${rank} ·` : "地區中位水準 ·"),
    matchesUs: "與美區持平",
    medianPrefix: (cheaper) => (cheaper ? "一半省 " : "中位貴 "),
    cheaperCount: (cheaper, count) => `${cheaper}/${count} 款更低`,
    capsulesLabel: "低價國家與地區",
    note: "懸停預覽各國節省率中位數，點擊地圖點位或地區膠囊直達該國訂閱詳情",
    emptyStatus: "該分類下滿足至少 3 個可比月付方案的地區暫不足，請切換查看「全部」。",
    dotAria: (region, median) => `查看${region}訂閱價格（一半訂閱${savingsLabel(median, "zh-tw")}）`,
  },
  en: {
    sectionAria: "Global subscription low-price regions map",
    heading: "Global Low-Price Regions · App Store · Monthly",
    caption: "Median savings across same-plan US comparisons",
    viewAllPlans: (region) => `View all plans in ${region}`,
    categoryAria: "Country map category",
    usBaseline: "US · Baseline",
    mapAria: "World map of median subscription savings by country and region",
    pickerLabel: "Select country",
    rankLabel: (rank, cheaper) => (cheaper ? `Low-price #${rank} ·` : "Regional median ·"),
    matchesUs: "Matches US",
    medianPrefix: (cheaper) => (cheaper ? "Median −" : "Median +"),
    cheaperCount: (cheaper, count) => `${cheaper}/${count} cheaper`,
    capsulesLabel: "Low-price countries & regions",
    note: "Hover to preview median savings; click any map marker or country pill to open its regional breakdown",
    emptyStatus: "Fewer than 3 comparable monthly plans in this category; switch to All.",
    dotAria: (region, median) =>
      `View ${region} subscription prices (median ${median >= 0 ? `${savingsPercent(median)}% cheaper` : `${savingsPercent(median)}% higher`})`,
  },
  ja: {
    sectionAria: "世界の割安サブスク地域マップ",
    heading: "世界の割安サブスク地域 · App Store · 月額",
    caption: "米国の同一プランと個別に比較し、節約率の中央値を算出",
    viewAllPlans: (region) => `${region}の全プランを見る`,
    categoryAria: "マップのカテゴリー",
    usBaseline: "米国 · 基準",
    mapAria: "国・地域別のサブスク節約率（中央値）世界マップ",
    pickerLabel: "国を選択",
    rankLabel: (rank, cheaper) => (cheaper ? `割安 #${rank} ·` : "地域中央値 ·"),
    matchesUs: "米国と同額",
    medianPrefix: (cheaper) => (cheaper ? "中央値 −" : "中央値 +"),
    cheaperCount: (cheaper, count) => `${cheaper}/${count} 件が割安`,
    capsulesLabel: "割安な国・地域",
    note: "ホバーで各国の節約率中央値をプレビュー、マーカーまたはピルをクリックして地域詳細へ移動",
    emptyStatus: "このカテゴリーでは比較可能な月額プランが3件未満です。「すべて」に切り替えてください。",
    dotAria: (region, median) => `${region}のサブスク価格を見る（中央値：${savingsLabel(median, "ja")}）`,
  },
  ko: {
    sectionAria: "글로벌 저가 구독 국가 지도",
    heading: "글로벌 저가 구독 지역 · App Store · 월간",
    caption: "미국 동일 요금제와 개별 비교하여 절약률 중앙값 산출",
    viewAllPlans: (region) => `${region} 전체 요금제 보기`,
    categoryAria: "국가 지도 카테고리",
    usBaseline: "미국 · 기준",
    mapAria: "국가 및 지역별 구독 절약률 중앙값 세계 지도",
    pickerLabel: "국가 선택",
    rankLabel: (rank, cheaper) => (cheaper ? `저가 #${rank} ·` : "지역 중앙값 ·"),
    matchesUs: "미국과 동일",
    medianPrefix: (cheaper) => (cheaper ? "중앙값 −" : "중앙값 +"),
    cheaperCount: (cheaper, count) => `${cheaper}/${count}개 저렴`,
    capsulesLabel: "저가 국가 및 지역",
    note: "호버하여 국가별 절약률 중앙값을 미리보고, 지도 마커나 국가 캡슐을 클릭해 상세 페이지로 이동하세요",
    emptyStatus: "이 카테고리에 비교 가능한 월간 요금제가 3개 미만인 지역입니다. ‘전체’로 전환하세요.",
    dotAria: (region, median) => `${region} 구독 가격 보기 (중앙값 ${savingsLabel(median, "ko")})`,
  },
  es: {
    sectionAria: "Mapa mundial de regiones con suscripciones más baratas",
    heading: "Regiones Más Baratas · App Store · Mensual",
    caption: "Ahorro mediano comparando el mismo plan frente a EE. UU.",
    viewAllPlans: (region) => `Ver todos los planes en ${region}`,
    categoryAria: "Categoría del mapa por país",
    usBaseline: "EE. UU. · Base",
    mapAria: "Mapa mundial del ahorro mediano en suscripciones por país y región",
    pickerLabel: "Seleccionar país",
    rankLabel: (rank, cheaper) => (cheaper ? `Más barato #${rank} ·` : "Mediana regional ·"),
    matchesUs: "Igual que EE. UU.",
    medianPrefix: (cheaper) => (cheaper ? "Mediana −" : "Mediana +"),
    cheaperCount: (cheaper, count) => `${cheaper}/${count} más baratos`,
    capsulesLabel: "Países y regiones más baratos",
    note: "Pasa el cursor para previsualizar el ahorro mediano; haz clic en un marcador o país para ver el detalle",
    emptyStatus: "Hay menos de 3 planes mensuales comparables en esta categoría; cambia a Todos.",
    dotAria: (region, median) => `Ver precios en ${region} (mediana: ${savingsLabel(median, "es")})`,
  },
};

export default function CountrySavingsMap({
  map,
  views,
  locale = "zh",
}: {
  map: { land: string; points: Record<string, number[]> };
  views: ReturnType<typeof buildCountrySavingsViews>;
  locale?: CanvasLocale;
}) {
  const copy = countryMapCopy[locale];
  const common = canvasUiCopy[locale].common;
  const intlLocale = canvasIntlLocale(locale);
  const regionName = (code: string) => getLocalizedRegionName(code, locale) ?? code;
  const [category, setCategory] = useState<CountrySavingsCategory>("all");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const items = views.byCategory[category];
  if (!views.byCategory.all.length) return null;

  const shown = items.find((item) => item.code === selectedCode) ?? items[0] ?? null;
  const top = items[0] ?? null;
  const rank = shown ? items.findIndex((item) => item.code === shown.code) + 1 : 0;

  const dots: WorldMapDot[] = items.map((item, index) => ({
    code: item.code,
    href: item.href,
    tone:
      item.median >= 0.25
        ? "deep-low"
        : item.median > 0
          ? "low"
          : item.median === 0
            ? "baseline"
            : "high",
    pulseTone: index === 0 && item.median > 0 ? "low" : undefined,
    regionName: regionName(item.code),
    ariaLabel: copy.dotAria(regionName(item.code), item.median),
  }));

  const bubbleTone: "low" | "high" | "baseline" =
    !shown || shown.median === 0 ? "baseline" : shown.median > 0 ? "low" : "high";

  return (
    <section
      className="gs-home-map-panel gs-country-overview-map"
      aria-label={copy.sectionAria}
    >
      <div className="gs-home-map">
        <div className="gs-home-map-heading">
          <div>
            <strong>{copy.heading}</strong>
            <div className="gs-home-map-caption">
              <span>{copy.caption}</span>
              {shown?.href && (
                <Link href={shown.href} prefetch={false}>
                  {copy.viewAllPlans(regionName(shown.code))} <PublicIcon name="ArrowRight" size={16} />
                </Link>
              )}
            </div>
          </div>
          <PublicSegments
            label={copy.categoryAria}
            value={category}
            onChange={(next) => {
              setCategory(next as CountrySavingsCategory);
              setSelectedCode(null);
            }}
            options={[
              { value: "all", label: common.all },
              { value: "ai", label: common.ai },
              { value: "streaming", label: common.streaming },
            ]}
          />
        </div>

        {shown ? (
          <>
            <PublicWorldMapStage
              map={map}
              dots={dots}
              selectedCode={shown.code}
              primaryCode={top?.code ?? null}
              arc={
                views.hasUsBaseline && shown.median > 0
                  ? { fromCode: "US", toCode: shown.code, key: `${category}-${shown.code}` }
                  : null
              }
              usAnchor={
                views.hasUsBaseline ? (
                  <>
                    <HomepageCountryFlag code="US" defer={false} />
                    {copy.usBaseline}
                  </>
                ) : undefined
              }
              ariaLabel={copy.mapAria}
              pickerLabel={copy.pickerLabel}
              bubbleTone={bubbleTone}
              onHover={(code) => setSelectedCode(code)}
              onSelect={(code) => setSelectedCode(code)}
              bubble={
                <>
                  <small>
                    {copy.rankLabel(rank, shown.median > 0)}{" "}
                    <HomepageCountryFlag code={shown.code} defer={false} />
                    {regionName(shown.code)}
                  </small>
                  <div className="gs-home-bubble-values">
                    <strong>
                      {shown.median === 0 ? (
                        copy.matchesUs
                      ) : (
                        <PublicPriceNumber
                          value={savingsPercent(shown.median)}
                          fractionDigits={0}
                          locale={intlLocale}
                          prefix={copy.medianPrefix(shown.median > 0)}
                          suffix="%"
                          changeKey={`${category}-${shown.code}`}
                          countIn
                        />
                      )}
                    </strong>
                    <span>{copy.cheaperCount(shown.cheaper, shown.count)}</span>
                  </div>
                </>
              }
            />

            <PublicMapCapsules
              label={copy.capsulesLabel}
              activeId={shown.code}
              onHover={(code) => setSelectedCode(code)}
              items={items.slice(0, 8).map((item) => ({
                id: item.code,
                href: item.href,
                content: (
                  <>
                    <HomepageCountryFlag code={item.code} defer={false} />
                    <span>{regionName(item.code)}</span>
                    <b
                      className="gs-map-pill-stat"
                      data-tone={item.median > 0 ? "low" : item.median < 0 ? "high" : "baseline"}
                    >
                      {item.median > 0 ? "−" : item.median < 0 ? "+" : ""}
                      {savingsPercent(item.median)}%
                    </b>
                  </>
                ),
              }))}
            />
            <p className="gs-home-carousel-note">{copy.note}</p>
          </>
        ) : (
          <p className="gs-home-carousel-note" role="status">
            {copy.emptyStatus}
          </p>
        )}
      </div>
    </section>
  );
}

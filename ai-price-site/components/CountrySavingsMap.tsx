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
import type { CanvasLocale } from "../lib/canvas-ui-copy";

export default function CountrySavingsMap({
  map,
  views,
  locale = "zh",
}: {
  map: { land: string; points: Record<string, number[]> };
  views: ReturnType<typeof buildCountrySavingsViews>;
  locale?: CanvasLocale;
}) {
  const english = locale === "en";
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
    ariaLabel: english
      ? `View ${regionName(item.code)} subscription prices (median ${item.median >= 0 ? `${savingsPercent(item.median)}% cheaper` : `${savingsPercent(item.median)}% higher`})`
      : `查看${regionName(item.code)}订阅价格（一半订阅${savingsLabel(item.median)}）`,
  }));

  const bubbleTone: "low" | "high" | "baseline" =
    !shown || shown.median === 0 ? "baseline" : shown.median > 0 ? "low" : "high";

  return (
    <section
      className="gs-home-map-panel gs-country-overview-map"
      aria-label={english ? "Global subscription low-price regions map" : "全球订阅低价洼地地图"}
    >
      <div className="gs-home-map">
        <div className="gs-home-map-heading">
          <div>
            <strong>
              {english
                ? "Global Low-Price Regions · App Store · Monthly"
                : "全球订阅低价洼地 · App Store · 月付"}
            </strong>
            <div className="gs-home-map-caption">
              <span>
                {english
                  ? "Median savings across same-plan US comparisons"
                  : "与美国同套餐逐一对比，取节省率中位数"}
              </span>
              {shown?.href && (
                <Link href={shown.href} prefetch={false}>
                  {english
                    ? `View all plans in ${regionName(shown.code)}`
                    : `查看${regionName(shown.code)}全部套餐`}{" "}
                  <PublicIcon name="ArrowRight" size={16} />
                </Link>
              )}
            </div>
          </div>
          <PublicSegments
            label={english ? "Country map category" : "国家地图分类"}
            value={category}
            onChange={(next) => {
              setCategory(next as CountrySavingsCategory);
              setSelectedCode(null);
            }}
            options={[
              { value: "all", label: english ? "All" : "全部" },
              { value: "ai", label: english ? "AI Subscriptions" : "AI 订阅" },
              { value: "streaming", label: english ? "Streaming" : "流媒体" },
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
                    {english ? "US · Baseline" : "美国 · 基准"}
                  </>
                ) : undefined
              }
              ariaLabel={
                english
                  ? "World map of median subscription savings by country and region"
                  : "全球各国家与地区订阅节省率中位数分布地图"
              }
              pickerLabel={english ? "Select country" : "查看国家"}
              bubbleTone={bubbleTone}
              onHover={(code) => setSelectedCode(code)}
              onSelect={(code) => setSelectedCode(code)}
              bubble={
                <>
                  <small>
                    {english
                      ? shown.median > 0
                        ? `Low-price #${rank} ·`
                        : "Regional median ·"
                      : shown.median > 0
                        ? `低价区 #${rank} ·`
                        : "地区中位水平 ·"}{" "}
                    <HomepageCountryFlag code={shown.code} defer={false} />
                    {regionName(shown.code)}
                  </small>
                  <div className="gs-home-bubble-values">
                    <strong>
                      {shown.median === 0 ? (
                        english ? "Matches US" : "与美区持平"
                      ) : (
                        <PublicPriceNumber
                          value={savingsPercent(shown.median)}
                          fractionDigits={0}
                          locale={english ? "en-US" : "zh-CN"}
                          prefix={
                            english
                              ? shown.median > 0
                                ? "Median −"
                                : "Median +"
                              : shown.median > 0
                                ? "一半省 "
                                : "中位贵 "
                          }
                          suffix="%"
                          changeKey={`${category}-${shown.code}`}
                          countIn
                        />
                      )}
                    </strong>
                    <span>
                      {english
                        ? `${shown.cheaper}/${shown.count} cheaper`
                        : `${shown.cheaper}/${shown.count} 款更低`}
                    </span>
                  </div>
                </>
              }
            />

            <PublicMapCapsules
              label={english ? "Low-price countries & regions" : "低价国家与地区"}
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
            <p className="gs-home-carousel-note">
              {english
                ? "Hover to preview median savings; click any map marker or country pill to open its regional breakdown"
                : "悬停预览各国节省率中位数，点击地图点位或地区胶囊直达该国订阅详情"}
            </p>
          </>
        ) : (
          <p className="gs-home-carousel-note" role="status">
            {english
              ? "Fewer than 3 comparable monthly plans in this category; switch to All."
              : "该分类下满足至少 3 个可比月付套餐的地区暂不足，请切换查看「全部」。"}
          </p>
        )}
      </div>
    </section>
  );
}

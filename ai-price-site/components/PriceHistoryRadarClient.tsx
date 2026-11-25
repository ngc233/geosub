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
import { getChinesePlanDisplayName } from "../lib/pricing-labels";
import type { ProductPlan } from "../lib/public-pricing-model";
import { buildPriceHistoryRadar, type RadarEventItem } from "../lib/public-map-views";

const ALL_REGIONS_ID = "__ALL__";

const regionName = (code: string) => getLocalizedRegionName(code, "zh") ?? code;

function formatZhMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

export default function PriceHistoryRadarClient({
  map,
  events,
  observedCodes,
  productName,
  showProductColumn = false,
}: {
  map: { land: string; points: Record<string, number[]> };
  events: RadarEventItem[];
  observedCodes: string[];
  productName?: string;
  showProductColumn?: boolean;
}) {
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

  // Only default-focus a country bubble when there are actual price changes;
  // when 0 changes exist, show no bubble unless the user explicitly hovers/taps a dot.
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
        if (node.status === "monitored") {
          return {
            code: node.code,
            tone: "monitored",
            regionName: regionName(node.code),
            ariaLabel: `${regionName(node.code)} 已纳入监测，近 120 天官方标价未变`,
          };
        }
        const isHigh = node.status === "increase" || node.status === "mixed";
        return {
          code: node.code,
          tone: isHigh ? "high" : "low",
          pulseTone: isHigh ? "high" : "low",
          badge: node.eventCount,
          regionName: regionName(node.code),
          ariaLabel: `${regionName(node.code)} 近 120 天 ${node.eventCount} 次官方调价（点击筛选记录）`,
        };
      }),
    [radar.nodes],
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
        <section className="gs-home-map-panel gs-history-radar-panel" aria-label="全球订阅官方调价地图">
          <div className="gs-home-map">
            <div className="gs-home-map-heading">
              <div>
                <strong>
                  {productName
                    ? `${productName} · 近 120 天官方调价地图`
                    : "全球订阅调价地图 · 近 120 天 App Store 官方改价"}
                </strong>
                <div className="gs-radar-legend" aria-label="调价统计">
                  {radar.decreaseEvents > 0 && (
                    <span className="gs-radar-pill" data-tone="low">
                      <i aria-hidden="true" />
                      降价 {radar.decreaseEvents} 次
                    </span>
                  )}
                  {radar.increaseEvents > 0 && (
                    <span className="gs-radar-pill" data-tone="high">
                      <i aria-hidden="true" />
                      涨价 {radar.increaseEvents} 次
                    </span>
                  )}
                  <span className="gs-radar-pill" data-tone="monitored">
                    <i aria-hidden="true" />
                    {radar.changedCount > 0
                      ? `涉及 ${radar.changedCount} 个地区（共监测 ${radar.monitoredCount} 区）`
                      : `已监测 ${radar.monitoredCount} 个地区 · 近 120 天官方标价均未变动`}
                  </span>
                </div>
              </div>
              {events.length > 0 && (
                <PublicSegments
                  label="调价方向筛选"
                  value={directionFilter}
                  onChange={(next) => {
                    setDirectionFilter(next as "all" | "decrease" | "increase");
                    setCountryFilter(null);
                  }}
                  options={[
                    { value: "all", label: "全部" },
                    { value: "decrease", label: "降价" },
                    { value: "increase", label: "涨价" },
                  ]}
                />
              )}
            </div>

            <PublicWorldMapStage
              map={map}
              dots={dots}
              selectedCode={activeNode?.code ?? null}
              primaryCode={changedNodes[0]?.code ?? null}
              ariaLabel={productName ? `${productName} 全球调价分布地图` : "全球订阅官方调价分布地图"}
              pickerLabel="查看地区"
              bubbleTone={bubbleTone}
              onHover={(code) => setHoveredCode(code)}
              onSelect={handleSelectCountry}
              bubble={
                activeNode ? (
                  activeNode.latestEvent ? (
                    <>
                      <small>
                        {activeNode.latestEvent.direction === "decrease" ? "官方降价" : "官方涨价"} ·{" "}
                        <HomepageCountryFlag code={activeNode.code} defer={false} />
                        {regionName(activeNode.code)}
                        {activeNode.eventCount > 1 ? ` · 共 ${activeNode.eventCount} 次` : ""}
                      </small>
                      <div className="gs-home-bubble-values">
                        <strong>
                          {showProductColumn
                            ? getChinesePlanDisplayName(
                                activeNode.latestEvent.productName,
                                activeNode.latestEvent.planName,
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
                        近期无调价 · <HomepageCountryFlag code={activeNode.code} defer={false} />
                        {regionName(activeNode.code)}
                      </small>
                      <div className="gs-home-bubble-values">
                        <strong>当地标价未变</strong>
                        <span>稳定</span>
                      </div>
                    </>
                  )
                ) : undefined
              }
            />

            {changedNodes.length > 0 && (
              <PublicMapCapsules
                label="按调价地区筛选"
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
                        <span>全部调价地区</span>
                        <b className="gs-map-pill-stat">{directionFilteredEvents.length}条</b>
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
                              ? `${node.eventCount}次`
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
              {changedNodes.length > 0
                ? "悬停预览调价详情，点击地图高亮圆点或下方地区胶囊可筛选调价记录；日常汇率波动不计入调价"
                : `过去 120 天内，已监测的 ${radar.monitoredCount} 个地区 App Store 当地标价均未调整（日常折算金额波动仅来自实时汇率变化）`}
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
                  ? `${regionName(countryFilter)} · 官方调价记录`
                  : productName
                    ? `${productName} · 近 120 天官方调价记录`
                    : "近 120 天官方调价记录"}
              </h2>
              <span>共 {tableEvents.length} 条已核验记录</span>
            </div>
            {countryFilter && (
              <button type="button" data-gs-ui="button" onClick={() => setCountryFilter(null)}>
                显示全部地区
                <PublicIcon name="X" size={16} />
              </button>
            )}
          </div>

          <div className="gs-history-tablewrap">
            <table className="gs-history-table" aria-labelledby="history-changes-title">
              <thead>
                <tr>
                  <th scope="col">调价日期</th>
                  <th scope="col">订阅套餐与地区</th>
                  <th scope="col">当地官方标价</th>
                  <th scope="col">变动幅度</th>
                  <th scope="col">核验快照</th>
                </tr>
              </thead>
              <tbody>
                {tableEvents.map((event) => {
                  const billingLabel = event.billingCycle
                    ? getBillingCycleLabel(event.billingCycle as ProductPlan["billing"], "zh")
                    : "月付";
                  const planTitle = showProductColumn
                    ? getChinesePlanDisplayName(event.productName, event.planName)
                    : `${event.productName} ${event.planName}`;
                  return (
                    <tr key={`${event.beforeId}:${event.id}`}>
                      <td className="gs-history-date">
                        <time dateTime={event.observedAt}>{event.observedAt.slice(0, 10)}</time>
                        <small>前次采集 {event.beforeObservedAt.slice(0, 10)}</small>
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
                              <Link className="gs-history-plan-link" href={`/zh/price-history/${event.productSlug}`}>
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
                          {formatZhMoney(event.beforeAmount, event.currency)}
                        </span>
                        <ArrowRight size={14} aria-hidden="true" />
                        <strong>{formatZhMoney(event.afterAmount, event.currency)}</strong>
                      </td>
                      <td className="gs-history-delta">
                        <span data-direction={event.direction}>
                          {event.direction === "increase" ? "涨价" : "降价"} {event.percent > 0 ? "+" : "−"}
                          {Math.abs(event.percent)}%
                        </span>
                      </td>
                      <td className="gs-history-sources">
                        <Link href={`/zh/price-records/${event.beforeId}`}>调价前</Link>
                        <Link href={`/zh/price-records/${event.id}`}>
                          调价后
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
        <section className="gs-history-empty-card" aria-label="调价状态说明">
          <h2>
            {directionFilter === "decrease"
              ? "近 120 天暂无官方降价记录"
              : directionFilter === "increase"
                ? "近 120 天暂无官方涨价记录"
                : productName
                  ? `${productName} 近 120 天官方标价保持稳定`
                  : "近 120 天全站已监测订阅官方标价保持稳定"}
          </h2>
          <p>
            我们持续比对同一套餐、同一地区与同一计费周期的 App Store 当地标价；若日常人民币或美元扣款金额有轻微浮动，通常来自实时汇率变化而非官方改价。
          </p>
        </section>
      )}
    </>
  );
}

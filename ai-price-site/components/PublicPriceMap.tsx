"use client";

import { useId, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";
import { placeMapLabels } from "../lib/map-label-layout";
import { getCountryCodeForMapFeature } from "../lib/country-map-codes";
import { publicMapBand, publicMapDifference, type PublicMapRegion } from "../lib/public-price-map";
import { PublicIconButton, PublicSelect } from "./ui/PublicControls";

type MapFeature = { id?: number | string; properties: { name?: string }; geometry: unknown };
type Props = { refined?: boolean; regions: PublicMapRegion[]; label: string; formatPrice: (value: number) => string; onSelectRegion?: (region: PublicMapRegion) => void };
const WIDTH = 900, HEIGHT = 430;

export default function PublicPriceMap({ regions, label, formatPrice, onSelectRegion, refined = false }: Props) {
  const pattern = useId();
  const root = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ region: PublicMapRegion; locked: boolean } | null>(null);
  const sorted = useMemo(() => regions.filter(r => Number.isFinite(r.priceUsd) && r.priceUsd > 0).toSorted((a,b) => a.priceUsd - b.priceUsd), [regions]);
  const byCode = new Map(sorted.map(r => [r.code.toUpperCase(), r]));
  const us = byCode.get("US");
  const map = useMemo(() => {
    const atlas = worldAtlas as unknown as { objects: { countries: unknown } };
    const collection = feature(worldAtlas as never, atlas.objects.countries as never) as unknown as GeoPermissibleObjects & { features: MapFeature[] };
    const features = collection.features.filter(shape => Number(shape.id) !== 10 && shape.properties.name?.toLowerCase() !== "antarctica");
    return { features, path: geoPath(geoNaturalEarth1().fitExtent([[18,14],[WIDTH-18,HEIGHT-14]], { ...collection, features } as GeoPermissibleObjects)) };
  }, []);
  const points = [
    { kind: "min", label: "最低", region: sorted[0] },
    { kind: "reference", label: "基准", region: us },
    { kind: "max", label: "最高", region: sorted.at(-1) },
  ].flatMap(item => {
    if (!item.region) return [];
    const shape = map.features.find(s => getCountryCodeForMapFeature(s) === item.region!.code.toUpperCase());
    if (!shape) return [];
    const [x,y] = map.path.centroid(shape as unknown as GeoPermissibleObjects);
    return Number.isFinite(x) && Number.isFinite(y) ? [{ ...item, region: item.region, x, y }] : [];
  });
  const labels = refined ? placeMapLabels(points.map(point => ({x:point.x,y:point.y,width:Math.min(230,Math.max(170,formatPrice(point.region.priceUsd).length*10+24,(point.label.length+point.region.country.length+3)*14+24)),height:64,preferRight:point.kind === "min"}))) : [];
  function select(region: PublicMapRegion) {
    setSelection({ region, locked: true });
    onSelectRegion?.(region);
  }
  const legend = us ? [["lower","低于美国"],["higher","高于美国"],["same","与美国相同"],["reference","美国基准"],["no-data","暂无数据"]] : [["covered","已有价格"],["no-data","暂无数据"]];
  return <div ref={root} className="gs-r2-geo-map gs-public-price-map" data-public-price-map data-map-refined={refined ? "" : undefined}>
    {!us && <p className="gs-r2-region-notice">美国基准缺失，地图仅显示已有价格的地区，不显示相对美国色阶。</p>}
    <svg data-public-map-canvas viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-label={label} onKeyDown={event => { if (event.key === "Escape") setSelection(null); }}>
      <defs><pattern id={pattern} width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="var(--gs-map-no-data)" /><path d="M-1 1L1 -1M0 7L7 0M6 8L8 6" stroke="var(--gs-map-no-data-pattern)" strokeWidth="1" /></pattern></defs>
      {map.features.map((shape,index) => {
        const code = getCountryCodeForMapFeature(shape), region = code ? byCode.get(code) : undefined;
        const band = publicMapBand(region, us);
        return <path key={`${shape.id}-${index}`} d={map.path(shape as unknown as GeoPermissibleObjects) || undefined}
          data-map-region={region?.code} data-price-usd={region?.priceUsd} data-map-band={band} fill={band === "no-data" ? `url(#${pattern})` : `var(--gs-map-${band})`}
          stroke="var(--gs-surface)" strokeWidth="1" role={region ? "button" : undefined} tabIndex={region ? 0 : undefined}
          aria-label={region ? `${region.country} · ${formatPrice(region.priceUsd)} · ${publicMapDifference(region,us)}` : undefined}
          onMouseEnter={() => { if (region && !selection?.locked && (!refined || window.matchMedia("(hover: hover) and (pointer: fine)").matches)) setSelection({ region, locked:false }); }}
          onMouseLeave={() => setSelection(current => current?.locked ? current : null)}
          onFocus={() => { if (region) setSelection({ region, locked:false }); }}
          onBlur={() => setSelection(current => current?.locked ? current : null)}
          onClick={() => { if (region) select(region); }}
          onKeyDown={event => { if (region && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); select(region); } }}>
          <title>{region ? `${region.country} · ${formatPrice(region.priceUsd)} · ${publicMapDifference(region,us)}` : `${shape.properties.name || "地区"} · 暂无数据`}</title>
        </path>;
      })}
      {points.map((point,index) => {
        const placement = labels[index];
        const labelX = placement?.x ?? Math.max(4,Math.min(WIDTH-174,point.x+(point.kind === "min" ? 18 : -188)));
        const labelY = placement?.y ?? Math.max(4,point.y-34);
        const labelWidth = placement?.width ?? 170;
        const color = point.kind === "min" ? "var(--gs-low)" : point.kind === "max" ? "var(--gs-high)" : "var(--gs-map-reference)";
        return <g key={point.kind} data-detail-map-pin={point.kind} pointerEvents="none">
          <circle cx={point.x} cy={point.y} r="7" fill={color} stroke="var(--gs-surface)" strokeWidth="2" />
          <g className="gs-r2-map-label"><path data-map-leader={refined ? point.kind : undefined} d={`M${point.x},${point.y} L${placement?.lineX ?? labelX+(labelX<point.x?170:0)},${placement?.lineY ?? labelY+34}`} stroke={color} fill="none" strokeWidth="1.5" />
            <rect x={labelX} y={labelY} width={labelWidth} height="64" rx="8" fill="var(--gs-surface)" stroke={color} />
            <text x={labelX+12} y={labelY+23} fontSize="14" fill="var(--gs-text-secondary)">{point.label} · {point.region.country}</text>
            <text x={labelX+12} y={labelY+49} fontSize="22" fontWeight="600" fontFamily="IBM Plex Mono, monospace" fill="var(--gs-text)">{formatPrice(point.region.priceUsd)}</text>
          </g>
        </g>;
      })}
    </svg>
    <div className="gs-r2-map-mobile-labels">{points.map(point => <span key={point.kind}>{point.label} · {point.region.country} <strong>{formatPrice(point.region.priceUsd)}</strong></span>)}</div>
    <div className="gs-r2-map-legend">{legend.map(([band,text]) => <span key={band}><i data-map-tone={band} style={{background:band === "no-data" ? "var(--gs-map-no-data)" : `var(--gs-map-${band})`}} />{text}</span>)}</div>
    {selection && <div className="gs-public-map-selection" data-map-selection aria-live="polite"><div><strong>{selection.region.country}</strong><span>{formatPrice(selection.region.priceUsd)} · {publicMapDifference(selection.region,us)}</span></div><PublicIconButton aria-label="关闭地区提示" onClick={() => { setSelection(null); root.current?.querySelector<HTMLButtonElement>('[role="combobox"]')?.focus(); }}><X aria-hidden="true" /></PublicIconButton></div>}
    <PublicSelect className="gs-unified-region-picker" label={onSelectRegion ? "选择地区可定位价格并展开证据" : "选择地区"} value={selection?.region.code || ""}
      options={[{value:"",label:"选择地区，查看价格"},...sorted.map(region => ({value:region.code,label:`${region.country} · ${formatPrice(region.priceUsd)}`}))]}
      onChange={code => { const region=byCode.get(code); if(region) select(region); else setSelection(null); }} />
  </div>;
}

"use client";

import { useMemo } from "react";
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";

export type HomeMapRegion = {
  code: string;
  countryName: string;
  priceUsd: number;
};

type MapFeature = {
  id?: number | string;
  properties: { name?: string };
  geometry: unknown;
};

type WorldAtlasTopology = {
  objects: { countries: unknown };
};

type Marker = {
  region: HomeMapRegion;
  kind: "lowest" | "highest" | "reference" | "regular";
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  diff: number;
};

const WIDTH = 1180;
const HEIGHT = 350;
const LABEL_HEIGHT = 30;
const LABEL_GAP = 6;

const ISO2_TO_NUMERIC: Record<string, number> = {
  US: 840, CA: 124, MX: 484, BR: 76, AR: 32, CL: 152, CO: 170, PE: 604,
  GB: 826, IE: 372, FR: 250, DE: 276, ES: 724, IT: 380, NL: 528, BE: 56,
  CH: 756, AT: 40, DK: 208, SE: 752, NO: 578, FI: 246, PL: 616, PT: 620,
  TR: 792, JP: 392, KR: 410, CN: 156, TW: 158, HK: 344, SG: 702, MY: 458,
  TH: 764, VN: 704, ID: 360, PH: 608, IN: 356, PK: 586, AU: 36, NZ: 554,
  EG: 818, ZA: 710, NG: 566, KE: 404, SA: 682, AE: 784, IL: 376,
};

const LABEL_OFFSETS: Record<string, [number, number]> = {
  US: [-18, -55], CA: [-25, -48], MX: [18, -34], BR: [-5, 44], CO: [-18, 48],
  DK: [-25, -54], GB: [-64, -26], DE: [20, -38], TR: [26, 22], EG: [28, 30],
  NG: [-62, -12], KE: [28, 24], ZA: [-18, 42], PK: [40, 24], IN: [34, 12],
  ID: [34, 32], PH: [32, -36], KR: [32, -28], JP: [34, -8], AU: [4, 50], NZ: [-66, 18],
};

function isAntarctica(item: MapFeature) {
  const id = Number(item.id);
  return id === 10 || item.properties?.name?.toLowerCase() === "antarctica";
}

function diffPercent(price: number, benchmark: number) {
  if (!benchmark) return 0;
  return Math.round(((price - benchmark) / benchmark) * 100);
}

function markerTone(kind: Marker["kind"], diff: number) {
  if (kind === "reference") {
    return { stroke: "#94a3b8", fill: "#ffffff", dot: "#334155", text: "#475569" };
  }
  if (kind === "lowest" || diff < 0) {
    return { stroke: "#86efac", fill: "#f5fff7", dot: "#16a34a", text: "#15803d" };
  }
  if (kind === "highest" || diff > 10) {
    return { stroke: "#fda4af", fill: "#fff7f8", dot: "#f43f5e", text: "#e11d48" };
  }
  return { stroke: "#f3d18a", fill: "#fffdf7", dot: "#d6a13b", text: "#a16207" };
}

function markerTitle(kind: Marker["kind"]) {
  if (kind === "lowest") return "最低";
  if (kind === "highest") return "最高";
  if (kind === "reference") return "基准";
  return "";
}

function markerDiffLabel(marker: Pick<Marker, "kind" | "diff">) {
  if (marker.kind === "reference") return "";
  return `${marker.diff > 0 ? "+" : ""}${marker.diff}%`;
}

function markerLabelWidth(marker: Pick<Marker, "kind" | "region" | "diff">) {
  const prefix = markerTitle(marker.kind);
  const code = marker.region.code.toUpperCase();
  const price = `$${marker.region.priceUsd.toFixed(2)}`;
  const diff = markerDiffLabel(marker);
  const prefixWidth = prefix ? 23 : 0;
  const diffWidth = diff ? 8 + diff.length * 5.7 : 0;
  return Math.ceil(18 + prefixWidth + code.length * 6.2 + 7 + price.length * 7.1 + diffWidth);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function overlapArea(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
) {
  const overlapWidth = Math.max(
    0,
    Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x),
  );
  const overlapHeight = Math.max(
    0,
    Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y),
  );
  return overlapWidth * overlapHeight;
}

function connectorPoint(marker: Marker, x: number, y: number, width: number) {
  return {
    x: clamp(marker.x, x + 7, x + width - 7),
    y: marker.y < y
      ? y
      : marker.y > y + LABEL_HEIGHT
        ? y + LABEL_HEIGHT
        : clamp(marker.y, y + 6, y + LABEL_HEIGHT - 6),
  };
}

function resolveLabelPositions(markers: Marker[]) {
  const rank: Record<Marker["kind"], number> = {
    reference: 0,
    lowest: 1,
    highest: 2,
    regular: 3,
  };
  const placed: Array<Marker & { labelWidth: number }> = [];

  for (const marker of [...markers].sort((a, b) => rank[a.kind] - rank[b.kind])) {
    const width = markerLabelWidth(marker);
    const candidates = [
      [marker.labelX, marker.labelY],
      [marker.x + 14, marker.y - LABEL_HEIGHT - 12],
      [marker.x - width - 14, marker.y - LABEL_HEIGHT - 12],
      [marker.x + 14, marker.y + 12],
      [marker.x - width - 14, marker.y + 12],
      [marker.x - width / 2, marker.y - LABEL_HEIGHT - 16],
      [marker.x - width / 2, marker.y + 16],
      [marker.labelX + width + LABEL_GAP, marker.labelY],
      [marker.labelX - width - LABEL_GAP, marker.labelY],
      [marker.labelX, marker.labelY + LABEL_HEIGHT + LABEL_GAP],
      [marker.labelX, marker.labelY - LABEL_HEIGHT - LABEL_GAP],
      [marker.x + 18, marker.y - LABEL_HEIGHT * 2 - LABEL_GAP * 2],
      [marker.x - width - 18, marker.y - LABEL_HEIGHT * 2 - LABEL_GAP * 2],
      [marker.x + 18, marker.y + LABEL_HEIGHT + LABEL_GAP * 2],
      [marker.x - width - 18, marker.y + LABEL_HEIGHT + LABEL_GAP * 2],
    ].map(([x, y]) => ({
      x: clamp(x, 4, WIDTH - width - 4),
      y: clamp(y, 6, HEIGHT - LABEL_HEIGHT - 6),
    }));

    const best = candidates.reduce<{
      x: number;
      y: number;
      score: number;
    } | null>((current, candidate) => {
      const rect = { ...candidate, width, height: LABEL_HEIGHT };
      const collisionScore = placed.reduce(
        (sum, item) => sum + overlapArea(rect, {
          x: item.labelX,
          y: item.labelY,
          width: item.labelWidth,
          height: LABEL_HEIGHT,
        }),
        0,
      ) * 1000;
      const coveredMarkerScore = markers.reduce((sum, item) => {
        if (item === marker) return sum;
        const covered = item.x >= rect.x - 6
          && item.x <= rect.x + rect.width + 6
          && item.y >= rect.y - 6
          && item.y <= rect.y + rect.height + 6;
        return sum + (covered ? 100000 : 0);
      }, 0);
      const movementScore = Math.hypot(candidate.x - marker.labelX, candidate.y - marker.labelY);
      const score = collisionScore + coveredMarkerScore + movementScore;
      return !current || score < current.score ? { ...candidate, score } : current;
    }, null);

    placed.push({
      ...marker,
      labelX: best?.x ?? marker.labelX,
      labelY: best?.y ?? marker.labelY,
      labelWidth: width,
    });
  }

  const positions = new Map(
    placed.map((marker) => [`${marker.kind}:${marker.region.code}`, marker]),
  );
  return markers.map((marker) => positions.get(`${marker.kind}:${marker.region.code}`) ?? marker);
}

export default function HomeHeroMap({ regions }: { regions: HomeMapRegion[] }) {
  const mapData = useMemo(() => {
    const atlas = worldAtlas as unknown as WorldAtlasTopology;
    const countries = feature(
      worldAtlas as never,
      atlas.objects.countries as never,
    ) as unknown as GeoPermissibleObjects & { features: MapFeature[] };
    const features = countries.features.filter((item) => !isAntarctica(item));
    const collection = { ...countries, features } as typeof countries;
    const projection = geoNaturalEarth1().fitExtent(
      [[18, 12], [WIDTH - 18, HEIGHT - 18]],
      collection,
    );
    return { features, projection, path: geoPath(projection) };
  }, []);

  const { markers, reference } = useMemo(() => {
    const sorted = [...regions].filter((item) => item.priceUsd > 0).sort((a, b) => a.priceUsd - b.priceUsd);
    const lowest = sorted[0];
    const highest = sorted.at(-1);
    const us = sorted.find((item) => item.code.toUpperCase() === "US") || lowest;
    if (!lowest || !highest || !us) return { markers: [] as Marker[], reference: undefined };

    const candidates: Array<{ region: HomeMapRegion; kind: Marker["kind"] }> = [
      { region: lowest, kind: "lowest" },
      ...(highest.code !== lowest.code ? [{ region: highest, kind: "highest" as const }] : []),
      ...(us.code !== lowest.code && us.code !== highest.code ? [{ region: us, kind: "reference" as const }] : []),
    ];

    const extraCodes = ["BR", "NG", "ZA", "PK", "KR", "JP", "AU"];
    const extras = extraCodes
      .flatMap((code) => {
        const region = sorted.find((item) => item.code.toUpperCase() === code);
        return region && !candidates.some((candidate) => candidate.region.code === region.code)
          ? [{ region, kind: "regular" as const }]
          : [];
      })
      .slice(0, 3);

    const built = [...candidates, ...extras].flatMap(({ region, kind }) => {
      const numeric = ISO2_TO_NUMERIC[region.code.toUpperCase()];
      const country = mapData.features.find((item) => Number(item.id) === numeric);
      if (!country) return [];
      const [x, y] = mapData.path.centroid(country as unknown as GeoPermissibleObjects);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
      const [offsetX, offsetY] = LABEL_OFFSETS[region.code.toUpperCase()] || [18, -35];
      return [{
        region,
        kind,
        x,
        y,
        labelX: x + offsetX,
        labelY: y + offsetY,
        diff: diffPercent(region.priceUsd, us.priceUsd),
      }];
    });

    return { markers: resolveLabelPositions(built), reference: us };
  }, [mapData, regions]);

  return (
    <div className="relative mx-auto w-full max-w-[1240px]" aria-label="全球订阅价格分布图">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block h-auto w-full overflow-visible"
        role="img"
        aria-label="标注最低价、最高价和美国基准的世界地图"
      >
        <defs>
          <pattern id="home-map-dots" width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1" fill="#d8d3c8" opacity="0.72" />
          </pattern>
          <filter id="home-marker-shadow" x="-40%" y="-60%" width="180%" height="220%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#18181b" floodOpacity="0.12" />
          </filter>
        </defs>

        <g aria-hidden="true">
          {mapData.features.map((country, index) => (
            <path
              key={`${country.id}-${index}`}
              d={mapData.path(country as unknown as GeoPermissibleObjects) || undefined}
              fill="url(#home-map-dots)"
              stroke="#d8d3c8"
              strokeWidth="0.8"
            />
          ))}
        </g>

        {reference && markers.filter((marker) => marker.kind === "lowest" || marker.kind === "highest").map((marker) => (
          <path
            key={`route-${marker.region.code}`}
            d={`M ${markers.find((item) => item.kind === "reference")?.x || marker.x} ${markers.find((item) => item.kind === "reference")?.y || marker.y} Q ${(marker.x + WIDTH / 2) / 2} ${Math.min(marker.y, 130) - 34} ${marker.x} ${marker.y}`}
            fill="none"
            stroke={marker.kind === "lowest" ? "#4ade80" : "#fda4af"}
            strokeWidth="1.8"
            strokeDasharray="7 6"
            opacity="0.8"
          />
        ))}

        {markers.map((marker, index) => {
          const tone = markerTone(marker.kind, marker.diff);
          const width = markerLabelWidth(marker);
          const x = Math.max(4, Math.min(WIDTH - width - 4, marker.labelX));
          const y = Math.max(6, Math.min(HEIGHT - LABEL_HEIGHT - 6, marker.labelY));
          const connector = connectorPoint(marker, x, y, width);
          const prefix = markerTitle(marker.kind);
          const diff = markerDiffLabel(marker);
          return (
            <g key={`${marker.region.code}-${index}`}>
              <line x1={marker.x} y1={marker.y} x2={connector.x} y2={connector.y} stroke={tone.stroke} strokeWidth="0.9" opacity="0.62" />
              <circle cx={marker.x} cy={marker.y} r="6.5" fill={tone.dot} stroke="#ffffff" strokeWidth="3" />
              <rect
                data-home-map-label={marker.region.code}
                x={x}
                y={y}
                width={width}
                height={LABEL_HEIGHT}
                rx={LABEL_HEIGHT / 2}
                fill={tone.fill}
                stroke={tone.stroke}
                strokeWidth="0.8"
                filter="url(#home-marker-shadow)"
              />
              <text x={x + 9} y={y + 19} fill="#18181b" fontSize="10" fontWeight="750">
                {prefix ? <tspan fill={tone.text} fontSize="9" fontWeight="800">{prefix} </tspan> : null}
                <tspan fontWeight="850">{marker.region.code.toUpperCase()}</tspan>
                <tspan dx="7" fontSize="12" fontWeight="900">${marker.region.priceUsd.toFixed(2)}</tspan>
                {diff ? <tspan dx="7" fill={tone.text} fontSize="9" fontWeight="850">{diff}</tspan> : null}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

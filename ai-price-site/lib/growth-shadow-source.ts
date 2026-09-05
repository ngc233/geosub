import { open } from "node:fs/promises";
import path from "node:path";
import { googleShadowSnapshotToGrowthEvidence } from "./growth-google-shadow-evidence.ts";
import { bingShadowSnapshotToGrowthEvidence } from "./growth-bing-shadow-evidence.ts";
import type { GrowthSearchEvidence } from "./growth-search-evidence.ts";

export type GrowthShadowRead = {
  state: "available" | "missing" | "invalid" | "unreadable";
  evidence: GrowthSearchEvidence | null;
  property: string | null;
};
const MAX_BYTES = 4 * 1024 * 1024;
const STALE_AFTER_MS = 48 * 60 * 60 * 1000;

/** Called only by the server read model; never reads credentials or makes vendor requests. */
export async function readGrowthShadowSource(
  engine: "google" | "bing",
  now = new Date(),
  directory = process.env.GEOSUB_GROWTH_OUTPUT_DIR || "/var/lib/geosub/growth",
): Promise<GrowthShadowRead> {
  let file;
  try {
    file = await open(path.join(directory, `${engine}-shadow-latest.json`), "r");
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > MAX_BYTES) return { state: "invalid", evidence: null, property: null };
    // Bounded even if a writer grows the file after stat().
    const buffer = Buffer.alloc(MAX_BYTES + 1);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const chunk = await file.read(buffer, bytesRead, buffer.length - bytesRead, bytesRead);
      if (!chunk.bytesRead) break;
      bytesRead += chunk.bytesRead;
    }
    if (bytesRead > MAX_BYTES) return { state: "invalid", evidence: null, property: null };
    const snapshot = JSON.parse(buffer.subarray(0, bytesRead).toString("utf8"));
    const evidence = engine === "google"
      ? googleShadowSnapshotToGrowthEvidence(snapshot)
      : bingShadowSnapshotToGrowthEvidence(snapshot);
    if (!evidence.days.length || Date.parse(evidence.collectedAt) > now.getTime() + 5 * 60 * 1000) {
      return { state: "invalid", evidence: null, property: null };
    }
    return { state: "available", evidence, property: snapshot.site };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return { state: code === "ENOENT" ? "missing" : code ? "unreadable" : "invalid", evidence: null, property: null };
  } finally {
    await file?.close();
  }
}

export function summarizeGrowthShadow(read: GrowthShadowRead, now = new Date()) {
  const evidence = read.evidence;
  if (!evidence || read.state !== "available") return null;
  const clicks = evidence.days.reduce((sum, row) => sum + row.clicks, 0);
  const impressions = evidence.days.reduce((sum, row) => sum + row.impressions, 0);
  const expectedDays = Math.round((Date.parse(evidence.periodEnd) - Date.parse(evidence.periodStart)) / 86400000) + 1;
  const observedDays = new Set(evidence.days.map(row => row.date)).size;
  const stale = now.getTime() - Date.parse(evidence.collectedAt) > STALE_AFTER_MS;
  const percent = (n: number, d: number) => d > 0 ? Math.round(n / d * 10000) / 100 : 0;
  return {
    engine: evidence.engine,
    mode: "server_snapshot" as const,
    status: "partial" as const,
    periodStart: evidence.periodStart,
    periodEnd: evidence.periodEnd,
    settledThrough: null,
    importedAt: null,
    evidence: { method: "server_api" as const },
    totalsScope: "observed_property_days",
    totals: { clicks, impressions, ctr: percent(clicks, impressions), averagePosition: null },
    pages: [...evidence.pages.rows].sort((a,b) => (b.impressions ?? 0) - (a.impressions ?? 0)).slice(0,20).map(row => ({
      path: row.path, clicks: row.clicks, impressions: row.impressions ?? 0,
      ctr: percent(row.clicks, row.impressions ?? 0), averagePosition: row.averagePosition ?? null,
    })),
    collection: {
      state: stale ? "stale" as const : "fresh" as const,
      collectedAt: evidence.collectedAt,
      sourceTimezone: evidence.sourceTimezone,
      searchType: evidence.searchType,
      property: read.property,
      observedDays,
      expectedDays,
      missingDays: expectedDays - observedDays,
    },
    limitations: [
      stale ? "超过 48 小时未取得新快照；当前显示最后成功采集的数据。" : "已读取最新成功快照；采集时间新不代表数据已结算。",
      `来源日期覆盖 ${observedDays}/${expectedDays} 天，未返回的日期不补零；来源窗口不随站内天数筛选改变。`,
      evidence.engine === "bing" ? "Bing 逐日总量包含 Web 与 Chat，页面明细仅 Web；来源时区尚未确认。" : "Google 仅 Web 搜索；域资源总量可含子域名，公开页面明细不是站点总量。",
      "Provider settlement is unknown; unavailable days and selected page rows are not completeness evidence.",
    ],
  };
}

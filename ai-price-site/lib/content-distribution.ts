import "server-only";
import { assertLocalContentDatabase } from "./managed-content";
import { assertContentDistributionCurrent, finishContentDistribution, readRevision, recordContentDistribution } from "./managed-content-store";
import { purgeContentUrl, readContentEndpoint, verifyContentDistribution } from "./content-readback";

export type ContentDistributionConfig = { originPort: number; zoneId: string; token: string; cachePolicy: "audited-single-url" };
/** Server configuration is never accepted from form data or returned to clients. */
export function contentDistributionConfig(env: Record<string, string | undefined> = process.env): ContentDistributionConfig | null {
  if (env.GEOSUB_CONTENT_DISTRIBUTION !== "cloudflare") {
    assertLocalContentDatabase(env.DATABASE_URL);
    return null;
  }
  // A local rehearsal must never purge a production page, even with copied env.
  try { assertLocalContentDatabase(env.DATABASE_URL); }
  catch {
    const originPort = Number(env.GEOSUB_CONTENT_ORIGIN_PORT);
    const zoneId = env.GEOSUB_CONTENT_CF_ZONE_ID || "";
    const token = env.GEOSUB_CONTENT_CF_API_TOKEN || "";
    if (env.GEOSUB_CONTENT_CACHE_POLICY !== "audited-single-url" || !Number.isSafeInteger(originPort) || originPort < 1024 || originPort > 65535 || !/^[a-f0-9]{32}$/i.test(zoneId) || !token || /\s/.test(token)) throw new Error("生产内容分发配置尚未就绪。");
    return {originPort,zoneId,token,cachePolicy:"audited-single-url"};
  }
  throw new Error("本地数据库不能清理生产缓存。");
}

export async function distributeContentAttempt(id: string, owner: string, invalidateOrigin: () => Promise<void>, config: ContentDistributionConfig | null) {
  if (!config) {
    try { await invalidateOrigin(); }
    catch {
      await finishContentDistribution(id, owner, false);
      throw new Error("内容版本已保存，缓存失效失败；请等待五秒后重试分发。");
    }
    if (!await finishContentDistribution(id, owner, true)) throw new Error("分发结果已过期，请刷新检查当前版本和回执。");
    return "origin_invalidated" as const;
  }
  const identity = await assertContentDistributionCurrent(id, owner);
  const revision = await readRevision(identity.version);
  if (!revision) throw new Error("内容修订不存在。");
  const content = revision.content;
  const expected = {title:content ? `${content.title} - GeoSub` : undefined,heading:content?.heading,description:content?.description,content,version:String(identity.version),modeGeneration:String(identity.modeGeneration)};
  const result = await verifyContentDistribution({
    assertCurrent: async () => { await assertContentDistributionCurrent(id, owner); },
    invalidateOrigin,
    origin: () => readContentEndpoint("origin", config.originPort, expected),
    purge: () => purgeContentUrl(config),
    public: () => readContentEndpoint("public", config.originPort, expected),
  });
  if (!await recordContentDistribution(id, owner, result)) throw new Error("内容已保存，但源站或公网验收未完成；请查看分发回执后重试。");
  return "verified" as const;
}

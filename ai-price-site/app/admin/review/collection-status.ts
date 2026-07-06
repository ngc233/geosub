export type CollectionRunStatus =
  | "queued"
  | "fresh"
  | "none"
  | "cooldown"
  | "succeeded"
  | "failed"
  | "not_found"
  | "not_configured";

export type CollectionRunResult = {
  queuedCount: number;
  runStatus: CollectionRunStatus;
};

export type CollectionStatusTone = "success" | "warning" | "error";

const knownStatuses = new Set<CollectionRunStatus>([
  "queued",
  "fresh",
  "none",
  "cooldown",
  "succeeded",
  "failed",
  "not_found",
  "not_configured",
]);

export function normalizeCollectionRunStatus(status: string | null | undefined) {
  return knownStatuses.has(status as CollectionRunStatus)
    ? (status as CollectionRunStatus)
    : null;
}

export function buildCollectionRedirectPath(
  { queuedCount, runStatus }: CollectionRunResult,
  productSlug?: string,
) {
  const redirectParams = new URLSearchParams({
    collectionQueued: String(queuedCount),
    collectionRun: runStatus,
  });
  const trimmedProductSlug = String(productSlug ?? "").trim();

  if (trimmedProductSlug) {
    redirectParams.set("collectionScope", trimmedProductSlug);
    redirectParams.set("q", trimmedProductSlug);
  }

  return `/admin/review?${redirectParams.toString()}`;
}

export function getCollectionStatusTone(status: string | null | undefined): CollectionStatusTone {
  const normalizedStatus = normalizeCollectionRunStatus(status);

  if (normalizedStatus === "failed" || normalizedStatus === "not_found") {
    return "error";
  }

  if (
    normalizedStatus === "cooldown" ||
    normalizedStatus === "fresh" ||
    normalizedStatus === "none" ||
    normalizedStatus === "not_configured"
  ) {
    return "warning";
  }

  return "success";
}

export function getCollectionStatusClassName(status: string | null | undefined) {
  const tone = getCollectionStatusTone(status);

  if (tone === "error") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

export function getCollectionStatusMessage({
  queuedCount,
  collectionRun,
  collectionScope,
}: {
  queuedCount: number;
  collectionRun: string | null | undefined;
  collectionScope?: string | null;
}) {
  const normalizedStatus = normalizeCollectionRunStatus(collectionRun);
  const scopeLabel = collectionScope ? ` ${collectionScope}` : "";

  switch (normalizedStatus) {
    case "succeeded":
      return `已立即执行${collectionScope ? ` ${collectionScope} 的` : ""} ${queuedCount} 个 App Store 补采任务，并完成真实稳定性审核。下方“最新审核结果”会显示正式入库数量。`;
    case "cooldown":
      return "已收到补采请求，但相关任务 2 分钟内刚执行过，本次进入冷却保护。";
    case "fresh":
      return `${collectionScope ? `${collectionScope} ` : ""}12 小时内已经成功采集过，本次跳过补采；可以等待后台定时任务或后续再手动更新。`;
    case "not_configured":
      return `${collectionScope ? `${collectionScope} ` : "这个产品"}还没有可用的 App Store 采集任务。请先到产品库补充 App Store 链接或应用 ID，再回来采集。`;
    case "not_found":
      return `没有找到${scopeLabel} 对应的产品，请检查服务库 slug，或从线索入口重新加入服务库。`;
    case "failed":
      return "补采任务已排队，但立即执行失败；后台定时任务仍会继续处理，请查看采集任务页的失败原因。";
    case "none":
      return "当前没有需要立即补采的 App Store 任务。可以先筛选具体产品，或等待后台定时采集。";
    case "queued":
      return `已排队并唤起后台采集器${collectionScope ? `：${collectionScope}` : ""}，共 ${queuedCount} 个 App Store 任务。采集完成后会自动审核，运行记录可在采集任务页查看。`;
    default:
      return `已处理 ${queuedCount} 个 App Store 补采任务。`;
  }
}

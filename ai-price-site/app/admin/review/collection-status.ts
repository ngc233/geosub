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
      return `\u5df2\u7acb\u5373\u6267\u884c${collectionScope ? ` ${collectionScope} \u7684` : ""} ${queuedCount} \u4e2a App Store \u8865\u91c7\u4efb\u52a1\uff0c\u5e76\u5b8c\u6210\u771f\u5b9e\u7a33\u5b9a\u6027\u5ba1\u6838\u3002\u4e0b\u65b9\u201c\u6700\u65b0\u5ba1\u6838\u7ed3\u679c\u201d\u4f1a\u663e\u793a\u6b63\u5f0f\u5165\u5e93\u6570\u91cf\u3002`;
    case "cooldown":
      return "\u5df2\u6536\u5230\u8865\u91c7\u8bf7\u6c42\uff0c\u4f46\u76f8\u5173\u4efb\u52a1 2 \u5206\u949f\u5185\u521a\u6267\u884c\u8fc7\uff0c\u672c\u6b21\u8fdb\u5165\u51b7\u5374\u4fdd\u62a4\u3002";
    case "fresh":
      return `${collectionScope ? `${collectionScope} ` : ""}12 \u5c0f\u65f6\u5185\u5df2\u7ecf\u6210\u529f\u91c7\u96c6\u8fc7\uff0c\u672c\u6b21\u8df3\u8fc7\u8865\u91c7\uff1b\u53ef\u4ee5\u7b49\u5f85\u540e\u53f0\u5b9a\u65f6\u4efb\u52a1\u6216\u540e\u7eed\u518d\u624b\u52a8\u66f4\u65b0\u3002`;
    case "not_configured":
      return `${collectionScope ? `${collectionScope} ` : "\u8fd9\u4e2a\u4ea7\u54c1"}\u8fd8\u6ca1\u6709\u53ef\u7528\u7684 App Store \u91c7\u96c6\u4efb\u52a1\u3002\u8bf7\u5148\u5230\u4ea7\u54c1\u5e93\u8865\u5145 App Store \u94fe\u63a5\u6216\u5e94\u7528 ID\uff0c\u518d\u56de\u6765\u91c7\u96c6\u3002`;
    case "not_found":
      return `\u6ca1\u6709\u627e\u5230${scopeLabel} \u5bf9\u5e94\u7684\u4ea7\u54c1\uff0c\u8bf7\u68c0\u67e5\u670d\u52a1\u5e93 slug\uff0c\u6216\u4ece\u7ebf\u7d22\u5165\u53e3\u91cd\u65b0\u52a0\u5165\u670d\u52a1\u5e93\u3002`;
    case "failed":
      return "\u8865\u91c7\u4efb\u52a1\u5df2\u6392\u961f\uff0c\u4f46\u7acb\u5373\u6267\u884c\u5931\u8d25\uff1b\u540e\u53f0\u5b9a\u65f6\u4efb\u52a1\u4ecd\u4f1a\u7ee7\u7eed\u5904\u7406\uff0c\u8bf7\u67e5\u770b\u91c7\u96c6\u4efb\u52a1\u9875\u7684\u5931\u8d25\u539f\u56e0\u3002";
    case "none":
      return "\u5f53\u524d\u6ca1\u6709\u9700\u8981\u7acb\u5373\u8865\u91c7\u7684 App Store \u4efb\u52a1\u3002\u53ef\u4ee5\u5148\u7b5b\u9009\u5177\u4f53\u4ea7\u54c1\uff0c\u6216\u7b49\u5f85\u540e\u53f0\u5b9a\u65f6\u91c7\u96c6\u3002";
    case "queued":
      return `\u5df2\u6392\u961f\u5e76\u5524\u8d77\u540e\u53f0\u91c7\u96c6\u5668${collectionScope ? `\uff1a${collectionScope}` : ""}\uff0c\u5171 ${queuedCount} \u4e2a App Store \u4efb\u52a1\u3002\u91c7\u96c6\u5b8c\u6210\u540e\u4f1a\u81ea\u52a8\u5ba1\u6838\uff0c\u8fd0\u884c\u8bb0\u5f55\u53ef\u5728\u91c7\u96c6\u4efb\u52a1\u9875\u67e5\u770b\u3002`;
    default:
      return `\u5df2\u5904\u7406 ${queuedCount} \u4e2a App Store \u8865\u91c7\u4efb\u52a1\u3002`;
  }
}

import { workspaceStatus, type WorkspaceRow } from "../../lib/admin-workspace-model";
import { adminListLocation, withAdminReturnTo } from "../../lib/admin-workflow-context";

export type WorkspaceTone = "success" | "warning" | "danger" | "info" | "neutral";

export type WorkspaceBadgeView = {
  label: string;
  tone: WorkspaceTone;
};

export type WorkspaceItemView = {
  id: string;
  slug: string;
  name: string;
  billingPlatform: "ios" | "web";
  summary: string;
  needsAction: boolean;
  inProgress: boolean;
  publication: WorkspaceBadgeView;
  quality: WorkspaceBadgeView;
  collection: WorkspaceBadgeView;
  primaryHref: string;
  workspaceHref: string;
};

export type WorkspaceViewModel = {
  items: WorkspaceItemView[];
  counts: {
    action: number;
    progress: number;
    all: number;
  };
  latestChecked: string | null;
  partial: boolean;
  failed: boolean;
  readAt: string;
};

function computeTones(
  row: WorkspaceRow,
  partial: boolean,
): { publication: WorkspaceTone; quality: WorkspaceTone; collection: WorkspaceTone } {
  const status = row.publish_status.toLowerCase();
  return {
    publication: status === "published" ? "success" : status === "review" ? "warning" : "neutral",
    quality: row.price_count === 0 ? "danger" : row.stale_count > 0 ? "warning" : "success",
    collection: partial
      ? "neutral"
      : row.running_count > 0
        ? "info"
        : row.failed_count > 0
          ? "danger"
          : row.queued_count > 0
            ? "info"
            : "neutral",
  };
}

function buildSummary(row: WorkspaceRow, partial: boolean): string {
  const platform = row.billing_platform === "web" ? "官网" : "App Store";
  if (row.price_count === 0) {
    return `尚无 ${platform} 正式价格，请核对是否需要补齐。`;
  }
  if (row.stale_count > 0) {
    return `${row.stale_count} 条 ${platform} 正式价格超过 14 天未核验或缺少核验时间。`;
  }
  if (row.failed_count > 0 && !partial) {
    return (row.review_failed_count ?? 0) > 0
      ? "已有采集证据，但自动审核失败，请检查失败阶段。"
      : "已配置任务最近一次采集失败，请检查运行记录。";
  }
  return `${row.price_count} 条 ${platform} 正式价格。`;
}

function buildPrimaryHref(row: WorkspaceRow, partial: boolean, returnTo: string): string {
  const target =
    row.billing_platform === "web"
      ? `/admin/collector-jobs?product=${encodeURIComponent(row.slug)}`
      : row.stale_count > 0
        ? `/admin/data-quality/${encodeURIComponent(row.slug)}`
        : !partial && row.failed_count > 0
          ? `/admin/review?q=${encodeURIComponent(row.slug)}`
          : `/admin/products/${row.id}/edit`;
  return withAdminReturnTo(target, returnTo);
}

/** Pure ViewModel builder shared by workspace-adapter and unit tests. */
export function buildWorkspaceViewModel(
  rows: WorkspaceRow[],
  {
    partial,
    failed,
    view,
    page,
    readAt,
  }: {
    partial: boolean;
    failed: boolean;
    view: string;
    page?: string;
    readAt: string;
  },
): WorkspaceViewModel {
  const items: WorkspaceItemView[] = rows.map((row) => {
    const state = workspaceStatus(row, partial);
    const tone = computeTones(row, partial);
    const returnTo = adminListLocation("/admin", { page, view }, `workspace-row-${row.id}`);

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      billingPlatform: row.billing_platform === "web" ? "web" : "ios",
      summary: buildSummary(row, partial),
      needsAction: state.needsAction,
      inProgress: state.progress,
      publication: { label: `发布：${state.publication}`, tone: tone.publication },
      quality: { label: `数据：${state.quality}`, tone: tone.quality },
      collection: { label: `采集：${state.collection}`, tone: tone.collection },
      primaryHref: buildPrimaryHref(row, partial, returnTo),
      workspaceHref: withAdminReturnTo(`/admin/products/${row.id}/edit`, returnTo),
    };
  });

  const latestChecked =
    rows
      .map((row) => row.latest_checked)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

  return {
    items,
    counts: {
      action: items.filter((item) => item.needsAction).length,
      progress: items.filter((item) => item.inProgress).length,
      all: items.length,
    },
    latestChecked,
    partial,
    failed,
    readAt,
  };
}

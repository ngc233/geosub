"use client";

import AdminProductLogo from "@/components/admin/AdminProductLogo";
import AdminPagination from "@/components/admin/AdminPagination";
import { AdminLinkButton } from "@/components/admin/AdminButton";
import AdminAlert from "@/components/admin/AdminAlert";
import AdminLink from "@/components/admin/AdminLink";
import AdminSegmentedControl from "@/components/admin/AdminSegmentedControl";
import { createAdminListView } from "@/lib/admin-list-params";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import type { WorkspaceItemView, WorkspaceTone, WorkspaceViewModel } from "./workspace-adapter";

type Props = {
  viewModel: WorkspaceViewModel;
  initialFilter: "action" | "progress" | "all";
  initialPage?: string;
  role: string;
  denied: boolean;
  versionOverview?: ReactNode;
};

const dotTone: Record<WorkspaceTone, string> = {
  success: "bg-admin-success",
  warning: "bg-admin-warning",
  danger: "bg-admin-danger",
  info: "bg-admin-text",
  neutral: "bg-admin-text-faint",
};

const textTone: Record<WorkspaceTone, string> = {
  success: "text-admin-success",
  warning: "text-admin-warning",
  danger: "text-admin-danger",
  info: "text-admin-text",
  neutral: "text-admin-text-muted",
};

const roleNames: Record<string, string> = {
  OWNER: "管理员",
  EDITOR: "编辑",
  VIEWER: "只读成员",
};

function itemSeverityDot(item: WorkspaceItemView): string {
  if (item.quality.tone === "danger" || item.collection.tone === "danger") {
    return "bg-admin-danger";
  }
  if (item.quality.tone === "warning" || item.publication.tone === "warning") {
    return "bg-admin-warning";
  }
  if (item.inProgress) {
    return "bg-admin-text";
  }
  return "bg-admin-success";
}

export default function Workspace({
  viewModel,
  initialFilter,
  initialPage,
  role,
  denied,
  versionOverview,
}: Props) {
  const router = useRouter();
  const [filter, setFilterState] = useState<"action" | "progress" | "all">(initialFilter);
  const [page, setPage] = useState(initialPage);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function setFilter(value: string) {
    const next = value === "all" || value === "progress" ? value : "action";
    setFilterState(next);
    setPage(undefined);
    setSelectedId(null);
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    url.searchParams.delete("page");
    router.replace(url.pathname + url.search + url.hash, { scroll: false });
  }

  const displayed = viewModel.items.filter(
    (item) =>
      filter === "all" || (filter === "action" ? item.needsAction : item.inProgress),
  );

  const list = createAdminListView(displayed, {
    basePath: "/admin",
    params: { page, view: filter },
    pageSize: 15,
    id: "workspace-list",
  });

  const activeItem =
    list.items.find((item) => item.id === selectedId) ?? list.items[0] ?? null;

  return (
    <div className="-mx-4 -my-5 flex min-h-[calc(100vh-48px)] flex-col sm:-mx-6 lg:-mx-8 lg:-my-6">
      {/* Compact edge-to-edge triage bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border bg-admin-surface px-4 py-2.5 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <AdminSegmentedControl
            ariaLabel="待办筛选"
            size="sm"
            value={filter}
            onChange={setFilter}
            items={[
              {
                value: "action",
                label: `需要处理 ${viewModel.failed ? "—" : viewModel.counts.action}`,
              },
              {
                value: "progress",
                label: `执行中 ${viewModel.failed || viewModel.partial ? "—" : viewModel.counts.progress}`,
              },
              {
                value: "all",
                label: `全部产品 ${viewModel.failed ? "—" : viewModel.counts.all}`,
              },
            ]}
          />
          <span
            id="workspace-list"
            className="hidden text-xs tabular-nums text-admin-text-faint md:inline"
          >
            {viewModel.failed ? "读取失败" : `${displayed.length} 项`}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-admin-text-muted">
          <span className="hidden tabular-nums xl:inline">{viewModel.readAt}</span>
          <AdminLink
            href="/admin/products"
            className="font-medium text-admin-text-secondary hover:text-admin-text hover:underline"
          >
            产品目录
          </AdminLink>
          <AdminLink
            href="/admin/analytics"
            className="font-medium text-admin-text-secondary hover:text-admin-text hover:underline"
          >
            流量分析
          </AdminLink>
        </div>
      </div>

      {denied ? (
        <div className="border-b border-admin-border px-4 py-3 sm:px-6">
          <AdminAlert variant="warning" title="权限受限">
            当前账号没有该操作权限。正式数据与系统操作需由管理员执行。
          </AdminAlert>
        </div>
      ) : null}

      {viewModel.failed ? (
        <div className="border-b border-admin-border px-4 py-3 sm:px-6">
          <AdminAlert variant="danger" title="工作台数据暂时不可用">
            请稍后刷新重试。系统不会将读取失败显示为零项待办。
          </AdminAlert>
        </div>
      ) : null}

      {/* Linear-style Split-Pane Inbox */}
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Left Pane: Triage Queue */}
        <section
          aria-label="待办队列"
          className="flex flex-col border-b border-admin-border bg-admin-surface lg:border-b-0 lg:border-r"
        >
          {displayed.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
              <CheckCircle2
                size={24}
                strokeWidth={1.6}
                className="text-admin-text-faint"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-medium text-admin-text">
                {viewModel.failed
                  ? "暂时无法读取待办"
                  : filter === "action"
                    ? "当前没有需要人工处理的异常"
                    : "当前筛选下暂无记录"}
              </p>
              <p className="mt-1 max-w-xs text-xs leading-5 text-admin-text-muted">
                {viewModel.partial && filter === "progress"
                  ? "本地快照未导入运行记录，无法判断生产采集进度。"
                  : "可切换上方“全部产品”或按 ⌘K 跳转到指定产品。"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-admin-border">
              {list.items.map((item) => {
                const selected = activeItem?.id === item.id;
                return (
                  <article
                    key={item.id}
                    id={`workspace-row-${item.id}`}
                    className={[
                      "relative transition-colors",
                      selected ? "bg-admin-surface-subtle" : "hover:bg-admin-row-hover",
                    ].join(" ")}
                  >
                    {selected ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 w-[2px] bg-admin-text"
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      aria-pressed={selected}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-admin-accent"
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-2 h-2 w-2 shrink-0 rounded-full ${itemSeverityDot(item)}`}
                      />
                      <AdminProductLogo slug={item.slug} name={item.name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-medium text-admin-text">
                            {item.name}
                          </span>
                          <span className="shrink-0 rounded border border-admin-border bg-admin-surface px-1.5 py-0.5 font-mono text-[10px] text-admin-text-faint">
                            {item.billingPlatform === "web" ? "WEB" : "iOS"}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-admin-text-muted">
                          {item.summary}
                        </p>
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          {list.pagination.totalPages > 1 ? (
            <AdminPagination
              {...list.pagination}
              showCount={false}
              ariaLabel="待办底部分页"
              className="mt-auto border-t border-admin-border px-4 py-2.5"
            />
          ) : null}
        </section>

        {/* Right Pane: Live Inspector */}
        <section aria-label="选中项详情" className="flex min-w-0 flex-col bg-admin-surface">
          {activeItem ? (
            <div className="flex-1 p-5 sm:p-7">
              <div className="flex flex-col gap-4 border-b border-admin-border pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-3.5">
                  <AdminProductLogo slug={activeItem.slug} name={activeItem.name} size="md" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-lg font-semibold tracking-tight text-admin-text">
                        {activeItem.name}
                      </h1>
                      <span className="font-mono text-xs text-admin-text-faint">
                        {activeItem.slug}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-admin-text-muted">
                      主计费口径：{activeItem.billingPlatform === "web" ? "官网直采 (Web)" : "App Store (iOS)"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <AdminLinkButton href={activeItem.workspaceHref} variant="secondary" size="sm">
                    打开产品工作区
                  </AdminLinkButton>
                  <AdminLinkButton href={activeItem.primaryHref} variant="primary" size="sm">
                    {role === "OWNER" ? "查看并处理" : "查看详情"}
                    <ArrowRight size={14} aria-hidden="true" />
                  </AdminLinkButton>
                </div>
              </div>

              {/* 3-State Signal Matrix */}
              <div className="grid divide-y divide-admin-border border-b border-admin-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {[
                  { title: "发布状态", badge: activeItem.publication },
                  { title: "价格数据", badge: activeItem.quality },
                  { title: "采集运行", badge: activeItem.collection },
                ].map(({ title, badge }) => (
                  <div key={title} className="py-4 sm:px-4 sm:first:pl-0 sm:last:pr-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-admin-text-faint">
                      {title}
                    </p>
                    <p
                      className={`mt-1.5 flex items-center gap-2 text-sm font-medium ${textTone[badge.tone]}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`h-2 w-2 shrink-0 rounded-full ${dotTone[badge.tone]}`}
                      />
                      <span>{badge.label.replace(/^[^：]+：/, "")}</span>
                    </p>
                  </div>
                ))}
              </div>

              {/* Diagnostic Brief */}
              <div className="border-b border-admin-border py-5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-admin-text-faint">
                  当前诊断与建议动作
                </p>
                <p className="mt-2 text-sm leading-6 text-admin-text-body">{activeItem.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { label: "概览与资料", href: activeItem.workspaceHref },
                    {
                      label: "套餐配置",
                      href: `/admin/products/${activeItem.id}/edit?tab=plans`,
                    },
                    {
                      label: "采集来源",
                      href: `/admin/products/${activeItem.id}/edit?tab=sources`,
                    },
                    {
                      label: "正式价格",
                      href: `/admin/products/${activeItem.id}/edit?tab=prices`,
                    },
                    {
                      label: "SEO 配置",
                      href: `/admin/products/${activeItem.id}/edit?tab=seo`,
                    },
                    {
                      label: "质量诊断",
                      href: `/admin/data-quality/${encodeURIComponent(activeItem.slug)}`,
                    },
                  ].map((shortcut) => (
                    <AdminLink
                      key={shortcut.label}
                      href={shortcut.href}
                      className="inline-flex h-8 items-center gap-1 rounded-admin-control border border-admin-border bg-admin-surface-subtle px-2.5 text-xs font-medium text-admin-text-secondary transition hover:border-admin-border-strong hover:text-admin-text"
                    >
                      {shortcut.label}
                      <ArrowUpRight size={12} aria-hidden="true" className="opacity-60" />
                    </AdminLink>
                  ))}
                </div>
              </div>

              {/* Compact Runtime Footer */}
              <div className="pt-5">
                {versionOverview ? <div className="mb-4">{versionOverview}</div> : null}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-admin-text-muted">
                  <span>
                    角色：<strong className="font-medium text-admin-text">{roleNames[role] || "未知"}</strong>
                  </span>
                  <span className="tabular-nums">
                    最新价格核验：
                    {viewModel.latestChecked
                      ? new Date(viewModel.latestChecked).toLocaleDateString("zh-CN", {
                          timeZone: "Asia/Shanghai",
                        })
                      : "不可用"}
                  </span>
                  <span>数据源：{viewModel.partial ? "本地快照" : "当前数据库"}</span>
                </div>
                <details className="mt-3 text-xs text-admin-text-faint">
                  <summary className="cursor-pointer hover:text-admin-text-secondary">
                    口径与操作边界说明
                  </summary>
                  <p className="mt-2 max-w-2xl leading-6 text-admin-text-muted">
                    发布状态、价格时效与采集状态相互独立；点选与查看详情均为只读查询，不会触发采集或发布。管理员维护正式数据，编辑仅维护独立草稿，只读成员仅浏览。
                  </p>
                </details>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col justify-between p-6">
              <div className="py-10 text-center text-sm text-admin-text-muted">
                从左侧队列选择一项查看详情，或按 <kbd className="rounded border border-admin-border px-1.5 py-0.5 font-mono text-xs">⌘K</kbd> 跳转。
              </div>
              {versionOverview}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

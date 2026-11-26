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
    <div className="-mx-4 -my-5 flex min-h-[calc(100vh-56px)] flex-col sm:-mx-6 lg:-mx-8 lg:-my-6">
      {/* Full-width triage toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border bg-admin-surface px-4 py-3 sm:px-6">
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
            className="hidden text-xs tabular-nums text-admin-text-muted md:inline"
          >
            {viewModel.failed ? "读取失败" : `共 ${displayed.length} 项`}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[13px] text-admin-text-muted">
          <span className="hidden text-xs tabular-nums xl:inline">{viewModel.readAt}</span>
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

      {/* Full-width 3-Column Adaptive Linear Layout: Queue | Main Inspector | Right Properties Rail */}
      <div className="grid w-full flex-1 grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)_320px]">
        {/* Left Pane: Triage Queue */}
        <section
          aria-label="待办队列"
          className="flex flex-col border-b border-admin-border bg-admin-surface lg:border-b-0 lg:border-r"
        >
          {displayed.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <CheckCircle2
                size={24}
                strokeWidth={1.6}
                className="mx-auto text-admin-text-faint"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-medium text-admin-text">
                {viewModel.failed
                  ? "暂时无法读取待办"
                  : filter === "action"
                    ? "当前没有需要人工处理的异常"
                    : "当前筛选下暂无记录"}
              </p>
              <p className="mx-auto mt-1.5 max-w-xs text-xs leading-5 text-admin-text-muted">
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
                        className="absolute inset-y-0 left-0 w-[3px] bg-admin-text"
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      aria-pressed={selected}
                      className="flex w-full items-start gap-3 px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-admin-accent"
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-2 h-2 w-2 shrink-0 rounded-full ${itemSeverityDot(item)}`}
                      />
                      <AdminProductLogo slug={item.slug} name={item.name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-admin-text">
                            {item.name}
                          </span>
                          <span className="shrink-0 rounded border border-admin-border bg-admin-surface px-1.5 py-0.5 font-mono text-[10px] text-admin-text-muted">
                            {item.billingPlatform === "web" ? "WEB" : "iOS"}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-admin-text-muted">
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
              className="mt-auto border-t border-admin-border px-4 py-3"
            />
          ) : null}
        </section>

        {/* Center Pane: Live Inspector */}
        <section aria-label="选中项详情" className="min-w-0 bg-admin-surface">
          {activeItem ? (
            <div className="p-6 sm:p-8">
              <div className="flex flex-col gap-4 border-b border-admin-border pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-3.5">
                  <AdminProductLogo slug={activeItem.slug} name={activeItem.name} size="md" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-xl font-semibold tracking-tight text-admin-text">
                        {activeItem.name}
                      </h1>
                      <span className="font-mono text-xs text-admin-text-faint">
                        {activeItem.slug}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-admin-text-muted">
                      主计费口径：
                      {activeItem.billingPlatform === "web" ? "官网直采 (Web)" : "App Store (iOS)"}
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
                  <div key={title} className="py-5 sm:px-5 sm:first:pl-0 sm:last:pr-0">
                    <p className="text-xs font-medium text-admin-text-muted">{title}</p>
                    <p
                      className={`mt-2 flex items-center gap-2 text-sm font-medium ${textTone[badge.tone]}`}
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
              <div className="py-6">
                <p className="text-xs font-medium text-admin-text-muted">当前诊断与建议动作</p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-admin-text-body">
                  {activeItem.summary}
                </p>

                <p className="mt-6 text-xs font-medium text-admin-text-muted">单产品工作区快捷直达</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { label: "概览与资料", desc: "基础字段、分类与品牌资产", href: activeItem.workspaceHref },
                    {
                      label: "套餐配置",
                      desc: "查看与维护订阅套餐",
                      href: `/admin/products/${activeItem.id}/edit?tab=plans`,
                    },
                    {
                      label: "采集来源",
                      desc:
                        activeItem.billingPlatform === "web"
                          ? "官网采集任务与运行记录"
                          : "App Store 来源与运行记录",
                      href: `/admin/products/${activeItem.id}/edit?tab=sources`,
                    },
                    {
                      label: "正式价格",
                      desc: "各地区美元折算与质量",
                      href: `/admin/products/${activeItem.id}/edit?tab=prices`,
                    },
                    {
                      label: "SEO 配置",
                      desc: "标题、Canonical 与结构化数据",
                      href: `/admin/products/${activeItem.id}/edit?tab=seo`,
                    },
                    {
                      label: "质量诊断",
                      desc: "覆盖缺口与采集健康详情",
                      href: `/admin/data-quality/${encodeURIComponent(activeItem.slug)}`,
                    },
                  ].map((shortcut) => (
                    <AdminLink
                      key={shortcut.label}
                      href={shortcut.href}
                      className="group flex items-start justify-between gap-2 rounded-admin-card border border-admin-border bg-admin-surface-subtle/50 p-3.5 transition hover:border-admin-border-strong hover:bg-admin-surface-subtle"
                    >
                      <div className="min-w-0">
                        <span className="block text-[13px] font-medium text-admin-text">
                          {shortcut.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-admin-text-muted">
                          {shortcut.desc}
                        </span>
                      </div>
                      <ArrowUpRight
                        size={14}
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 text-admin-text-faint transition group-hover:text-admin-text"
                      />
                    </AdminLink>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 sm:p-8">
              <div className="rounded-admin-card border border-admin-border bg-admin-surface-subtle/60 px-6 py-10 text-center">
                <p className="text-sm font-medium text-admin-text">当前无选中项</p>
                <p className="mt-1.5 text-[13px] text-admin-text-muted">
                  从左侧队列选择一项查看详情，或按{" "}
                  <kbd className="rounded border border-admin-border bg-admin-surface px-1.5 py-0.5 font-mono text-xs text-admin-text">
                    ⌘K
                  </kbd>{" "}
                  快速跳转。
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Right Properties / System Rail (Linear-style contextual metadata panel) */}
        <aside
          aria-label="运行概况与系统边界"
          className="border-t border-admin-border bg-admin-surface-subtle/40 p-5 lg:col-span-2 xl:col-span-1 xl:border-l xl:border-t-0"
        >
          <div className="space-y-5">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-admin-text-muted">
                队列统计
              </h2>
              <dl className="mt-3 divide-y divide-admin-border rounded-admin-card border border-admin-border bg-admin-surface px-3.5 text-[13px]">
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-admin-text-muted">需要处理</dt>
                  <dd className="font-semibold tabular-nums text-admin-text">
                    {viewModel.failed ? "—" : viewModel.counts.action}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-admin-text-muted">系统执行中</dt>
                  <dd className="font-semibold tabular-nums text-admin-text">
                    {viewModel.failed || viewModel.partial ? "—" : viewModel.counts.progress}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-admin-text-muted">全部活跃产品</dt>
                  <dd className="font-semibold tabular-nums text-admin-text">
                    {viewModel.failed ? "—" : viewModel.counts.all}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-admin-text-muted">
                运行环境
              </h2>
              <dl className="mt-3 divide-y divide-admin-border rounded-admin-card border border-admin-border bg-admin-surface px-3.5 text-[13px]">
                <div className="flex items-center justify-between gap-2 py-2.5">
                  <dt className="text-admin-text-muted">当前角色</dt>
                  <dd className="font-medium text-admin-text">{roleNames[role] || "未知"}</dd>
                </div>
                <div className="flex items-center justify-between gap-2 py-2.5">
                  <dt className="text-admin-text-muted">最新价格核验</dt>
                  <dd className="tabular-nums text-admin-text-secondary">
                    {viewModel.latestChecked
                      ? new Date(viewModel.latestChecked).toLocaleDateString("zh-CN", {
                          timeZone: "Asia/Shanghai",
                        })
                      : "不可用"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2 py-2.5">
                  <dt className="text-admin-text-muted">数据源</dt>
                  <dd className="text-admin-text-secondary">
                    {viewModel.partial ? "本地快照" : "当前数据库"}
                  </dd>
                </div>
              </dl>
            </div>

            {versionOverview ? <div>{versionOverview}</div> : null}

            <details className="rounded-admin-card border border-admin-border bg-admin-surface px-3.5 py-3 text-xs text-admin-text-muted">
              <summary className="cursor-pointer font-medium text-admin-text-secondary">
                口径与操作边界
              </summary>
              <p className="mt-2 leading-5 text-admin-text-muted">
                发布状态、价格时效与采集状态相互独立；点选与查看详情均为只读查询，不会触发采集或发布。
              </p>
            </details>
          </div>
        </aside>
      </div>
    </div>
  );
}

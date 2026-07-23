import Link from "next/link";
import { ArrowDown, ArrowUp, Pencil } from "lucide-react";
import { AdminCard, AdminPageHeader } from "../../../components/admin/AdminCard";
import { AdminButton, AdminLinkButton } from "../../../components/admin/AdminButton";
import SegmentedControl from "../../../components/ui/SegmentedControl";
import { getDefaultNavigationItems } from "../../../lib/navigation-defaults";
import { getNavigationLinkHealth } from "../../../lib/navigation-health";
import {
  getNavigationLocaleByDbValue,
  getNavigationLocaleByValue,
  getNavigationPositionByDbValue,
  getNavigationPositionByValue,
  isNavigationHomeHref,
  navigationLocales,
  navigationPositions,
} from "../../../lib/navigation-config";
import { prisma } from "../../../lib/prisma";
import {
  moveNavigationItem,
  seedDefaultNavigation,
  toggleNavigationItemStatus,
} from "./actions";

function statusLabel(status: string) {
  if (status === "PUBLISHED") return "已启用";
  if (status === "DRAFT") return "已停用";
  if (status === "ARCHIVED") return "已归档";
  return status;
}

function statusClassName(status: string) {
  if (status === "PUBLISHED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "DRAFT") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1",
        statusClassName(status),
      ].join(" ")}
    >
      {statusLabel(status)}
    </span>
  );
}

function linkHealthClassName(tone: string) {
  if (tone === "success") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (tone === "danger") return "bg-red-50 text-red-700 ring-red-200";
  if (tone === "warning") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (tone === "info") return "bg-blue-50 text-blue-700 ring-blue-200";
  return "bg-slate-100 text-slate-500 ring-slate-200";
}

function LinkHealthBadge({
  href,
  external,
  status,
}: {
  href: string;
  external: boolean;
  status: string;
}) {
  const health = getNavigationLinkHealth({
    href,
    external,
    status,
  });

  return (
    <span
      title={health.detail}
      className={[
        "mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-black ring-1",
        linkHealthClassName(health.tone),
      ].join(" ")}
    >
      {health.label}
    </span>
  );
}

function ToggleStatusButton({
  id,
  href,
  external,
  status,
}: {
  id: string;
  href: string;
  external: boolean;
  status: string;
}) {
  const homeHref = isNavigationHomeHref(href);
  const published = status === "PUBLISHED";

  if (homeHref && published) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-400">
        已锁定
      </span>
    );
  }

  const publishHealth = getNavigationLinkHealth({
    href,
    external,
    status: "PUBLISHED",
  });

  if (!published && publishHealth.tone === "danger") {
    return (
      <span
        title={publishHealth.detail}
        className="inline-flex rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-700 ring-1 ring-red-200"
      >
        不可启用
      </span>
    );
  }

  return (
    <form action={toggleNavigationItemStatus.bind(null, id)}>
      <AdminButton
        type="submit"
        size="sm"
        variant={published ? "warning" : "secondary"}
      >
        {published ? "停用" : "启用"}
      </AdminButton>
    </form>
  );
}

function SortButtons({ id, href }: { id: string; href: string }) {
  if (isNavigationHomeHref(href)) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-400">
        固定
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <form action={moveNavigationItem.bind(null, id, "up")}>
        <AdminButton
          type="submit"
          variant="secondary"
          size="sm"
          className="w-9 px-0"
          aria-label="上移"
          title="上移"
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
        </AdminButton>
      </form>

      <form action={moveNavigationItem.bind(null, id, "down")}>
        <AdminButton
          type="submit"
          variant="secondary"
          size="sm"
          className="w-9 px-0"
          aria-label="下移"
          title="下移"
        >
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </AdminButton>
      </form>
    </div>
  );
}

function EditButton({ id }: { id: string }) {
  return (
    <AdminLinkButton
      href={`/admin/navigation/${id}/edit`}
      variant="secondary"
      size="sm"
      className="w-9 px-0"
      ariaLabel="编辑"
      title="编辑"
    >
      <Pencil className="h-4 w-4" aria-hidden="true" />
    </AdminLinkButton>
  );
}

export default async function AdminNavigationPage({
  searchParams,
}: {
  searchParams?: Promise<{
    locale?: string;
    position?: string;
    seeded?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const selectedLocale = getNavigationLocaleByValue(params?.locale);
  const selectedPosition = getNavigationPositionByValue(params?.position);

  const items = await prisma.navigationItem.findMany({
    where: {
      locale: selectedLocale.dbValue,
      position: selectedPosition.dbValue,
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  });

  const parentItems = items.filter((item) => !item.parentId);
  const childItems = items.filter((item) => item.parentId);
  const publishedItems = items.filter((item) => item.status === "PUBLISHED");
  const draftItems = items.filter((item) => item.status === "DRAFT");
  const recommendedGroups = getDefaultNavigationItems({
    locale: selectedLocale.value,
    position: selectedPosition.value,
  });

  const childrenByParentId = new Map<string, typeof childItems>();

  for (const item of childItems) {
    const list = childrenByParentId.get(item.parentId ?? "") ?? [];
    list.push(item);
    childrenByParentId.set(item.parentId ?? "", list);
  }

  const dangerCount = items.filter((item) => {
    const health = getNavigationLinkHealth({
      href: item.href,
      external: item.external,
      status: String(item.status),
    });

    return health.tone === "danger";
  }).length;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Navigation"
        title="导航系统"
        description="统一管理 GeoSub 前台顶部导航、底部导航、子菜单、链接、语言、状态和排序。底部导航可以一键补齐推荐结构，再按运营需要微调。"
        action={
          <div className="flex flex-wrap gap-3">
            <form action={seedDefaultNavigation}>
              <input type="hidden" name="locale" value={selectedLocale.value} />
              <input type="hidden" name="position" value={selectedPosition.value} />
              <AdminButton type="submit" variant="success">
                补齐推荐结构
              </AdminButton>
            </form>
            <AdminLinkButton
              href={`/admin/navigation/new?locale=${selectedLocale.value}&position=${selectedPosition.value}`}
            >
              新增菜单
            </AdminLinkButton>
          </div>
        }
      />

      {params?.seeded === "1" ? (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          已补齐当前语言和位置的推荐导航结构。已有菜单不会被覆盖。
        </div>
      ) : null}

      <div className="mb-6 space-y-4">
        <div>
          <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">
            语言
          </div>
          <SegmentedControl
            ariaLabel="导航语言"
            value={selectedLocale.value}
            tone="blue"
            items={navigationLocales.map((locale) => ({
              label: locale.label,
              value: locale.value,
              href: `/admin/navigation?locale=${locale.value}&position=${selectedPosition.value}`,
            }))}
          />
        </div>

        <div>
          <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">
            位置
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <SegmentedControl
              ariaLabel="导航位置"
              value={selectedPosition.value}
              tone="blue"
              items={navigationPositions.map((position) => ({
                label: position.label,
                value: position.value,
                href: `/admin/navigation?locale=${selectedLocale.value}&position=${position.value}`,
              }))}
            />

            <div className="rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 ring-1 ring-blue-100">
              当前管理：{selectedLocale.label} · {selectedPosition.label}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">一级菜单</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {parentItems.length}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            当前语言和位置的顶层项目数量。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">子菜单</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {childItems.length}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            Footer 分组通常需要更多子菜单。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">启用 / 停用</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {publishedItems.length} / {draftItems.length}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            当前菜单发布状态概览。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">链接风险</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {dangerCount}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            404 风险或格式异常的菜单数。
          </div>
        </AdminCard>
      </div>

      <AdminCard>
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">
              {selectedLocale.label} · {selectedPosition.label}结构
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              排序只在同一级菜单内生效。系统会检查内部链接是否有对应页面，避免发布后出现死链。
            </p>
          </div>

          <div className="rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 ring-1 ring-blue-100">
            推荐结构：{recommendedGroups.length} 个分组
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-[72px_minmax(130px,1.1fr)_minmax(160px,1.5fr)_92px_92px_90px_90px_90px_90px] gap-0 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-400">
            <div>排序</div>
            <div>名称</div>
            <div>链接</div>
            <div>位置</div>
            <div>语言</div>
            <div>状态</div>
            <div>排序</div>
            <div>启停</div>
            <div>编辑</div>
          </div>

          <div className="divide-y divide-slate-100 bg-white">
            {parentItems.map((item) => {
              const children = childrenByParentId.get(item.id) ?? [];

              return (
                <div key={item.id}>
                  <div className="grid grid-cols-[72px_minmax(130px,1.1fr)_minmax(160px,1.5fr)_92px_92px_90px_90px_90px_90px] items-center gap-0 px-5 py-4 text-sm">
                    <div className="font-black text-slate-400">
                      {item.sortOrder}
                    </div>
                    <div className="font-black text-slate-950">{item.label}</div>
                    <div className="min-w-0">
                      <div className="truncate font-mono text-xs text-slate-500">
                        {item.href}
                      </div>
                      <LinkHealthBadge
                        href={item.href}
                        external={item.external}
                        status={String(item.status)}
                      />
                    </div>
                    <div className="text-slate-500">
                      {getNavigationPositionByDbValue(item.position).label}
                    </div>
                    <div className="text-slate-500">
                      {getNavigationLocaleByDbValue(item.locale).label}
                    </div>
                    <div>
                      <StatusBadge status={String(item.status)} />
                    </div>
                    <div>
                      <SortButtons id={item.id} href={item.href} />
                    </div>
                    <div>
                      <ToggleStatusButton
                        id={item.id}
                        href={item.href}
                        external={item.external}
                        status={String(item.status)}
                      />
                    </div>
                    <div>
                      <EditButton id={item.id} />
                    </div>
                  </div>

                  {children.length > 0 ? (
                    <div className="bg-slate-50/70 px-5 pb-4">
                      <div className="ml-[72px] rounded-xl border border-slate-200 bg-white">
                        {children.map((child) => (
                          <div
                            key={child.id}
                            className="grid grid-cols-[minmax(130px,1.1fr)_minmax(160px,1.5fr)_92px_92px_90px_90px_90px_90px] items-center gap-0 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
                          >
                            <div className="font-bold text-slate-800">
                              └ {child.label}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-mono text-xs text-slate-500">
                                {child.href}
                              </div>
                              <LinkHealthBadge
                                href={child.href}
                                external={child.external}
                                status={String(child.status)}
                              />
                            </div>
                            <div className="text-slate-500">子菜单</div>
                            <div className="text-slate-500">
                              {getNavigationLocaleByDbValue(child.locale).label}
                            </div>
                            <div>
                              <StatusBadge status={String(child.status)} />
                            </div>
                            <div>
                              <SortButtons id={child.id} href={child.href} />
                            </div>
                            <div>
                              <ToggleStatusButton
                                id={child.id}
                                href={child.href}
                                external={child.external}
                                status={String(child.status)}
                              />
                            </div>
                            <div>
                              <EditButton id={child.id} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {parentItems.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="text-sm font-black text-slate-600">
                  当前语言和导航位置暂无数据
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  可以点击右上角“补齐推荐结构”，系统会生成一套可用的 Header / Footer 导航。
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </AdminCard>

      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5 text-sm leading-7 text-blue-900">
        <div className="font-black">导航升级说明</div>
        <p className="mt-1">
          前台 Footer 现在即使数据库为空，也会显示推荐兜底结构；后台补齐后会优先使用数据库菜单。后续可以继续扩展为拖拽排序、批量复制语言和导航版本预览。
        </p>
      </div>

      <div className="mt-6">
        <Link
          href="/admin"
          className="text-sm font-black text-blue-700 hover:text-blue-900"
        >
          ← 返回运营驾驶舱
        </Link>
      </div>
    </div>
  );
}

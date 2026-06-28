import Link from "next/link";
import { AdminCard, AdminPageHeader } from "../../../components/admin/AdminCard";
import { AdminLinkButton } from "../../../components/admin/AdminButton";
import SegmentedControl from "../../../components/ui/SegmentedControl";
import { prisma } from "../../../lib/prisma";
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
import {
  moveNavigationItem,
  toggleNavigationItemStatus,
} from "./actions";

function statusLabel(status: string) {
  if (status === "PUBLISHED") return "已发布";
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
  if (tone === "success") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (tone === "danger") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (tone === "warning") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (tone === "info") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

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
      <button
        type="submit"
        className={[
          "rounded-full px-3 py-1.5 text-xs font-black transition",
          published
            ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
            : "bg-blue-50 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100",
        ].join(" ")}
      >
        {published ? "停用" : "启用"}
      </button>
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
        <button
          type="submit"
          className="rounded-full bg-slate-100 px-2.5 py-1.5 text-xs font-black text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
          aria-label="上移"
        >
          ↑
        </button>
      </form>

      <form action={moveNavigationItem.bind(null, id, "down")}>
        <button
          type="submit"
          className="rounded-full bg-slate-100 px-2.5 py-1.5 text-xs font-black text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
          aria-label="下移"
        >
          ↓
        </button>
      </form>
    </div>
  );
}

function EditButton({ id }: { id: string }) {
  return (
    <Link
      href={`/admin/navigation/${id}/edit`}
      className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
    >
      编辑
    </Link>
  );
}

export default async function AdminNavigationPage({
  searchParams,
}: {
  searchParams?: Promise<{
    locale?: string;
    position?: string;
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

  const childrenByParentId = new Map<string, typeof childItems>();

  for (const item of childItems) {
    const list = childrenByParentId.get(item.parentId ?? "") ?? [];
    list.push(item);
    childrenByParentId.set(item.parentId ?? "", list);
  }

  const publishedItems = items.filter((item) => item.status === "PUBLISHED");
  const draftItems = items.filter((item) => item.status === "DRAFT");

  return (
    <div>
      <AdminPageHeader
        eyebrow="Navigation"
        title="导航菜单管理"
        description="查看和控制 GeoSub 前台顶部导航、底部导航、子菜单、链接、语言、状态和排序。当前版本支持启用 / 停用、上移 / 下移、编辑和新增，不支持删除。"
        action={
          <AdminLinkButton
            href={`/admin/navigation/new?locale=${selectedLocale.value}&position=${selectedPosition.value}`}
          >
            新增菜单
          </AdminLinkButton>
        }
      />

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
          <div className="text-sm font-bold text-slate-500">当前语言</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {selectedLocale.label}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            多语言导航已预留，未建页面的语言会显示 404 风险。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">一级菜单</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {parentItems.length}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            当前语言和位置的一级项目数量。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">子菜单</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {childItems.length}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            当前语言和位置的子菜单数量。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">已启用 / 停用</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {publishedItems.length} / {draftItems.length}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            当前菜单状态概览。
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
              排序只在同一级菜单内生效。语言和导航位置均来自统一配置，避免后台入口与数据库枚举不一致。
            </p>
          </div>

          <div className="rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 ring-1 ring-blue-100">
            支持语言 / 位置 / 启停 / 排序 / 健康检查
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200">
          <div className="grid grid-cols-[72px_minmax(130px,1.1fr)_minmax(160px,1.5fr)_92px_92px_90px_90px_90px_90px] gap-0 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-400">
            <div>排序</div>
            <div>名称</div>
            <div>链接</div>
            <div>位置</div>
            <div>语言</div>
            <div>状态</div>
            <div>排序</div>
            <div>状态</div>
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

                    <div className="font-black text-slate-950">
                      {item.label}
                    </div>

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
                      <div className="ml-[72px] rounded-2xl border border-slate-200 bg-white">
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
              <div className="px-5 py-12 text-center text-sm font-bold text-slate-400">
                当前语言和导航位置暂无数据。可以先新增为停用状态，等对应页面补齐后再启用。
              </div>
            ) : null}
          </div>
        </div>
      </AdminCard>

      <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-5 text-sm leading-7 text-blue-900">
        <div className="font-black">下一步</div>
        <p className="mt-1">
          当前导航语言、位置和路径规则已从统一配置读取。下一步可以批量生成英文 Header / Footer 草稿导航。
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
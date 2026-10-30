import { safeAdminReturnTo } from "@/lib/admin-workflow-context";
import { adminControlClassName } from "@/components/admin/admin-control";
import { AdminActionForm } from "@/components/admin/AdminPermissions";
import { notFound } from "next/navigation";
import { AdminCard, AdminPageHeader } from "../../../../../components/admin/AdminCard";
import { AdminButton, AdminLinkButton } from "../../../../../components/admin/AdminButton";
import { prisma } from "../../../../../lib/prisma";
import {
  getNavigationLocaleByDbValue,
  getNavigationPositionByDbValue,
  isNavigationHomeHref,
} from "../../../../../lib/navigation-config";
import { updateNavigationItem } from "../../actions";

function statusLabel(status: string) {
  if (status === "PUBLISHED") return "已发布";
  if (status === "DRAFT") return "已停用";
  if (status === "ARCHIVED") return "已归档";

  return status;
}

export default async function EditNavigationItemPage({
  params,
  searchParams,
}: {
  searchParams?:Promise<{returnTo?:string}>;
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  const item = await prisma.navigationItem.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      label: true,
      href: true,
      external: true,
      status: true,
      locale: true,
      position: true,
      parentId: true,
      sortOrder: true,
      parent: {
        select: {
          label: true,
        },
      },
    },
  });

  if (!item) {
    notFound();
  }

  const selectedLocale = getNavigationLocaleByDbValue(item.locale);
  const selectedPosition = getNavigationPositionByDbValue(item.position);
  const fallbackBackHref = `/admin/navigation?locale=${selectedLocale.value}&position=${selectedPosition.value}`;
  const query=searchParams ? await searchParams : {};
  const backHref=safeAdminReturnTo(query.returnTo,fallbackBackHref);
  const lockedHome = isNavigationHomeHref(item.href);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Navigation"
        title="编辑导航菜单"
        description={`正在编辑：${selectedLocale.label} · ${selectedPosition.label}`}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <AdminCard>
          <AdminActionForm action={updateNavigationItem.bind(null, item.id)} className="space-y-6">
            <input type="hidden" name="returnTo" value={backHref} />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="localeDisplay"
                  className="mb-2 block text-sm font-semibold text-admin-text-body dark:text-admin-text-body"
                >
                  当前语言
                </label>
                <input
                  id="localeDisplay"
                  type="text"
                  value={selectedLocale.label}
                  readOnly
                  className={`${adminControlClassName} w-full h-11`}
                />
              </div>

              <div>
                <label
                  htmlFor="positionDisplay"
                  className="mb-2 block text-sm font-semibold text-admin-text-body dark:text-admin-text-body"
                >
                  当前位置
                </label>
                <input
                  id="positionDisplay"
                  type="text"
                  value={selectedPosition.label}
                  readOnly
                  className={`${adminControlClassName} w-full h-11`}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="label"
                className="mb-2 block text-sm font-semibold text-admin-text-body dark:text-admin-text-body"
              >
                菜单名称
              </label>
              <input
                id="label"
                name="label"
                type="text"
                defaultValue={item.label}
                required
                className={`${adminControlClassName} w-full h-11`}
              />
            </div>

            <div>
              <label
                htmlFor="href"
                className="mb-2 block text-sm font-semibold text-admin-text-body dark:text-admin-text-body"
              >
                链接
              </label>
              <input
                id="href"
                name="href"
                type="text"
                defaultValue={item.href}
                readOnly={lockedHome}
                required
                className={[
                  [
                    "w-full rounded-xl border border-admin-border px-4 py-3 font-mono text-sm font-semibold",
                    "outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100",
                    "dark:border-admin-border-strong dark:focus:border-blue-800 dark:focus:ring-blue-800"
                  ].join(" "),
                  lockedHome
                    ? "bg-admin-surface-subtle text-admin-text-faint dark:bg-admin-chip"
                    : "bg-admin-surface text-admin-text dark:bg-admin-surface dark:text-admin-text",
                ].join(" ")}
              />
              <p className="mt-2 text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
                首页链接固定。其他内部链接必须使用当前语言路径，例如 /zh/ 或 /en/。
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-admin-card border border-admin-border bg-admin-surface-subtle px-4 py-3 dark:border-admin-border-strong dark:bg-admin-chip">
                <input
                  name="external"
                  type="checkbox"
                  defaultChecked={item.external}
                  disabled={lockedHome}
                  className="h-4 w-4 rounded border-admin-border-strong text-blue-700 dark:border-admin-border-strong dark:text-blue-300"
                />
                <span className="text-sm font-semibold text-admin-text-body dark:text-admin-text-body">
                  外部链接
                </span>
              </label>

              <div className="rounded-admin-card border border-admin-border bg-admin-surface-subtle
                px-4 py-3 text-sm font-semibold text-admin-text-muted dark:border-admin-border-strong
                dark:bg-admin-chip dark:text-admin-text-muted">
                当前状态：{statusLabel(String(item.status))}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-admin-border pt-6 sm:flex-row dark:border-admin-border-strong">
              <AdminButton type="submit">
                保存修改
              </AdminButton>

              <AdminLinkButton href={backHref} variant="secondary">
                取消
              </AdminLinkButton>
            </div>
          </AdminActionForm>
        </AdminCard>

        <AdminCard>
          <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">菜单信息</h2>

          <div className="mt-5 space-y-4 text-sm leading-7 text-admin-text-secondary dark:text-admin-text-secondary">
            <p>
              所属语言：{selectedLocale.label}
            </p>

            <p>
              所属位置：{selectedPosition.label}
            </p>

            <p>
              菜单层级：{item.parentId ? `子菜单，上级为「${item.parent?.label || "未知"}」` : "一级菜单"}
            </p>

            <p>
              当前排序：{item.sortOrder}
            </p>
          </div>

          <div className="mt-6 rounded-xl bg-blue-50 p-4 text-xs leading-6 text-blue-900 dark:bg-blue-950 dark:text-blue-200">
            保存和取消都会返回当前菜单所属的语言与导航位置。
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
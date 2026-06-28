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
}: {
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
  const backHref = `/admin/navigation?locale=${selectedLocale.value}&position=${selectedPosition.value}`;
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
          <form action={updateNavigationItem.bind(null, item.id)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="localeDisplay"
                  className="mb-2 block text-sm font-black text-slate-700"
                >
                  当前语言
                </label>
                <input
                  id="localeDisplay"
                  type="text"
                  value={selectedLocale.label}
                  readOnly
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500 outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="positionDisplay"
                  className="mb-2 block text-sm font-black text-slate-700"
                >
                  当前位置
                </label>
                <input
                  id="positionDisplay"
                  type="text"
                  value={selectedPosition.label}
                  readOnly
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="label"
                className="mb-2 block text-sm font-black text-slate-700"
              >
                菜单名称
              </label>
              <input
                id="label"
                name="label"
                type="text"
                defaultValue={item.label}
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="href"
                className="mb-2 block text-sm font-black text-slate-700"
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
                  "w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm font-bold outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100",
                  lockedHome
                    ? "bg-slate-50 text-slate-400"
                    : "bg-white text-slate-950",
                ].join(" ")}
              />
              <p className="mt-2 text-xs leading-5 text-slate-500">
                首页链接固定。其他内部链接必须使用当前语言路径，例如 /zh/ 或 /en/。
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  name="external"
                  type="checkbox"
                  defaultChecked={item.external}
                  disabled={lockedHome}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700"
                />
                <span className="text-sm font-bold text-slate-700">
                  外部链接
                </span>
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
                当前状态：{statusLabel(String(item.status))}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row">
              <AdminButton type="submit">
                保存修改
              </AdminButton>

              <AdminLinkButton href={backHref} variant="secondary">
                取消
              </AdminLinkButton>
            </div>
          </form>
        </AdminCard>

        <AdminCard>
          <h2 className="text-base font-black text-slate-950">菜单信息</h2>

          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
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

          <div className="mt-6 rounded-2xl bg-blue-50 p-4 text-xs leading-6 text-blue-900">
            保存和取消都会返回当前菜单所属的语言与导航位置。
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
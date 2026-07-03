import { AdminCard, AdminPageHeader } from "../../../../components/admin/AdminCard";
import { AdminButton, AdminLinkButton } from "../../../../components/admin/AdminButton";
import { prisma } from "../../../../lib/prisma";
import {
  getNavigationLocaleByValue,
  getNavigationPositionByValue,
} from "../../../../lib/navigation-config";
import { createNavigationItem } from "../actions";

export default async function NewNavigationItemPage({
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

  const parentItems = await prisma.navigationItem.findMany({
    where: {
      locale: selectedLocale.dbValue,
      position: selectedPosition.dbValue,
      parentId: null,
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
    select: {
      id: true,
      label: true,
      href: true,
    },
  });

  return (
    <div>
      <AdminPageHeader
        eyebrow="Navigation"
        title="新增导航菜单"
        description={`新增${selectedLocale.label}${selectedPosition.label}或子菜单。当前不支持删除和多级嵌套。`}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <AdminCard>
          <form action={createNavigationItem} className="space-y-6">
            <input type="hidden" name="locale" value={selectedLocale.value} />
            <input type="hidden" name="position" value={selectedPosition.value} />

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
                placeholder={selectedLocale.value === "en" ? "For example: AI Pricing" : "例如：AI 定价"}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
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
                placeholder={`${selectedLocale.prefix}ai-pricing/`}
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm font-bold text-slate-950 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              <p className="mt-2 text-xs leading-5 text-slate-500">
                当前语言内部链接必须以 {selectedLocale.prefix} 开头。外部链接必须以 https:// 或 http:// 开头。
              </p>
            </div>

            <div>
              <label
                htmlFor="parentId"
                className="mb-2 block text-sm font-black text-slate-700"
              >
                菜单层级
              </label>

              <select
                id="parentId"
                name="parentId"
                defaultValue=""
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">
                  {selectedPosition.value === "footer" ? "一级分组" : "一级菜单"}
                </option>
                {parentItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    作为「{item.label}」的子菜单
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                顶部导航的一级菜单会显示在 Header；底部导航的一级菜单会作为 Footer 分组标题。
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  name="external"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-700"
                />
                <span className="text-sm font-bold text-slate-700">
                  外部链接
                </span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  name="publishNow"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-slate-300 text-blue-700"
                />
                <span className="text-sm font-bold text-slate-700">
                  创建后立即启用
                </span>
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row">
              <AdminButton type="submit">
                创建菜单
              </AdminButton>

              <AdminLinkButton
                href={`/admin/navigation?locale=${selectedLocale.value}&position=${selectedPosition.value}`}
                variant="secondary"
              >
                取消
              </AdminLinkButton>
            </div>
          </form>
        </AdminCard>

        <AdminCard>
          <h2 className="text-base font-black text-slate-950">新增规则</h2>

          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
            <p>
              当前正在新增：{selectedLocale.label} · {selectedPosition.label}。
            </p>

            <p>
              多语言导航可以提前建立草稿，但在对应语言页面没有创建之前，系统会自动提示 404 风险，并阻止启用。
            </p>

            <p>
              导航语言和位置来自统一配置文件，后续增加语言需要先保证 Prisma enum 与数据库 enum 同步。
            </p>
          </div>

          <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-xs leading-6 text-amber-900">
            删除功能暂不开放。站点主导航属于长期结构，先用停用代替删除更安全。
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

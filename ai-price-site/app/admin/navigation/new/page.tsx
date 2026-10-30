import { safeAdminReturnTo } from "@/lib/admin-workflow-context";
import { adminControlClassName } from "@/components/admin/admin-control";
import { AdminActionForm } from "@/components/admin/AdminPermissions";
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
    returnTo?:string;
    locale?: string;
    position?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const selectedLocale = getNavigationLocaleByValue(params?.locale);
  const selectedPosition = getNavigationPositionByValue(params?.position);
  const returnTo=safeAdminReturnTo(params.returnTo,`/admin/navigation?locale=${selectedLocale.value}&position=${selectedPosition.value}`);

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
          <AdminActionForm action={createNavigationItem} className="space-y-6">
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="locale" value={selectedLocale.value} />
            <input type="hidden" name="position" value={selectedPosition.value} />

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
                placeholder={selectedLocale.value === "en" ? "For example: AI Pricing" : "例如：AI 定价"}
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
                placeholder={`${selectedLocale.prefix}ai-pricing/`}
                required
                className={`${adminControlClassName} w-full h-11`}
              />
              <p className="mt-2 text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
                当前语言内部链接必须以 {selectedLocale.prefix} 开头。外部链接必须以 https:// 或 http:// 开头。
              </p>
            </div>

            <div>
              <label
                htmlFor="parentId"
                className="mb-2 block text-sm font-semibold text-admin-text-body dark:text-admin-text-body"
              >
                菜单层级
              </label>

              <select
                id="parentId"
                name="parentId"
                defaultValue=""
                className={`${adminControlClassName} w-full h-11`}
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

              <p className="mt-2 text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
                顶部导航的一级菜单会显示在 Header；底部导航的一级菜单会作为 Footer 分组标题。
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-admin-card border border-admin-border bg-admin-surface-subtle px-4 py-3 dark:border-admin-border-strong dark:bg-admin-chip">
                <input
                  name="external"
                  type="checkbox"
                  className="h-4 w-4 rounded border-admin-border-strong text-blue-700 dark:border-admin-border-strong dark:text-blue-300"
                />
                <span className="text-sm font-semibold text-admin-text-body dark:text-admin-text-body">
                  外部链接
                </span>
              </label>

              <label className="flex items-center gap-3 rounded-admin-card border border-admin-border bg-admin-surface-subtle px-4 py-3 dark:border-admin-border-strong dark:bg-admin-chip">
                <input
                  name="publishNow"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-admin-border-strong text-blue-700 dark:border-admin-border-strong dark:text-blue-300"
                />
                <span className="text-sm font-semibold text-admin-text-body dark:text-admin-text-body">
                  创建后立即启用
                </span>
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-admin-border pt-6 sm:flex-row dark:border-admin-border-strong">
              <AdminButton type="submit">
                创建菜单
              </AdminButton>

              <AdminLinkButton
                href={returnTo}
                variant="secondary"
              >
                取消
              </AdminLinkButton>
            </div>
          </AdminActionForm>
        </AdminCard>

        <AdminCard>
          <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">新增规则</h2>

          <div className="mt-5 space-y-4 text-sm leading-7 text-admin-text-secondary dark:text-admin-text-secondary">
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

          <div className="mt-6 rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            删除功能暂不开放。站点主导航属于长期结构，先用停用代替删除更安全。
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

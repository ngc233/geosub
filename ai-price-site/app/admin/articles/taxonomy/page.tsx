import AdminPagination from "@/components/admin/AdminPagination";
import { createAdminListView } from "@/lib/admin-list-params";
import AdminSegmentedControl from "@/components/admin/AdminSegmentedControl";
import { adminControlClassName } from "@/components/admin/admin-control";
import { adminButtonClassName } from "@/components/admin/AdminButton";
import { AdminActionForm } from "@/components/admin/AdminPermissions";
import AdminLink from "@/components/admin/AdminLink";
import type { Locale } from "@prisma/client";
import { AdminButton } from "../../../../components/admin/AdminButton";
import { AdminCard, AdminPageHeader } from "../../../../components/admin/AdminCard";
import { prisma } from "../../../../lib/prisma";
import {
  createArticleCategoryAction,
  createArticleTagAction,
  toggleArticleCategoryStatusAction,
  toggleArticleTagStatusAction,
} from "../actions";

const inputClass = `${adminControlClassName} h-11 w-full`;

function StatusBadge({ status }: { status: string }) {
  const published = status === "PUBLISHED";

  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        published
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-admin-chip text-admin-text-muted ring-admin-border dark:bg-admin-chip dark:text-admin-text-muted",
      ].join(" ")}
    >
      {published ? "启用" : "停用"}
    </span>
  );
}

function ToggleButton({
  id,
  action,
}: {
  id: string;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <AdminActionForm action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={adminButtonClassName({ variant: "secondary", size: "sm", className: "" })}
      >
        切换
      </button>
    </AdminActionForm>
  );
}

export default async function ArticleTaxonomyPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; created?: string; locale?: string; page?: string; tagPage?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const locale: Locale = query.locale === "EN" ? "EN" : "ZH";

  const [categories, tags] = await Promise.all([
    prisma.articleCategory.findMany({
      where: {
        locale,
      },
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
      },
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
    }),
    prisma.articleTag.findMany({
      where: {
        locale,
      },
      include: {
        _count: {
          select: {
            articleLinks: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  const categoryList=createAdminListView(categories,{basePath:"/admin/articles/taxonomy",params:query,pageSize:25,id:"article-categories"});
  const tagList=createAdminListView(tags,{basePath:"/admin/articles/taxonomy",params:query,pageParam:"tagPage",pageSize:25,id:"article-tags"});
  return (
    <div>
      <AdminPageHeader
        eyebrow="Articles"
        title="分类与标签"
        description="维护文章内容的基础信息架构。分类负责栏目归属，标签负责主题聚合和后续内链。"
        action={
          <div className="flex flex-wrap items-center gap-3">
            <AdminSegmentedControl ariaLabel="内容语言" value={locale} items={[
              {value:"ZH",label:"中文",href:"/admin/articles/taxonomy?locale=ZH"},
              {value:"EN",label:"English",href:"/admin/articles/taxonomy?locale=EN"}
            ]} />
            <AdminLink href="/admin/articles" className="text-sm font-medium text-admin-accent hover:underline">
              返回文章列表
            </AdminLink>
          </div>
        }
      />

      {query?.error ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          保存失败，请检查名称或 URL 标识是否重复。
        </div>
      ) : null}

      {query?.created ? (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          已创建。
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminCard>
          <div className="mb-5">
            <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">新建分类</h2>
            <p className="mt-1 text-sm text-admin-text-muted dark:text-admin-text-muted">
              适合“价格指南”“支付与账号”“方法论”这类栏目。
            </p>
          </div>

          <AdminActionForm action={createArticleCategoryAction} className="grid gap-4">
            <input type="hidden" name="locale" value={locale} />
            <input className={inputClass} name="name" placeholder="分类名称" required />
            <input className={inputClass} name="slug" placeholder="URL 标识，例如 price-guides" />
            <textarea className={`${inputClass} min-h-20 resize-y`} name="description" placeholder="分类说明" />
            <input className={inputClass} name="seoTitle" placeholder="SEO 标题" />
            <textarea className={`${inputClass} min-h-20 resize-y`} name="seoDescription" placeholder="SEO 描述" />
            <AdminButton type="submit">
              创建分类
            </AdminButton>
          </AdminActionForm>
        </AdminCard>

        <AdminCard>
          <div className="mb-5">
            <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">新建标签</h2>
            <p className="mt-1 text-sm text-admin-text-muted dark:text-admin-text-muted">
              适合“ChatGPT”“App Store”“汇率”“土耳其区”这类主题。
            </p>
          </div>

          <AdminActionForm action={createArticleTagAction} className="grid gap-4">
            <input type="hidden" name="locale" value={locale} />
            <input className={inputClass} name="name" placeholder="标签名称" required />
            <input className={inputClass} name="slug" placeholder="URL 标识，例如 app-store" />
            <textarea className={`${inputClass} min-h-20 resize-y`} name="description" placeholder="标签说明" />
            <AdminButton type="submit">
              创建标签
            </AdminButton>
          </AdminActionForm>
        </AdminCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AdminCard>
          <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">分类列表</h2>
          <AdminPagination {...categoryList.pagination} id="article-categories" ariaLabel="分类列表分页" className="mt-4" />
          <div className="mt-5 overflow-x-auto divide-y divide-admin-border rounded-xl border border-admin-border dark:border-admin-border-strong">
            {categoryList.items.map((category) => (
              <div key={category.id} className="grid min-w-[420px] grid-cols-[minmax(0,1fr)_80px_80px_80px] items-center gap-3 px-4 py-3 text-sm">
                <div>
                  <div className="font-semibold text-admin-text dark:text-admin-text">{category.name}</div>
                  <div className="mt-1 font-mono text-xs text-admin-text-faint">{category.slug}</div>
                </div>
                <div className="text-xs font-semibold text-admin-text-muted dark:text-admin-text-muted">{category._count.articles} 篇</div>
                <StatusBadge status={category.status} />
                <ToggleButton id={category.id} action={toggleArticleCategoryStatusAction} />
              </div>
            ))}
            {categories.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm font-semibold text-admin-text-faint">还没有分类。</div>
            ) : null}
          </div>
        <AdminPagination {...categoryList.pagination} ariaLabel="分类列表底部分页" className="mt-4" />
        </AdminCard>

        <AdminCard>
          <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">标签列表</h2><AdminPagination {...tagList.pagination} id="article-tags" ariaLabel="标签列表分页" className="mt-4" />
          <div className="mt-5 overflow-x-auto divide-y divide-admin-border rounded-xl border border-admin-border dark:border-admin-border-strong">
            {tagList.items.map((tag) => (
              <div key={tag.id} className="grid min-w-[420px] grid-cols-[minmax(0,1fr)_80px_80px_80px] items-center gap-3 px-4 py-3 text-sm">
                <div>
                  <div className="font-semibold text-admin-text dark:text-admin-text">{tag.name}</div>
                  <div className="mt-1 font-mono text-xs text-admin-text-faint">{tag.slug}</div>
                </div>
                <div className="text-xs font-semibold text-admin-text-muted dark:text-admin-text-muted">{tag._count.articleLinks} 篇</div>
                <StatusBadge status={tag.status} />
                <ToggleButton id={tag.id} action={toggleArticleTagStatusAction} />
              </div>
            ))}
            {tags.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm font-semibold text-admin-text-faint">还没有标签。</div>
            ) : null}
          </div>
        <AdminPagination {...tagList.pagination} ariaLabel="标签列表底部分页" className="mt-4" />
        </AdminCard>
      </div>
    </div>
  );
}

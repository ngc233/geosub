import Link from "next/link";
import { AdminCard, AdminPageHeader } from "../../../../components/admin/AdminCard";
import { prisma } from "../../../../lib/prisma";
import {
  createArticleCategoryAction,
  createArticleTagAction,
  toggleArticleCategoryStatusAction,
  toggleArticleTagStatusAction,
} from "../actions";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100";

function StatusBadge({ status }: { status: string }) {
  const published = status === "PUBLISHED";

  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1",
        published
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-slate-100 text-slate-500 ring-slate-200",
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
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
      >
        切换
      </button>
    </form>
  );
}

export default async function ArticleTaxonomyPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; created?: string }>;
}) {
  const query = searchParams ? await searchParams : {};

  const [categories, tags] = await Promise.all([
    prisma.articleCategory.findMany({
      where: {
        locale: "ZH",
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
        locale: "ZH",
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

  return (
    <div>
      <AdminPageHeader
        eyebrow="Articles"
        title="分类与标签"
        description="维护文章内容的基础信息架构。分类负责栏目归属，标签负责主题聚合和后续内链。"
        action={
          <Link href="/admin/articles" className="text-sm font-black text-blue-700 hover:text-blue-900">
            返回文章列表
          </Link>
        }
      />

      {query?.error ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          保存失败，请检查名称或 URL 标识是否重复。
        </div>
      ) : null}

      {query?.created ? (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          已创建。
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminCard>
          <div className="mb-5">
            <h2 className="text-lg font-black text-slate-950">新建分类</h2>
            <p className="mt-1 text-sm text-slate-500">
              适合“价格指南”“支付与账号”“方法论”这类栏目。
            </p>
          </div>

          <form action={createArticleCategoryAction} className="grid gap-4">
            <input type="hidden" name="locale" value="ZH" />
            <input className={inputClass} name="name" placeholder="分类名称" required />
            <input className={inputClass} name="slug" placeholder="URL 标识，例如 price-guides" />
            <textarea className={`${inputClass} min-h-20 resize-y`} name="description" placeholder="分类说明" />
            <input className={inputClass} name="seoTitle" placeholder="SEO 标题" />
            <textarea className={`${inputClass} min-h-20 resize-y`} name="seoDescription" placeholder="SEO 描述" />
            <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-800">
              创建分类
            </button>
          </form>
        </AdminCard>

        <AdminCard>
          <div className="mb-5">
            <h2 className="text-lg font-black text-slate-950">新建标签</h2>
            <p className="mt-1 text-sm text-slate-500">
              适合“ChatGPT”“App Store”“汇率”“土耳其区”这类主题。
            </p>
          </div>

          <form action={createArticleTagAction} className="grid gap-4">
            <input type="hidden" name="locale" value="ZH" />
            <input className={inputClass} name="name" placeholder="标签名称" required />
            <input className={inputClass} name="slug" placeholder="URL 标识，例如 app-store" />
            <textarea className={`${inputClass} min-h-20 resize-y`} name="description" placeholder="标签说明" />
            <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800">
              创建标签
            </button>
          </form>
        </AdminCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AdminCard>
          <h2 className="text-lg font-black text-slate-950">分类列表</h2>
          <div className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {categories.map((category) => (
              <div key={category.id} className="grid grid-cols-[minmax(0,1fr)_80px_80px_80px] items-center gap-3 px-4 py-3 text-sm">
                <div>
                  <div className="font-black text-slate-950">{category.name}</div>
                  <div className="mt-1 font-mono text-xs text-slate-400">{category.slug}</div>
                </div>
                <div className="text-xs font-bold text-slate-500">{category._count.articles} 篇</div>
                <StatusBadge status={category.status} />
                <ToggleButton id={category.id} action={toggleArticleCategoryStatusAction} />
              </div>
            ))}
            {categories.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm font-bold text-slate-400">还没有分类。</div>
            ) : null}
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="text-lg font-black text-slate-950">标签列表</h2>
          <div className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {tags.map((tag) => (
              <div key={tag.id} className="grid grid-cols-[minmax(0,1fr)_80px_80px_80px] items-center gap-3 px-4 py-3 text-sm">
                <div>
                  <div className="font-black text-slate-950">{tag.name}</div>
                  <div className="mt-1 font-mono text-xs text-slate-400">{tag.slug}</div>
                </div>
                <div className="text-xs font-bold text-slate-500">{tag._count.articleLinks} 篇</div>
                <StatusBadge status={tag.status} />
                <ToggleButton id={tag.id} action={toggleArticleTagStatusAction} />
              </div>
            ))}
            {tags.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm font-bold text-slate-400">还没有标签。</div>
            ) : null}
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

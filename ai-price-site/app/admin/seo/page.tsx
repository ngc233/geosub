import Link from "next/link";
import { AdminCard, AdminPageHeader } from "../../../components/admin/AdminCard";
import { prisma } from "../../../lib/prisma";

function scoreSeo(item: {
  title?: string | null;
  description?: string | null;
  canonicalUrl?: string | null;
  noindex?: boolean | null;
}) {
  const issues: string[] = [];

  if (!item.title || item.title.length < 10) issues.push("标题过短或缺失");
  if (!item.description || item.description.length < 50) issues.push("描述过短或缺失");
  if (!item.canonicalUrl) issues.push("未设置 canonical");
  if (item.noindex) issues.push("禁止收录");

  return {
    score: Math.max(0, 100 - issues.length * 25),
    issues,
  };
}

function scoreClassName(score: number) {
  if (score >= 90) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (score >= 60) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-red-50 text-red-700 ring-red-200";
}

export default async function AdminSeoPage() {
  const [articles, products] = await Promise.all([
    prisma.article.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      take: 50,
    }),
    prisma.product.findMany({
      where: {
        status: "PUBLISHED",
      },
      include: {
        seoMetas: {
          where: {
            locale: "ZH",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 50,
    }),
  ]);

  const articleAudits = articles.map((article) => ({
    id: article.id,
    type: "文章",
    title: article.title,
    path: `/zh/guides/${article.slug}`,
    editPath: `/admin/articles/${article.id}/edit`,
    status: article.status,
    ...scoreSeo({
      title: article.seoTitle || article.title,
      description: article.seoDescription || article.excerpt,
      canonicalUrl: article.canonicalUrl,
      noindex: article.noindex,
    }),
  }));

  const productAudits = products.map((product) => {
    const meta = product.seoMetas[0];

    return {
      id: product.id,
      type: "价格页",
      title: product.name,
      path: `/zh/ai-pricing/${product.slug}`,
      editPath: `/admin/products/${product.id}/edit`,
      status: product.status,
      ...scoreSeo({
        title: meta?.title || product.name,
        description: meta?.description || product.description,
        canonicalUrl: meta?.canonicalUrl,
        noindex: false,
      }),
    };
  });

  const audits = [...articleAudits, ...productAudits].sort((a, b) => a.score - b.score);
  const excellent = audits.filter((item) => item.score >= 90).length;
  const needsWork = audits.filter((item) => item.score < 90).length;
  const blocked = audits.filter((item) => item.issues.includes("禁止收录")).length;

  return (
    <div>
      <AdminPageHeader
        eyebrow="SEO"
        title="SEO 体检"
        description="先把文章页和已发布价格页的基础收录问题集中看清楚：标题、描述、canonical、noindex。"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">检测页面</div>
          <div className="mt-2 text-3xl font-black text-slate-950">{audits.length}</div>
          <div className="mt-2 text-sm text-slate-500">文章页与已发布价格页。</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">良好</div>
          <div className="mt-2 text-3xl font-black text-emerald-700">{excellent}</div>
          <div className="mt-2 text-sm text-slate-500">基础 SEO 信息完整。</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">待优化</div>
          <div className="mt-2 text-3xl font-black text-amber-700">{needsWork}</div>
          <div className="mt-2 text-sm text-slate-500">缺标题、描述或 canonical。</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">禁止收录</div>
          <div className="mt-2 text-3xl font-black text-slate-950">{blocked}</div>
          <div className="mt-2 text-sm text-slate-500">需要确认是否有意设置。</div>
        </AdminCard>
      </div>

      <AdminCard>
        <div className="mb-5">
          <h2 className="text-lg font-black text-slate-950">页面问题队列</h2>
          <p className="mt-1 text-sm text-slate-500">
            分数低的页面排在前面。先补文章 SEO，再补核心价格页，是目前最划算的顺序。
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[90px_minmax(240px,1fr)_110px_250px_150px] bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-400">
              <div>分数</div>
              <div>页面</div>
              <div>类型</div>
              <div>问题</div>
              <div>操作</div>
            </div>

            <div className="divide-y divide-slate-100 bg-white">
              {audits.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="grid grid-cols-[90px_minmax(240px,1fr)_110px_250px_150px] items-center px-5 py-4 text-sm"
                >
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${scoreClassName(item.score)}`}>
                      {item.score}
                    </span>
                  </div>
                  <div>
                    <div className="font-black text-slate-950">{item.title}</div>
                    <div className="mt-1 font-mono text-xs text-slate-400">{item.path}</div>
                  </div>
                  <div className="font-bold text-slate-600">{item.type}</div>
                  <div className="text-xs leading-5 text-slate-500">
                    {item.issues.length > 0 ? item.issues.join("、") : "基础项完整"}
                  </div>
                  <div className="flex gap-3">
                    <Link href={item.editPath} className="text-xs font-black text-blue-700 hover:text-blue-900">
                      编辑
                    </Link>
                    <Link href={item.path} target="_blank" className="text-xs font-black text-slate-600 hover:text-slate-950">
                      查看
                    </Link>
                  </div>
                </div>
              ))}

              {audits.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm font-bold text-slate-500">
                  还没有可检测的文章或已发布价格页。
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}

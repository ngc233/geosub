import { safeAdminReturnTo } from "@/lib/admin-workflow-context";
import { adminControlClassName } from "@/components/admin/admin-control";
import { adminRecordVersion } from "../../../lib/admin-save";
import { AdminActionForm } from "@/components/admin/AdminPermissions";
import type { Article, ArticleCategory, ArticleTag, Locale, Product } from "@prisma/client";
import { Save } from "lucide-react";
import { AdminButton, AdminLinkButton } from "../../../components/admin/AdminButton";
import { articleTypeLabels } from "../../../lib/articles";
import { createArticleAction, updateArticleAction } from "./actions";

const articleTypes = Object.entries(articleTypeLabels);

const statusOptions = [
  ["DRAFT", "草稿"],
  ["REVIEW", "待审核"],
  ["PUBLISHED", "发布"],
  ["SCHEDULED", "定时"],
  ["ARCHIVED", "归档"],
];

const structuredDataOptions = [
  ["ARTICLE", "Article"],
  ["BLOG_POSTING", "BlogPosting"],
  ["HOW_TO", "HowTo"],
  ["FAQ_PAGE", "FAQPage"],
  ["NEWS_ARTICLE", "NewsArticle"],
  ["TECH_ARTICLE", "TechArticle"],
  ["NONE", "不输出"],
];

function dateTimeLocal(value: Date | null | undefined) {
  if (!value) return "";

  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function Field({
  label,
  children,
  helper,
}: {
  label: string;
  children: React.ReactNode;
  helper?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-admin-text-body dark:text-admin-text-body">{label}</span>
      <div className="mt-2">{children}</div>
      {helper ? <p className="mt-2 text-xs leading-5 text-admin-text-faint">{helper}</p> : null}
    </label>
  );
}

const inputClass = `${adminControlClassName} h-11 w-full`;

export default function ArticleForm({
  article,
  returnTo = "/admin/articles",
  categories,
  tags,
  products,
  relatedArticles,
  selectedTagIds = [],
  selectedProductIds = [],
  selectedRelatedArticleIds = [],
  recommendedProductIds = [],
  recommendedRelatedArticleIds = [],
  defaultLocale = "ZH",
  defaultTitle = "",
  defaultExcerpt = "",
  searchOpportunityQuery = "",
}: {
  article?: Article | null;
  returnTo?:string;
  categories: ArticleCategory[];
  tags: ArticleTag[];
  products: Product[];
  relatedArticles: Article[];
  selectedTagIds?: string[];
  selectedProductIds?: string[];
  selectedRelatedArticleIds?: string[];
  recommendedProductIds?: string[];
  recommendedRelatedArticleIds?: string[];
  defaultLocale?: Locale;
  defaultTitle?: string;
  defaultExcerpt?: string;
  searchOpportunityQuery?: string;
}) {
  const action = article ? updateArticleAction : createArticleAction;

  return (
    <AdminActionForm action={action} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <input type="hidden" name="returnTo" value={safeAdminReturnTo(returnTo,"/admin/articles")} />
      {article ? <><input type="hidden" name="id" value={article.id} /><input type="hidden" name="recordVersion" value={adminRecordVersion(article)} /></> : null}
      {!article && searchOpportunityQuery ? (
        <input
          type="hidden"
          name="searchOpportunityQuery"
          value={searchOpportunityQuery}
        />
      ) : null}

      <section className="rounded-admin-card border border-admin-border bg-admin-surface p-6 shadow-sm dark:border-admin-border-strong dark:bg-admin-surface">
        <div className="grid gap-5">
          <Field label="文章标题">
            <input
              className={inputClass}
              name="title"
              defaultValue={article?.title || defaultTitle}
              placeholder="例如：为什么 AI 订阅在不同国家价格不一样"
              required
            />
          </Field>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="URL 标识">
              <input
                className={inputClass}
                name="slug"
                defaultValue={article?.slug || ""}
                placeholder="why-ai-pricing-differs"
                required
              />
            </Field>

            <Field label="语言">
              <select className={inputClass} name="locale" defaultValue={article?.locale || defaultLocale}>
                <option value="ZH">中文</option>
                <option value="EN">English</option>
              </select>
            </Field>
          </div>

          <Field label="副标题">
            <input
              className={inputClass}
              name="subtitle"
              defaultValue={article?.subtitle || ""}
              placeholder="可选，用于文章页标题下方"
            />
          </Field>

          <Field label="摘要" helper="建议 80-150 字。列表页、分享卡片和 SEO 描述都可以复用。">
            <textarea
              className={`${inputClass} min-h-24 resize-y leading-6`}
              name="excerpt"
              defaultValue={article?.excerpt || defaultExcerpt}
            />
          </Field>

          <Field label="正文 Markdown">
            <textarea
              className={`${inputClass} min-h-[460px] resize-y font-mono leading-6`}
              name="bodyMarkdown"
              defaultValue={article?.bodyMarkdown || ""}
              placeholder={"## 小标题\n\n正文段落...\n\n- 要点一\n- 要点二"}
            />
          </Field>
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-admin-card border border-admin-border bg-admin-surface p-5 shadow-sm dark:border-admin-border-strong dark:bg-admin-surface">
          <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">发布</h2>

          <div className="mt-5 grid gap-4">
            <Field label="状态">
              <select className={inputClass} name="status" defaultValue={article?.status || "DRAFT"}>
                {statusOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="发布时间">
              <input
                className={inputClass}
                type="datetime-local"
                name="publishedAt"
                defaultValue={dateTimeLocal(article?.publishedAt)}
              />
            </Field>

            <Field label="定时发布时间">
              <input
                className={inputClass}
                type="datetime-local"
                name="scheduledAt"
                defaultValue={dateTimeLocal(article?.scheduledAt)}
              />
            </Field>

            <div className="grid gap-3">
              <label className="flex items-center gap-3 rounded-xl border border-admin-border px-3 py-2
                text-sm font-semibold text-admin-text-body
                dark:border-admin-border-strong dark:text-admin-text-body">
                <input type="checkbox" name="isFeatured" defaultChecked={article?.isFeatured || false} />
                推荐文章
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-admin-border px-3 py-2
                text-sm font-semibold text-admin-text-body
                dark:border-admin-border-strong dark:text-admin-text-body">
                <input type="checkbox" name="tocEnabled" defaultChecked={article?.tocEnabled ?? true} />
                启用目录
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-admin-border px-3 py-2
                text-sm font-semibold text-admin-text-body
                dark:border-admin-border-strong dark:text-admin-text-body">
                <input type="checkbox" name="noindex" defaultChecked={article?.noindex || false} />
                禁止搜索引擎收录
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-admin-border px-3 py-2
                text-sm font-semibold text-admin-text-body
                dark:border-admin-border-strong dark:text-admin-text-body">
                <input type="checkbox" name="nofollow" defaultChecked={article?.nofollow || false} />
                页面链接不传递权重
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-admin-card border border-admin-border bg-admin-surface p-5 shadow-sm dark:border-admin-border-strong dark:bg-admin-surface">
          <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">分类与展示</h2>

          <div className="mt-5 grid gap-4">
            <Field label="文章类型">
              <select className={inputClass} name="articleType" defaultValue={article?.articleType || "GUIDE"}>
                {articleTypes.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="分类">
              <select className={inputClass} name="categoryId" defaultValue={article?.categoryId || ""}>
                <option value="">不选择分类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="标签">
              {tags.length > 0 ? (
                <div className="grid gap-2">
                  {tags.map((tag) => (
                    <label
                      key={tag.id}
                      className="flex items-center gap-3 rounded-xl border border-admin-border px-3 py-2
                        text-sm font-semibold text-admin-text-body
                        dark:border-admin-border-strong dark:text-admin-text-body"
                    >
                      <input
                        type="checkbox"
                        name="tagIds"
                        value={tag.id}
                        defaultChecked={selectedTagIds.includes(tag.id)}
                      />
                      {tag.name}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="rounded-admin-card bg-admin-surface-subtle px-3 py-2 text-sm text-admin-text-muted dark:bg-admin-chip dark:text-admin-text-muted">
                  还没有标签，可先去分类与标签页创建。
                </p>
              )}
            </Field>

            <Field label="作者">
              <input className={inputClass} name="authorName" defaultValue={article?.authorName || "GeoSub 编辑部"} />
            </Field>

            <Field label="封面图 URL">
              <input className={inputClass} name="coverImageUrl" defaultValue={article?.coverImageUrl || ""} />
            </Field>
          </div>
        </section>

        <section className="rounded-admin-card border border-admin-border bg-admin-surface p-5 shadow-sm dark:border-admin-border-strong dark:bg-admin-surface">
          <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">SEO</h2>

          <div className="mt-5 grid gap-4">
            <Field label="SEO 标题">
              <input className={inputClass} name="seoTitle" defaultValue={article?.seoTitle || ""} />
            </Field>

            <Field label="SEO 描述">
              <textarea className={`${inputClass} min-h-20 resize-y leading-6`} name="seoDescription" defaultValue={article?.seoDescription || ""} />
            </Field>

            <Field label="关键词">
              <input className={inputClass} name="seoKeywords" defaultValue={article?.seoKeywords || ""} />
            </Field>

            <Field label="Canonical">
              <input className={inputClass} name="canonicalUrl" defaultValue={article?.canonicalUrl || ""} />
            </Field>

            <Field label="结构化数据">
              <select className={inputClass} name="structuredDataType" defaultValue={article?.structuredDataType || "ARTICLE"}>
                {structuredDataOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="OG 标题">
              <input className={inputClass} name="ogTitle" defaultValue={article?.ogTitle || ""} />
            </Field>

            <Field label="OG 描述">
              <textarea className={`${inputClass} min-h-20 resize-y leading-6`} name="ogDescription" defaultValue={article?.ogDescription || ""} />
            </Field>

            <Field label="OG 图片 URL">
              <input className={inputClass} name="ogImageUrl" defaultValue={article?.ogImageUrl || ""} />
            </Field>
          </div>
        </section>

        <section className="rounded-admin-card border border-admin-border bg-admin-surface p-5 shadow-sm dark:border-admin-border-strong dark:bg-admin-surface">
          <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">内链推荐</h2>
          <p className="mt-2 text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
            勾选后会在文章底部生成相关阅读，也方便后续自动内链和权重流向分析。
          </p>

          <div className="mt-5 grid gap-5">
            <Field label="关联价格页">
              {products.length > 0 ? (
                <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-admin-border p-2 dark:border-admin-border-strong">
                  {products.map((product) => (
                    <label
                      key={product.id}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-semibold
                        text-admin-text-body hover:bg-admin-surface-subtle
                        dark:text-admin-text-body dark:hover:bg-admin-chip"
                    >
                      <input
                        type="checkbox"
                        name="relatedProductIds"
                        value={product.id}
                        defaultChecked={selectedProductIds.includes(product.id)}
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="block truncate">{product.name}</span>
                          {recommendedProductIds.includes(product.id) ? (
                            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px]
                              font-semibold text-blue-700 ring-1 ring-blue-100
                              dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-800">
                              推荐
                            </span>
                          ) : null}
                        </span>
                        <span className="block font-mono text-[11px] font-medium text-admin-text-faint">
                          /zh/ai-pricing/{product.slug}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="rounded-admin-card bg-admin-surface-subtle px-3 py-2 text-sm text-admin-text-muted dark:bg-admin-chip dark:text-admin-text-muted">
                  还没有已发布产品可关联。
                </p>
              )}
            </Field>

            <Field label="相关文章">
              {relatedArticles.length > 0 ? (
                <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-admin-border p-2 dark:border-admin-border-strong">
                  {relatedArticles.map((related) => (
                    <label
                      key={related.id}
                      className="flex items-start gap-3 rounded-lg px-2 py-2 text-sm font-semibold
                        text-admin-text-body hover:bg-admin-surface-subtle
                        dark:text-admin-text-body dark:hover:bg-admin-chip"
                    >
                      <input
                        className="mt-1"
                        type="checkbox"
                        name="relatedArticleIds"
                        value={related.id}
                        defaultChecked={selectedRelatedArticleIds.includes(related.id)}
                      />
                      <span className="min-w-0">
                        <span className="flex items-start gap-2">
                          <span className="block line-clamp-2">{related.title}</span>
                          {recommendedRelatedArticleIds.includes(related.id) ? (
                            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px]
                              font-semibold text-blue-700 ring-1 ring-blue-100
                              dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-800">
                              推荐
                            </span>
                          ) : null}
                        </span>
                        <span className="block font-mono text-[11px] font-medium text-admin-text-faint">
                          /zh/guides/{related.slug}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="rounded-admin-card bg-admin-surface-subtle px-3 py-2 text-sm text-admin-text-muted dark:bg-admin-chip dark:text-admin-text-muted">
                  暂时没有其他已发布文章可关联。
                </p>
              )}
            </Field>
          </div>
        </section>

        <div className="sticky bottom-4 flex gap-3 rounded-admin-card border border-admin-border
          bg-admin-surface/95 p-3 shadow-lg shadow-admin-shadow/80 backdrop-blur
          dark:border-admin-border-strong dark:bg-admin-surface/95">
          <AdminLinkButton
            href={safeAdminReturnTo(returnTo,"/admin/articles")}
            variant="secondary"
            className="flex-1"
          >
            返回
          </AdminLinkButton>
          <AdminButton type="submit" className="flex-1">
            <Save size={16} />
            保存
          </AdminButton>
          <AdminButton type="submit" variant="secondary" name="saveIntent" value="return">保存并返回</AdminButton>
        </div>
      </aside>
    </AdminActionForm>
  );
}

import { safeAdminReturnTo, withAdminReturnTo } from "@/lib/admin-workflow-context";
import { adminRecordVersion } from "@/lib/admin-save";
import { requireAdmin } from "@/lib/admin-auth";
import { getPricingDetailPath } from "@/lib/pricing-routes";
import { AdminActionForm } from "@/components/admin/AdminPermissions";
import AdminAlert from "@/components/admin/AdminAlert";
import { AdminBadge, statusBadgeVariant } from "@/components/admin/AdminBadge";
import { AdminButton, AdminLinkButton } from "@/components/admin/AdminButton";
import { AdminCheckbox } from "@/components/admin/AdminCheckbox";
import { AdminInput, AdminTextarea } from "@/components/admin/AdminInput";
import AdminLink from "@/components/admin/AdminLink";
import AdminProductLogo from "@/components/admin/AdminProductLogo";
import AdminSelect from "@/components/admin/AdminSelect";
import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTd,
  AdminTh,
  AdminTr,
} from "@/components/admin/AdminTable";
import AdminTabs from "@/components/admin/AdminTabs";
import BrandIcon from "@/components/BrandIcon";
import { adminListActionClassName } from "@/components/admin/admin-control";
import { ArrowLeft, ArrowUpRight, Plus } from "lucide-react";
import { notFound } from "next/navigation";
import {
  saveProductAppStoreSourceAction,
  saveProductSeoAction,
  syncProductOfficialLogoAction,
  updateProductAction,
} from "../../actions";
import {
  loadProductWorkspaceView,
  parseProductWorkspaceTab,
  type ProductWorkspaceTab,
} from "./product-workspace-adapter";

const productCategoryOptions = [
  { value: "AI", label: "AI 订阅", description: "ChatGPT、Claude、Gemini 等 AI 数字服务" },
  { value: "STREAMING", label: "流媒体", description: "Netflix、Disney+、Spotify 等内容订阅" },
  { value: "SOFTWARE", label: "软件订阅", description: "生产力、设计、开发工具" },
  { value: "GAME", label: "游戏", description: "Steam、主机游戏、游戏服务" },
  { value: "GIFT_CARD", label: "礼品卡", description: "区域礼品卡与充值卡" },
  { value: "VPN", label: "VPN", description: "网络工具与连接服务" },
  { value: "PAYMENT", label: "支付工具", description: "虚拟卡、支付服务、账号工具" },
  { value: "OTHER", label: "其他", description: "暂未归类的数字服务" },
];

const publishStatusOptions = [
  { value: "DRAFT", label: "草稿", description: "仅后台保存，前台不展示" },
  { value: "REVIEW", label: "审核中", description: "等待检查价格、SEO 或合规内容" },
  { value: "PUBLISHED", label: "已发布", description: "允许前台读取和展示" },
  { value: "ARCHIVED", label: "已归档", description: "保留数据，但不再作为活跃内容" },
];

const statusLabels: Record<string, string> = {
  DRAFT: "草稿",
  REVIEW: "审核中",
  PUBLISHED: "已发布",
  ARCHIVED: "已归档",
};

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildTabHref(productId: string, tab: ProductWorkspaceTab, returnTo: string) {
  const params = new URLSearchParams();
  if (tab !== "overview") params.set("tab", tab);
  if (returnTo && returnTo !== "/admin/products") params.set("returnTo", returnTo);
  const query = params.toString();
  return query ? `/admin/products/${productId}/edit?${query}` : `/admin/products/${productId}/edit`;
}

type EditProductSearchParams = {
  tab?: string;
  returnTo?: string;
  error?: string;
  created?: string;
  appStoreAuto?: string;
  sourceSaved?: string;
  sourceError?: string;
  seoSaved?: string;
  logoSynced?: string;
  logoError?: string;
  source?: string;
  reason?: string;
  evidence?: string;
};

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<EditProductSearchParams>;
}) {
  const [admin, { id }, query] = await Promise.all([
    requireAdmin(),
    params,
    searchParams ?? Promise.resolve<EditProductSearchParams>({}),
  ]);

  const inferredTab =
    query.tab ??
    (query.sourceSaved || query.sourceError
      ? "sources"
      : query.seoSaved
        ? "seo"
        : "overview");
  const tab = parseProductWorkspaceTab(inferredTab);
  const returnTo = safeAdminReturnTo(query.returnTo, "/admin/products");
  const workspace = await loadProductWorkspaceView(id, tab);

  if (!workspace) {
    notFound();
  }

  const { product, counts, appStoreSource, latestAppStoreJob, seoMeta } = workspace;
  const currentTabHref = buildTabHref(product.id, tab, returnTo);
  const publicPath = getPricingDetailPath("zh", product.category, product.slug);

  const tabItems = [
    { id: "overview", label: "概览与资料", href: buildTabHref(product.id, "overview", returnTo) },
    {
      id: "plans",
      label: "套餐",
      href: buildTabHref(product.id, "plans", returnTo),
      badge: counts.plans,
    },
    {
      id: "sources",
      label: "采集来源",
      href: buildTabHref(product.id, "sources", returnTo),
      badge: counts.jobs,
    },
    {
      id: "prices",
      label: "正式价格",
      href: buildTabHref(product.id, "prices", returnTo),
      badge: counts.prices,
    },
    { id: "seo", label: "SEO 配置", href: buildTabHref(product.id, "seo", returnTo) },
  ];

  const hasAlerts = Boolean(
    query.source === "authority-coverage" ||
      query.error === "slug" ||
      query.created === "1" ||
      query.appStoreAuto ||
      query.sourceSaved === "1" ||
      query.sourceError === "app-store" ||
      query.seoSaved === "1" ||
      query.logoSynced ||
      query.logoError,
  );

  return (
    <fieldset
      disabled={admin.role !== "OWNER"}
      className="-mx-4 -my-5 min-w-0 sm:-mx-6 lg:-mx-8 lg:-my-6"
    >
      {/* Compact Edge-to-Edge Product Header */}
      <div className="flex flex-col gap-4 border-b border-admin-border bg-admin-surface px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <AdminProductLogo slug={product.slug} name={product.name} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-admin-text-muted">
              <AdminLink
                href={returnTo}
                className="inline-flex items-center gap-1 hover:text-admin-text"
              >
                <ArrowLeft size={12} aria-hidden="true" />
                产品目录
              </AdminLink>
              <span className="text-admin-border-strong">/</span>
              <span className="font-mono text-admin-text-faint">{product.slug}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-admin-text sm:text-xl">
                {product.name}
              </h1>
              <AdminBadge variant={statusBadgeVariant(product.status)}>
                {statusLabels[product.status] || product.status}
              </AdminBadge>
              {counts.pendingObservations > 0 ? (
                <AdminBadge variant="review">待审核 {counts.pendingObservations}</AdminBadge>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AdminLinkButton
            href={`/admin/review?product=${encodeURIComponent(product.slug)}`}
            variant="secondary"
            size="sm"
          >
            异常审核
          </AdminLinkButton>
          <AdminLinkButton
            href={`/admin/data-quality/${encodeURIComponent(product.slug)}`}
            variant="secondary"
            size="sm"
          >
            质量诊断
          </AdminLinkButton>
          <a
            href={publicPath}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1 rounded-admin-control border border-admin-border-strong bg-admin-surface px-3 text-xs font-medium text-admin-text-secondary transition hover:bg-admin-surface-subtle hover:text-admin-text"
          >
            公开页
            <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        </div>
      </div>

      {/* Flush Underline Tabs */}
      <AdminTabs
        flush
        ariaLabel="单产品工作区页签"
        items={tabItems}
        activeId={tab}
        rightSlot={
          product.slug === "chatgpt" ? (
            <AdminLink
              href="/admin/content"
              className="text-xs font-medium text-admin-text-secondary hover:text-admin-text hover:underline"
            >
              英文内容发布试点 →
            </AdminLink>
          ) : null
        }
      />

      {hasAlerts ? (
        <div className="space-y-3 border-b border-admin-border px-4 py-4 sm:px-6">
          {query.source === "authority-coverage" ? (
            <AdminAlert
              variant="info"
              title={`权威覆盖任务：${query.reason?.slice(0, 120) || "完善产品资料"}`}
            >
              <p>
                {query.evidence?.slice(0, 240) || "请根据产品质量检查结果完善当前页面。"}
                （仅辅助定位缺口，不会自动改写公开内容。）
              </p>
            </AdminAlert>
          ) : null}
          {query.error === "slug" ? (
            <AdminAlert variant="danger" title="Slug 冲突">
              这个 slug 已被其他数字服务使用，请换一个。
            </AdminAlert>
          ) : null}
          {query.created === "1" ? (
            <AdminAlert variant="success" title="产品已创建">
              系统会优先尝试按产品名自动匹配 App Store，并准备价格采集入口。
            </AdminAlert>
          ) : null}
          {query.appStoreAuto === "found" ? (
            <AdminAlert variant="info" title="已自动匹配 App Store 应用">
              请切换到“采集来源”或进入异常审核页执行采集。
            </AdminAlert>
          ) : null}
          {query.appStoreAuto === "not-found" ? (
            <AdminAlert variant="warning" title="暂未自动匹配到 App Store 应用">
              请前往“采集来源”页签手动补充 App Store URL 或 App ID。
            </AdminAlert>
          ) : null}
          {query.sourceSaved === "1" ? (
            <AdminAlert variant="success" title="采集来源已保存">
              App Store 来源已更新，并已同步采集任务配置。
            </AdminAlert>
          ) : null}
          {query.sourceError === "app-store" ? (
            <AdminAlert variant="danger" title="来源格式无效">
              请填写有效的 App Store URL，或可识别的 App Store App ID。
            </AdminAlert>
          ) : null}
          {query.seoSaved === "1" ? (
            <AdminAlert variant="success" title="SEO 信息已保存">
              当前产品的中文 SEO 元数据已更新。
            </AdminAlert>
          ) : null}
          {query.logoSynced ? (
            <AdminAlert variant="success" title="候选图标已缓存">
              候选图标已缓存为内部核验资料，取得许可并登记后才会在公开站展示。
            </AdminAlert>
          ) : null}
          {query.logoError === "official-not-found" || query.logoError === "not-found" ? (
            <AdminAlert variant="warning" title="未找到候选图标">
              前台将继续使用合规的 Simple Icons 或中性首字母。
            </AdminAlert>
          ) : null}
          {query.logoError === "download-failed" ? (
            <AdminAlert variant="warning" title="候选图标下载失败">
              当前继续使用内置品牌图标，请稍后重试同步。
            </AdminAlert>
          ) : null}
        </div>
      ) : null}

      {/* TAB 1: Overview — Vercel/Stripe Two-Column Settings Layout */}
      {tab === "overview" ? (
        <div className="divide-y divide-admin-border px-4 sm:px-6">
          <AdminActionForm action={updateProductAction} className="divide-y divide-admin-border">
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="id" value={product.id} />
            <input type="hidden" name="recordVersion" value={adminRecordVersion(product)} />

            <section className="grid gap-6 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div>
                <h2 className="text-sm font-semibold text-admin-text">基础身份</h2>
                <p className="mt-1 text-xs leading-5 text-admin-text-muted">
                  维护服务名称、URL 标识、所属分类与前台发布状态。
                </p>
              </div>
              <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
                <AdminInput name="name" label="数字服务名称 *" required defaultValue={product.name} />
                <AdminInput
                  name="slug"
                  label="Slug *"
                  required
                  defaultValue={product.slug}
                  helperText="修改 slug 会影响前台路径。"
                />
                <AdminSelect
                  name="category"
                  label="分类"
                  value={product.category}
                  options={productCategoryOptions}
                />
                <AdminSelect
                  name="status"
                  label="发布状态"
                  value={product.status}
                  options={publishStatusOptions}
                />
              </div>
            </section>

            <section className="grid gap-6 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div>
                <h2 className="text-sm font-semibold text-admin-text">展示与官方资料</h2>
                <p className="mt-1 text-xs leading-5 text-admin-text-muted">
                  用于后台识别、前台卡片摘要、排序及推荐权重。
                </p>
              </div>
              <div className="max-w-2xl space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminInput name="provider" label="服务商" defaultValue={product.provider || ""} />
                  <AdminInput
                    name="sortOrder"
                    label="排序"
                    type="text"
                    inputMode="numeric"
                    defaultValue={String(product.sortOrder)}
                    className="admin-number-input"
                    helperText="数字越小越靠前。"
                  />
                  <AdminInput
                    name="logoUrl"
                    label="候选 Logo URL"
                    defaultValue={product.logoUrl || ""}
                    helperText="仅作为内部来源记录；远程 URL 和 App Store artwork 不会直接显示在前台。"
                  />
                  <AdminInput
                    name="officialUrl"
                    label="官方网站"
                    defaultValue={product.officialUrl || ""}
                  />
                </div>
                <AdminTextarea
                  name="description"
                  label="数字服务描述"
                  rows={4}
                  defaultValue={product.description || ""}
                />
                <AdminCheckbox
                  name="featured"
                  label="设为推荐数字服务"
                  description="推荐服务会在首页、分类导航和榜单模块优先展示。"
                  defaultChecked={product.featured}
                />
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-3 py-5">
              <AdminButton type="submit" variant="primary" size="sm">
                保存并返回
              </AdminButton>
              <AdminLinkButton href={returnTo} variant="secondary" size="sm">
                取消
              </AdminLinkButton>
            </div>
          </AdminActionForm>

          <section className="grid gap-6 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div>
              <h2 className="text-sm font-semibold text-admin-text">品牌图标与权利核验</h2>
              <p className="mt-1 text-xs leading-5 text-admin-text-muted">
                可缓存官网或 App Store 候选图用于内部核验，但只有已登记许可的本地资产才能公开展示。
              </p>
            </div>
            <div className="flex max-w-2xl flex-col gap-4 rounded-admin-card border border-admin-border bg-admin-surface-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <BrandIcon product={product} size="md" />
                <div>
                  <p className="text-[13px] font-medium text-admin-text">
                    前台回退链：本地已登记资产 → Simple Icons → 中性首字母
                  </p>
                  <p className="mt-0.5 text-xs text-admin-text-muted">
                    缓存候选图仅用于内部核验，不会自动公开。
                  </p>
                </div>
              </div>
              <AdminActionForm action={syncProductOfficialLogoAction} className="shrink-0">
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="recordVersion" value={adminRecordVersion(product)} />
                <input
                  type="hidden"
                  name="appStoreId"
                  value={latestAppStoreJob?.app_store_id || ""}
                />
                <AdminButton type="submit" variant="secondary" size="sm">
                  缓存候选图标（不发布）
                </AdminButton>
              </AdminActionForm>
            </div>
          </section>
        </div>
      ) : null}

      {/* TAB 2: Plans — Flush High-Density Table */}
      {tab === "plans" ? (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border px-4 py-3 sm:px-6">
            <p className="text-xs text-admin-text-muted">
              共 <strong className="font-semibold text-admin-text">{workspace.plans.length}</strong> 个套餐
            </p>
            <div className="flex items-center gap-2">
              <AdminLinkButton
                href={`/admin/plans?product=${encodeURIComponent(product.slug)}`}
                variant="secondary"
                size="sm"
              >
                跨产品视图
              </AdminLinkButton>
              <AdminLinkButton
                href={withAdminReturnTo(`/admin/plans/new?productId=${product.id}`, currentTabHref)}
                size="sm"
              >
                <Plus size={14} aria-hidden="true" />
                新增套餐
              </AdminLinkButton>
            </div>
          </div>
          <div className="overflow-x-auto">
            <AdminTable>
              <AdminTableHead>
                <tr>
                  <AdminTh>套餐名称</AdminTh>
                  <AdminTh>计费周期</AdminTh>
                  <AdminTh>状态</AdminTh>
                  <AdminTh align="right">区域价格数</AdminTh>
                  <AdminTh align="right">排序</AdminTh>
                  <AdminTh align="right">操作</AdminTh>
                </tr>
              </AdminTableHead>
              <AdminTableBody>
                {workspace.plans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-admin-text-muted">
                      该产品暂未配置套餐。
                    </td>
                  </tr>
                ) : (
                  workspace.plans.map((plan) => (
                    <AdminTr key={plan.id}>
                      <AdminTd>
                        <div className="font-medium text-admin-text">{plan.name}</div>
                        <div className="font-mono text-xs text-admin-text-faint">{plan.slug}</div>
                      </AdminTd>
                      <AdminTd>{plan.billingCycle}</AdminTd>
                      <AdminTd>
                        <AdminBadge variant={statusBadgeVariant(plan.status)}>
                          {statusLabels[plan.status] || plan.status}
                        </AdminBadge>
                      </AdminTd>
                      <AdminTd align="right">
                        <span className="tabular-nums font-medium">{plan.priceCount}</span>
                      </AdminTd>
                      <AdminTd align="right">
                        <span className="tabular-nums text-admin-text-muted">{plan.sortOrder}</span>
                      </AdminTd>
                      <AdminTd align="right">
                        <AdminLink
                          href={withAdminReturnTo(`/admin/plans/${plan.id}/edit`, currentTabHref)}
                          className={adminListActionClassName}
                        >
                          编辑
                        </AdminLink>
                      </AdminTd>
                    </AdminTr>
                  ))
                )}
              </AdminTableBody>
            </AdminTable>
          </div>
        </div>
      ) : null}

      {/* TAB 3: Sources & Jobs */}
      {tab === "sources" ? (
        <div className="divide-y divide-admin-border">
          <section className="grid gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div>
              <h2 className="text-sm font-semibold text-admin-text">App Store 来源</h2>
              <p className="mt-1 text-xs leading-5 text-admin-text-muted">
                配置后自动生成或更新采集任务，采集完成后进入异常审核流。
              </p>
              <dl className="mt-4 space-y-2 border-t border-admin-border pt-3 text-xs">
                <div className="flex justify-between">
                  <dt className="text-admin-text-muted">来源状态</dt>
                  <dd className="font-medium text-admin-text">{appStoreSource ? "已配置" : "未配置"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-admin-text-muted">任务状态</dt>
                  <dd className="font-medium text-admin-text">
                    {latestAppStoreJob ? latestAppStoreJob.status : "未生成"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-admin-text-muted">App ID</dt>
                  <dd className="font-mono text-admin-text">
                    {latestAppStoreJob?.app_store_id || "—"}
                  </dd>
                </div>
              </dl>
            </div>

            <AdminActionForm action={saveProductAppStoreSourceAction} className="max-w-2xl space-y-4">
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="recordVersion" value={adminRecordVersion(product)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminInput
                  name="appStoreUrl"
                  label="App Store URL"
                  defaultValue={appStoreSource?.baseUrl || ""}
                  placeholder="https://apps.apple.com/us/app/example/id123456789"
                />
                <AdminInput
                  name="appStoreId"
                  label="App Store App ID"
                  defaultValue={latestAppStoreJob?.app_store_id || ""}
                  placeholder="例如：6448311069"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <AdminButton type="submit" variant="primary" size="sm">
                  保存来源并准备采集
                </AdminButton>
                <AdminLinkButton
                  href={`/admin/pipeline?tab=runs&product=${encodeURIComponent(product.slug)}`}
                  variant="secondary"
                  size="sm"
                >
                  完整运行记录
                </AdminLinkButton>
              </div>
            </AdminActionForm>
          </section>

          <div>
            <div className="border-b border-admin-border px-4 py-3 text-xs font-medium text-admin-text-muted sm:px-6">
              全部关联采集任务（{workspace.jobs.length}）
            </div>
            <div className="overflow-x-auto">
              <AdminTable>
                <AdminTableHead>
                  <tr>
                    <AdminTh>来源 / 类型</AdminTh>
                    <AdminTh>任务状态</AdminTh>
                    <AdminTh>调度</AdminTh>
                    <AdminTh>最近运行</AdminTh>
                    <AdminTh align="right">运行时间</AdminTh>
                  </tr>
                </AdminTableHead>
                <AdminTableBody>
                  {workspace.jobs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-admin-text-muted">
                        暂未配置采集任务。
                      </td>
                    </tr>
                  ) : (
                    workspace.jobs.map((job) => (
                      <AdminTr key={job.id}>
                        <AdminTd>
                          <div className="font-medium text-admin-text">
                            {job.sourceName || job.collectorKind}
                          </div>
                          <div className="font-mono text-xs text-admin-text-faint">
                            {job.collectorKind} · {job.jobType}
                          </div>
                        </AdminTd>
                        <AdminTd>
                          <AdminBadge variant={job.status === "active" ? "published" : "neutral"}>
                            {job.status}
                          </AdminBadge>
                        </AdminTd>
                        <AdminTd>{job.schedule || "手动"}</AdminTd>
                        <AdminTd>
                          <AdminBadge
                            variant={
                              job.latestRunStatus === "succeeded"
                                ? "published"
                                : job.latestRunStatus === "failed"
                                  ? "danger"
                                  : "neutral"
                            }
                          >
                            {job.latestRunStatus || "无运行"}
                          </AdminBadge>
                        </AdminTd>
                        <AdminTd align="right">
                          <span className="text-xs tabular-nums text-admin-text-muted">
                            {formatDate(job.latestRunStartedAt)}
                          </span>
                        </AdminTd>
                      </AdminTr>
                    ))
                  )}
                </AdminTableBody>
              </AdminTable>
            </div>
          </div>
        </div>
      ) : null}

      {/* TAB 4: Published Prices */}
      {tab === "prices" ? (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border px-4 py-3 sm:px-6">
            <p className="text-xs tabular-nums text-admin-text-muted">
              显示按 USD 升序前 <strong className="font-semibold text-admin-text">{workspace.prices.length}</strong> / {counts.prices} 条已发布正式价格
            </p>
            <div className="flex items-center gap-2">
              <AdminLinkButton
                href={`/admin/pricing-preview?product=${encodeURIComponent(product.slug)}`}
                variant="secondary"
                size="sm"
              >
                价格结构预览
              </AdminLinkButton>
              <AdminLinkButton
                href={`/admin/prices?product=${encodeURIComponent(product.slug)}`}
                size="sm"
              >
                完整正式价格库
              </AdminLinkButton>
            </div>
          </div>
          <div className="overflow-x-auto">
            <AdminTable>
              <AdminTableHead>
                <tr>
                  <AdminTh>套餐</AdminTh>
                  <AdminTh>地区</AdminTh>
                  <AdminTh>平台</AdminTh>
                  <AdminTh align="right">本地标价</AdminTh>
                  <AdminTh align="right">USD</AdminTh>
                  <AdminTh>质量</AdminTh>
                  <AdminTh align="right">最近核验</AdminTh>
                </tr>
              </AdminTableHead>
              <AdminTableBody>
                {workspace.prices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-admin-text-muted">
                      当前产品尚无已发布正式价格。
                    </td>
                  </tr>
                ) : (
                  workspace.prices.map((price) => (
                    <AdminTr key={price.id}>
                      <AdminTd>
                        <span className="font-medium text-admin-text">{price.planName}</span>
                      </AdminTd>
                      <AdminTd>
                        <span className="font-medium text-admin-text">{price.countryCode}</span>
                        <span className="ml-1.5 text-xs text-admin-text-muted">
                          {price.countryName}
                        </span>
                      </AdminTd>
                      <AdminTd>{price.billingPlatform}</AdminTd>
                      <AdminTd align="right">
                        <span className="tabular-nums">
                          {price.localPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}{" "}
                          {price.currency}
                        </span>
                      </AdminTd>
                      <AdminTd align="right">
                        <span className="font-semibold tabular-nums text-admin-text">
                          ${price.priceUsd.toFixed(2)}
                        </span>
                      </AdminTd>
                      <AdminTd>
                        <AdminBadge
                          variant={
                            price.dataQuality === "VERIFIED"
                              ? "published"
                              : price.dataQuality === "STALE"
                                ? "review"
                                : "neutral"
                          }
                        >
                          {price.dataQuality}
                        </AdminBadge>
                      </AdminTd>
                      <AdminTd align="right">
                        <span className="text-xs tabular-nums text-admin-text-muted">
                          {formatDate(price.lastCheckedAt)}
                        </span>
                      </AdminTd>
                    </AdminTr>
                  ))
                )}
              </AdminTableBody>
            </AdminTable>
          </div>
        </div>
      ) : null}

      {/* TAB 5: SEO — Two-Column Settings Layout */}
      {tab === "seo" ? (
        <div className="px-4 sm:px-6">
          <div id="product-seo" />
          <AdminActionForm action={saveProductSeoAction} className="divide-y divide-admin-border">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="recordVersion" value={adminRecordVersion(seoMeta)} />

            <section className="grid gap-6 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div>
                <h2 className="text-sm font-semibold text-admin-text">搜索元数据（中文）</h2>
                <p className="mt-1 text-xs leading-5 text-admin-text-muted">
                  维护价格详情页的搜索标题、H1、Canonical、结构化数据与描述。
                </p>
                <AdminLink
                  href={`/admin/seo?product=${encodeURIComponent(product.slug)}`}
                  className="mt-3 inline-flex text-xs font-medium text-admin-text-secondary hover:text-admin-text hover:underline"
                >
                  打开全站 SEO 体检 →
                </AdminLink>
              </div>

              <div className="max-w-2xl space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminInput
                    name="title"
                    label="SEO 标题 *"
                    required
                    defaultValue={seoMeta?.title || `${product.name} 全球价格对比`}
                  />
                  <AdminInput
                    name="h1"
                    label="页面 H1"
                    defaultValue={seoMeta?.h1 || `${product.name} 全球订阅价格对比`}
                  />
                  <AdminInput
                    name="canonicalUrl"
                    label="Canonical"
                    defaultValue={seoMeta?.canonicalUrl || publicPath}
                  />
                  <AdminSelect
                    name="schemaType"
                    label="结构化数据"
                    value={seoMeta?.schemaType || "NONE"}
                    options={[
                      { value: "NONE", label: "不输出", description: "暂不输出额外结构化数据" },
                      { value: "TECH_ARTICLE", label: "TechArticle", description: "方法论型价格页" },
                      { value: "ARTICLE", label: "Article", description: "通用内容页" },
                      { value: "FAQ_PAGE", label: "FAQPage", description: "FAQ 结构化数据" },
                    ]}
                  />
                  <AdminSelect
                    name="status"
                    label="SEO 状态"
                    value={seoMeta?.status || "PUBLISHED"}
                    options={publishStatusOptions}
                  />
                </div>
                <AdminTextarea
                  name="description"
                  label="SEO 描述"
                  rows={4}
                  defaultValue={
                    seoMeta?.description ||
                    product.description ||
                    `查看 ${product.name} 在不同国家和地区的订阅价格、美元换算、价格差异和购买力对比。`
                  }
                />
              </div>
            </section>

            <div className="py-5">
              <AdminButton type="submit" variant="primary" size="sm">
                保存 SEO 信息
              </AdminButton>
            </div>
          </AdminActionForm>
        </div>
      ) : null}
    </fieldset>
  );
}

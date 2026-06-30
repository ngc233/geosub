import { notFound } from "next/navigation";
import { AdminButton, AdminLinkButton } from "../../../../../components/admin/AdminButton";
import {
  AdminCard,
  AdminPageHeader,
  AdminSectionHeader,
} from "../../../../../components/admin/AdminCard";
import { AdminCheckbox } from "../../../../../components/admin/AdminCheckbox";
import { AdminInput, AdminTextarea } from "../../../../../components/admin/AdminInput";
import AdminSelect from "../../../../../components/admin/AdminSelect";
import { prisma } from "../../../../../lib/prisma";
import ProductOnboardingSteps from "../../ProductOnboardingSteps";
import {
  saveProductAppStoreSourceAction,
  updateProductAction,
} from "../../actions";

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

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string;
    created?: string;
    appStoreAuto?: string;
    sourceSaved?: string;
    sourceError?: string;
  }>;
}) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};

  const product = await prisma.product.findUnique({
    where: {
      id,
    },
  });

  if (!product) {
    notFound();
  }

  const [appStoreSource, appStoreJob] = await Promise.all([
    prisma.priceSource.findUnique({
      where: {
        sourceKey: `product-${product.id}-app-store`,
      },
    }),
    prisma.$queryRaw<Array<{
      id: string;
      status: string;
      next_run_at: Date | string | null;
      app_store_id: string | null;
    }>>`
      SELECT
        job.id::text,
        job.status,
        job.next_run_at,
        job.job_config ->> 'app_store_id' AS app_store_id
      FROM collector_jobs job
      JOIN price_sources source ON source.id = job.source_id
      WHERE job.product_id = ${product.id}::uuid
        AND source.source_key = ${`product-${product.id}-app-store`}
        AND job.status <> 'archived'
      ORDER BY job.created_at DESC
      LIMIT 1
    `,
  ]);
  const latestAppStoreJob = appStoreJob[0] || null;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Products"
        title={`编辑数字服务：${product.name}`}
        description="维护产品基础资料，并继续补齐套餐、价格和审核发布流程。"
        action={
          <AdminLinkButton href="/admin/products" variant="secondary">
            返回列表
          </AdminLinkButton>
        }
      />

      {query?.error === "slug" ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          这个 slug 已被其他数字服务使用，请换一个。
        </div>
      ) : null}

      {query?.created === "1" ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
          产品已创建。系统会优先尝试按产品名自动匹配 App Store，并进入价格采集流程。
        </div>
      ) : null}

      {query?.appStoreAuto === "found" ? (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-medium text-blue-700">
          已自动找到 App Store 应用，并生成采集任务。采集器会自动读取套餐和地区价格。
        </div>
      ) : null}

      {query?.appStoreAuto === "not-found" ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-700">
          暂未自动匹配到 App Store 应用。请在本页补充 App Store URL 或 App ID 后继续自动采集。
        </div>
      ) : null}

      {query?.sourceSaved === "1" ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
          App Store 来源已保存，并已生成或更新采集任务。
        </div>
      ) : null}

      {query?.sourceError === "app-store" ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          请填写 App Store URL，或填写可识别的 App Store App ID。
        </div>
      ) : null}

      <ProductOnboardingSteps currentStep="product" productId={product.id} />

      <form action={updateProductAction} className="space-y-6">
        <input type="hidden" name="id" value={product.id} />

        <AdminCard>
          <AdminSectionHeader
            title="基础信息"
            description="修改数字服务名称、URL 标识、分类和发布状态。"
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <AdminInput
              name="name"
              label="数字服务名称 *"
              required
              defaultValue={product.name}
            />

            <AdminInput
              name="slug"
              label="Slug *"
              required
              defaultValue={product.slug}
              helperText="修改 slug 会影响前台路径，请谨慎操作。"
            />

            <AdminSelect
              name="category"
              label="分类"
              value={product.category}
              options={productCategoryOptions}
            />

            <AdminSelect
              name="status"
              label="状态"
              value={product.status}
              options={publishStatusOptions}
            />
          </div>
        </AdminCard>

        <AdminCard>
          <AdminSectionHeader
            title="展示信息"
            description="这些字段用于后台识别、前台数字服务卡片和页面内容。"
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <AdminInput
              name="provider"
              label="服务商"
              defaultValue={product.provider || ""}
            />

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
              label="Logo URL"
              defaultValue={product.logoUrl || ""}
            />

            <AdminInput
              name="officialUrl"
              label="官方网站"
              defaultValue={product.officialUrl || ""}
            />
          </div>

          <div className="mt-5">
            <AdminTextarea
              name="description"
              label="数字服务描述"
              rows={5}
              defaultValue={product.description || ""}
            />
          </div>

          <div className="mt-5">
            <AdminCheckbox
              name="featured"
              label="设为推荐数字服务"
              description="推荐数字服务后续会在首页、数字服务导航和榜单模块中优先展示。"
              defaultChecked={product.featured}
            />
          </div>
        </AdminCard>

        <div className="flex flex-wrap gap-3">
          <AdminButton type="submit" variant="primary">
            保存修改
          </AdminButton>

          <AdminLinkButton href="/admin/products" variant="secondary">
            取消
          </AdminLinkButton>
        </div>
      </form>

      <AdminCard className="mt-6">
        <AdminSectionHeader
          title="App Store 来源"
          description="V1 正式价格源优先使用 App Store。配置后会生成采集任务，采集结果进入价格审核。"
        />

        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
            <div className="text-xs font-semibold text-slate-400">来源状态</div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              {appStoreSource ? "已配置" : "未配置"}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
            <div className="text-xs font-semibold text-slate-400">采集任务</div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              {latestAppStoreJob ? latestAppStoreJob.status : "未生成"}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
            <div className="text-xs font-semibold text-slate-400">App ID</div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              {latestAppStoreJob?.app_store_id || "待填写"}
            </div>
          </div>
        </div>

        <form action={saveProductAppStoreSourceAction} className="space-y-5">
          <input type="hidden" name="productId" value={product.id} />

          <div className="grid gap-5 lg:grid-cols-2">
            <AdminInput
              name="appStoreUrl"
              label="App Store URL"
              defaultValue={appStoreSource?.baseUrl || ""}
              placeholder="https://apps.apple.com/us/app/example/id123456789"
              helperText="可以粘贴完整 App Store 地址，系统会尝试识别 App ID。"
            />

            <AdminInput
              name="appStoreId"
              label="App Store App ID"
              defaultValue={latestAppStoreJob?.app_store_id || ""}
              placeholder="例如：6448311069"
              helperText="如果 URL 中无法识别 id，可手动填写数字 ID。"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <AdminButton type="submit" variant="primary">
              保存来源并生成采集任务
            </AdminButton>
            <AdminLinkButton href="/admin/collector-jobs" variant="secondary">
              查看采集任务
            </AdminLinkButton>
          </div>
        </form>
      </AdminCard>
    </div>
  );
}


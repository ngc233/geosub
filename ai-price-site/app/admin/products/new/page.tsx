import { AdminButton, AdminLinkButton } from "../../../../components/admin/AdminButton";
import {
  AdminCard,
  AdminPageHeader,
  AdminSectionHeader,
} from "../../../../components/admin/AdminCard";
import { AdminCheckbox } from "../../../../components/admin/AdminCheckbox";
import { AdminInput, AdminTextarea } from "../../../../components/admin/AdminInput";
import AdminSelect from "../../../../components/admin/AdminSelect";
import ProductOnboardingSteps from "../ProductOnboardingSteps";
import { createProductAction } from "../actions";

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

export default async function NewProductPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const error = params?.error;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Products"
        title="新增数字服务"
        description="先建立产品档案。保存后继续补套餐、App Store 来源，并到价格采集审核页执行采集。"
        action={
          <AdminLinkButton href="/admin/products" variant="secondary">
            返回列表
          </AdminLinkButton>
        }
      />

      {error === "missing" ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          数字服务名称和 slug 必填。
        </div>
      ) : null}

      {error === "slug" ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          这个 slug 已经存在，请换一个。
        </div>
      ) : null}

      <ProductOnboardingSteps currentStep="product" />

      <form action={createProductAction} className="space-y-6">
        <AdminCard>
          <AdminSectionHeader
            title="基础信息"
            description="数字服务名称、URL 标识、分类和发布状态会直接影响前台路由和展示。"
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <AdminInput
              name="name"
              label="数字服务名称 *"
              required
              placeholder="例如：Netflix"
            />

            <AdminInput
              name="slug"
              label="Slug *"
              required
              placeholder="例如：netflix"
              helperText="用于生成前台路径，例如 /zh/ai-pricing/netflix/"
            />

            <AdminSelect
              name="category"
              label="分类"
              value="AI"
              options={productCategoryOptions}
            />

            <AdminSelect
              name="status"
              label="状态"
              value="DRAFT"
              options={publishStatusOptions}
            />
          </div>
        </AdminCard>

        <AdminCard>
          <AdminSectionHeader
            title="展示信息"
            description="这些内容主要用于后台识别、前台数字服务卡片和 SEO 页面补充。"
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <AdminInput
              name="provider"
              label="服务商"
              placeholder="例如：OpenAI"
            />

            <AdminInput
              name="sortOrder"
              label="排序"
              type="text"
              inputMode="numeric"
              defaultValue="100"
              className="admin-number-input"
              helperText="数字越小越靠前。"
            />

            <AdminInput
              name="logoUrl"
              label="Logo URL"
              placeholder="/logos/netflix.svg"
            />

            <AdminInput
              name="officialUrl"
              label="官方网站"
              placeholder="https://example.com/"
            />
          </div>

          <div className="mt-5">
            <AdminTextarea
              name="description"
              label="数字服务描述"
              rows={5}
              placeholder="简单描述这个数字服务的定位、用途和订阅特点。"
            />
          </div>

          <div className="mt-5">
            <AdminCheckbox
              name="featured"
              label="设为推荐数字服务"
              description="推荐数字服务后续会在首页、数字服务导航和榜单模块中优先展示。"
            />
          </div>
        </AdminCard>

        <div className="flex flex-wrap gap-3">
          <AdminButton type="submit" variant="primary">
            保存数字服务
          </AdminButton>

          <AdminLinkButton href="/admin/products" variant="secondary">
            取消
          </AdminLinkButton>
        </div>
      </form>
    </div>
  );
}


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
import { updateProductAction } from "../../actions";

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
  searchParams?: Promise<{ error?: string }>;
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

  return (
    <div>
      <AdminPageHeader
        eyebrow="Products"
        title={`编辑数字服务：${product.name}`}
        description="修改数字服务基础信息。保存后会自动写入 AuditLog 操作日志。"
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
    </div>
  );
}


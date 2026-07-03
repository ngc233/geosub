import { AdminLinkButton } from "../../../components/admin/AdminButton";
import { AdminCard } from "../../../components/admin/AdminCard";

type Props = {
  currentStep?: "product" | "plans" | "prices" | "review";
  productId?: string;
};

const steps = [
  {
    key: "product",
    title: "1. 产品资料",
    description: "名称、slug、分类、服务商和官网。",
  },
  {
    key: "plans",
    title: "2. 套餐结构",
    description: "Plus、Pro、Basic 等可比较套餐。",
  },
  {
    key: "prices",
    title: "3. App Store 价格",
    description: "采集或录入地区价格，进入审核。",
  },
  {
    key: "review",
    title: "4. 审核发布",
    description: "通过后写入正式价格并展示到前台。",
  },
] as const;

export default function ProductOnboardingSteps({
  currentStep = "product",
  productId,
}: Props) {
  return (
    <AdminCard className="mb-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-950">上架流程</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            V1 先围绕 App Store 正式价格源做闭环。产品保存后，继续补套餐、价格和审核。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <AdminLinkButton href="/admin/plans" variant="secondary" size="sm">
            去套餐库
          </AdminLinkButton>
          <AdminLinkButton href="/admin/review" variant="secondary" size="sm">
            去价格采集审核
          </AdminLinkButton>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {steps.map((step) => {
          const active = step.key === currentStep;

          return (
            <div
              key={step.key}
              className={[
                "rounded-2xl border px-4 py-3",
                active
                  ? "border-blue-200 bg-blue-50"
                  : "border-slate-200 bg-slate-50/70",
              ].join(" ")}
            >
              <div
                className={[
                  "text-sm font-bold",
                  active ? "text-blue-800" : "text-slate-800",
                ].join(" ")}
              >
                {step.title}
              </div>
              <div className="mt-1 text-xs leading-5 text-slate-500">
                {step.description}
              </div>
            </div>
          );
        })}
      </div>

      {productId ? (
        <p className="mt-4 text-xs leading-5 text-slate-400">
          当前产品 ID：{productId}
        </p>
      ) : null}
    </AdminCard>
  );
}

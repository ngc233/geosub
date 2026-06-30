import SegmentedControl from "./ui/SegmentedControl";
import type { ProductPlan } from "../data/ai-pricing";

type PlanTabsProps = {
  productSlug: string;
  plans: ProductPlan[];
  activePlanSlug: string;
};

export default function PlanTabs({
  productSlug,
  plans,
  activePlanSlug,
}: PlanTabsProps) {
  if (plans.length <= 1) {
    return null;
  }

  return (
    <SegmentedControl
      ariaLabel="套餐切换"
      value={activePlanSlug}
      tone="green"
      items={plans.map((plan) => ({
        label:
          plan.regions.length > 0
            ? plan.name
            : plan.priceStatus === "pending"
              ? `${plan.name} 待审核`
              : `${plan.name} 暂无价格`,
        value: plan.slug,
        href:
          plan.regions.length > 0
            ? `/zh/ai-pricing/${productSlug}/?plan=${plan.slug}`
            : undefined,
        disabled: plan.regions.length === 0,
      }))}
    />
  );
}

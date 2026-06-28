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
        label: plan.name,
        value: plan.slug,
        href: `/zh/ai-pricing/${productSlug}/?plan=${plan.slug}`,
      }))}
    />
  );
}

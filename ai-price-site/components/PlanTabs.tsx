import SegmentedControl from "./ui/SegmentedControl";
import type { ProductPlan } from "../data/ai-pricing";

type PlanTabsProps = {
  productSlug: string;
  plans: ProductPlan[];
  activePlanSlug: string;
  basePath?: string;
  locale?: "zh" | "en";
};

function getShortPlanName(name: string) {
  const shortened = name
    .replace(/^(ChatGPT|Claude|Gemini|Google AI|Google)\s+/i, "")
    .replace(/\s+Subscription$/i, "")
    .trim();

  return shortened || name;
}

export default function PlanTabs({
  productSlug,
  plans,
  activePlanSlug,
  basePath = "/zh/ai-pricing",
  locale = "zh",
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
              ? locale === "en"
                ? `${plan.name} pending`
                : `${plan.name} 待审核`
              : locale === "en"
                ? `${plan.name} no price`
                : `${plan.name} 暂无价格`,
        shortLabel:
          plan.regions.length > 0
            ? getShortPlanName(plan.name)
            : plan.priceStatus === "pending"
              ? locale === "en"
                ? `${getShortPlanName(plan.name)} pending`
                : `${getShortPlanName(plan.name)} 待审`
              : locale === "en"
                ? `${getShortPlanName(plan.name)} no price`
                : `${getShortPlanName(plan.name)} 暂无`,
        value: plan.slug,
        href:
          plan.regions.length > 0
            ? `${basePath.replace(/\/$/, "")}/${productSlug}/?plan=${plan.slug}`
            : undefined,
        disabled: plan.regions.length === 0,
      }))}
    />
  );
}

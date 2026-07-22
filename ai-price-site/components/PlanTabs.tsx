import SegmentedControl from "./ui/SegmentedControl";
import type { ProductPlan } from "../lib/public-pricing-model";
import type { SiteLocale } from "../lib/site-locale";

type PlanTabsProps = {
  productName: string;
  productSlug: string;
  plans: ProductPlan[];
  activePlanSlug: string;
  basePath?: string;
  locale?: SiteLocale;
};

const planTabsCopy: Record<
  SiteLocale,
  {
    ariaLabel: string;
    pending: string;
    pendingShort: string;
    noPrice: string;
    noPriceShort: string;
  }
> = {
  zh: {
    ariaLabel: "套餐切换",
    pending: "待审核",
    pendingShort: "待审",
    noPrice: "暂无价格",
    noPriceShort: "暂无",
  },
  en: {
    ariaLabel: "Plan selector",
    pending: "pending",
    pendingShort: "pending",
    noPrice: "no price",
    noPriceShort: "no price",
  },
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getShortPlanName(name: string, productName: string) {
  const productPrefix = new RegExp(`^${escapeRegExp(productName)}\\s+`, "i");
  const shortened = name
    .replace(productPrefix, "")
    .replace(/\s+Subscription$/i, "")
    .trim();

  return shortened || name;
}

export default function PlanTabs({
  productName,
  productSlug,
  plans,
  activePlanSlug,
  basePath = "/zh/ai-pricing",
  locale = "zh",
}: PlanTabsProps) {
  if (plans.length <= 1) {
    return null;
  }

  const copy = planTabsCopy[locale];

  return (
    <SegmentedControl
      ariaLabel={copy.ariaLabel}
      value={activePlanSlug}
      tone="green"
      items={plans.map((plan) => ({
        label:
          plan.regions.length > 0
            ? plan.name
            : plan.priceStatus === "pending"
              ? `${plan.name} ${copy.pending}`
              : `${plan.name} ${copy.noPrice}`,
        shortLabel:
          plan.regions.length > 0
            ? getShortPlanName(plan.name, productName)
            : plan.priceStatus === "pending"
              ? `${getShortPlanName(plan.name, productName)} ${copy.pendingShort}`
              : `${getShortPlanName(plan.name, productName)} ${copy.noPriceShort}`,
        value: plan.slug,
        tracking: {
          event: "select_plan",
          name: "Select subscription plan",
          button: `${productSlug}:${plan.slug}`,
          placement: "plan_tabs",
        },
        href:
          plan.regions.length > 0
            ? `${basePath.replace(/\/$/, "")}/${productSlug}/?plan=${plan.slug}`
            : undefined,
        disabled: plan.regions.length === 0,
      }))}
    />
  );
}

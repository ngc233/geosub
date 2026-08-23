import SegmentedControl from "./ui/SegmentedControl";
import type { ProductPlan } from "../lib/public-pricing-model";
import { getPlanTabLabel } from "../lib/pricing-labels";
import { getPricingPlanPath } from "../lib/pricing-routes";
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
  "zh-tw": {
    ariaLabel: "方案切換",
    pending: "待審核",
    pendingShort: "待審",
    noPrice: "暫無價格",
    noPriceShort: "暫無",
  },
  en: {
    ariaLabel: "Plan selector",
    pending: "pending",
    pendingShort: "pending",
    noPrice: "no price",
    noPriceShort: "no price",
  },
  ja: {
    ariaLabel: "プランを選択",
    pending: "確認待ち",
    pendingShort: "確認待ち",
    noPrice: "価格情報なし",
    noPriceShort: "価格なし",
  },
  ko: {
    ariaLabel: "요금제 선택",
    pending: "확인 대기",
    pendingShort: "확인 대기",
    noPrice: "가격 정보 없음",
    noPriceShort: "가격 없음",
  },
  es: {
    ariaLabel: "Selector de plan",
    pending: "pendiente de revisión",
    pendingShort: "pendiente",
    noPrice: "sin precio",
    noPriceShort: "sin precio",
  },
  tr: {
    ariaLabel: "Paket seçimi",
    pending: "inceleme bekliyor",
    pendingShort: "bekliyor",
    noPrice: "fiyat yok",
    noPriceShort: "fiyat yok",
  },
  ar: {
    ariaLabel: "اختيار الباقة",
    pending: "بانتظار المراجعة",
    pendingShort: "قيد المراجعة",
    noPrice: "لا يوجد سعر",
    noPriceShort: "بلا سعر",
  },
  fr: {
    ariaLabel: "Choix de l’offre",
    pending: "en attente de vérification",
    pendingShort: "à vérifier",
    noPrice: "prix indisponible",
    noPriceShort: "sans prix",
  },
  it: {
    ariaLabel: "Selezione del piano",
    pending: "in attesa di verifica",
    pendingShort: "da verificare",
    noPrice: "prezzo non disponibile",
    noPriceShort: "senza prezzo",
  },
  de: {
    ariaLabel: "Tarif auswählen",
    pending: "Prüfung ausstehend",
    pendingShort: "zu prüfen",
    noPrice: "kein Preis verfügbar",
    noPriceShort: "kein Preis",
  },
  pt: {
    ariaLabel: "Seleção do plano",
    pending: "a aguardar verificação",
    pendingShort: "por verificar",
    noPrice: "preço indisponível",
    noPriceShort: "sem preço",
  },
};

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
    <div className="max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <SegmentedControl
        ariaLabel={copy.ariaLabel}
        value={activePlanSlug}
        size="sm"
        tone="green"
        className="min-w-max"
        items={plans.map((plan) => {
          const shortName = getPlanTabLabel(productName, plan.name);

          return {
            label:
              plan.regions.length > 0
                ? shortName
                : plan.priceStatus === "pending"
                  ? `${shortName} ${copy.pendingShort}`
                  : `${shortName} ${copy.noPriceShort}`,
            value: plan.slug,
            tracking: {
              event: "select_plan",
              name: "Select subscription plan",
              button: `${productSlug}:${plan.slug}`,
              placement: "plan_tabs",
            },
            href:
              plan.regions.length > 0
                ? getPricingPlanPath(
                    locale,
                    basePath.includes("streaming-pricing") ? "streaming" : "ai",
                    productSlug,
                    plan.slug,
                  )
                : undefined,
            disabled: plan.regions.length === 0,
          };
        })}
      />
    </div>
  );
}

import {
  ExternalLink,
  GitCompareArrows,
  Info,
  UserRound,
} from "lucide-react";
import TrackedLink from "./analytics/TrackedLink";
import type { getProductEditorialContent } from "../lib/product-editorial-content";
import type { SiteLocale } from "../lib/site-locale";

type EditorialContent = NonNullable<
  ReturnType<typeof getProductEditorialContent>
>;

const sectionCopy: Record<
  SiteLocale,
  {
    eyebrow: string;
    title: (planName: string) => string;
    helper: string;
    sourceHint: string;
  }
> = {
  zh: {
    eyebrow: "套餐选择",
    title: (planName) => `${planName} 适合谁`,
    helper:
      "从使用频率、功能需求和预算判断是否适合；具体权益与动态限额以官方说明为准。",
    sourceHint: "官方页面用于核对当前套餐权益与地区可用性。",
  },
  "zh-tw": {
    eyebrow: "方案選擇",
    title: (planName) => `${planName} 適合誰`,
    helper:
      "請依使用頻率、功能需求和預算判斷是否適合；具體權益與動態限制以官方說明為準。",
    sourceHint: "官方頁面用於核對目前方案權益與地區可用性。",
  },
  en: {
    eyebrow: "Plan fit",
    title: (planName) => `Who ${planName} is for`,
    helper:
      "Use frequency, feature needs and budget to decide; official terms and dynamic limits remain authoritative.",
    sourceHint:
      "Use the official page to confirm current benefits and regional availability.",
  },
  ja: {
    eyebrow: "プラン選び",
    title: (planName) => `${planName} が向いている人`,
    helper:
      "利用頻度、必要な機能、予算から適合性を判断し、具体的な特典と動的上限は公式情報で確認してください。",
    sourceHint: "公式ページで現在の特典と地域別の提供状況を確認できます。",
  },
  ko: {
    eyebrow: "요금제 선택",
    title: (planName) => `${planName} 요금제가 적합한 사용자`,
    helper:
      "사용 빈도, 필요한 기능과 예산을 기준으로 판단하고 구체적인 혜택과 동적 한도는 공식 안내를 확인하세요.",
    sourceHint: "공식 페이지에서 현재 혜택과 지역별 제공 여부를 확인하세요.",
  },
  es: {
    eyebrow: "Elección del plan",
    title: (planName) => `Para quién es ${planName}`,
    helper:
      "Valora la frecuencia de uso, las funciones necesarias y el presupuesto; las condiciones oficiales y los límites dinámicos son la referencia.",
    sourceHint:
      "Usa la página oficial para confirmar las ventajas actuales y la disponibilidad regional.",
  },
  tr: {
    eyebrow: "Paket seçimi",
    title: (planName) => `${planName} kimler için uygun`,
    helper:
      "Kullanım sıklığına, ihtiyaç duyulan özelliklere ve bütçeye göre karar verin; resmi koşullar ve dinamik sınırlar esas alınmalıdır.",
    sourceHint:
      "Güncel avantajları ve bölgesel kullanılabilirliği resmi sayfadan doğrulayın.",
  },
  ar: {
    eyebrow: "اختيار الباقة",
    title: (planName) => `لمن تناسب باقة ${planName}`,
    helper:
      "حدّد الملاءمة وفق وتيرة الاستخدام والميزات المطلوبة والميزانية؛ وتبقى الشروط الرسمية والحدود المتغيرة هي المرجع.",
    sourceHint:
      "استخدم الصفحة الرسمية للتحقق من المزايا الحالية والتوفر حسب المنطقة.",
  },
  fr: {
    eyebrow: "Choix de l’offre",
    title: (planName) => `À qui s’adresse ${planName}`,
    helper:
      "Évaluez la fréquence d’utilisation, les fonctions nécessaires et le budget ; les conditions officielles et limites dynamiques font foi.",
    sourceHint:
      "Consultez la page officielle pour confirmer les avantages actuels et la disponibilité régionale.",
  },
  it: {
    eyebrow: "Scelta del piano",
    title: (planName) => `A chi è adatto ${planName}`,
    helper:
      "Valuta frequenza d'uso, funzioni necessarie e budget; fanno fede le condizioni ufficiali e i limiti dinamici.",
    sourceHint:
      "Usa la pagina ufficiale per verificare i vantaggi attuali e la disponibilità regionale.",
  },
  de: {
    eyebrow: "Tarifwahl",
    title: (planName) => `Für wen ${planName} geeignet ist`,
    helper:
      "Entscheiden Sie anhand von Nutzungshäufigkeit, Funktionsbedarf und Budget; maßgeblich sind die offiziellen Bedingungen und dynamischen Grenzen.",
    sourceHint:
      "Prüfen Sie auf der offiziellen Seite die aktuellen Leistungen und die regionale Verfügbarkeit.",
  },
  pt: {
    eyebrow: "Escolha do plano",
    title: (planName) => `A quem se destina o ${planName}`,
    helper:
      "Avalie a frequência de utilização, as funcionalidades necessárias e o orçamento; prevalecem os termos oficiais e os limites dinâmicos.",
    sourceHint:
      "Consulte a página oficial para confirmar os benefícios atuais e a disponibilidade regional.",
  },
};

export function ProductEditorialSection({
  productSlug,
  planName,
  locale,
  content,
}: {
  productSlug: string;
  planName: string;
  locale: SiteLocale;
  content: EditorialContent;
}) {
  const copy = sectionCopy[locale];
  const title = copy.title(planName);

  return (
    <section className="border-y border-zinc-200 py-6 dark:border-zinc-800">
      <div className="max-w-3xl">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
          {copy.eyebrow}
        </div>
        <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          {copy.helper}
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <UserRound aria-hidden="true" className="size-4" strokeWidth={1.8} />
            </span>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
              {content.bestForLabel}
            </h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {content.plan.bestFor}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <GitCompareArrows aria-hidden="true" className="size-4" strokeWidth={1.8} />
            </span>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
              {content.differenceLabel}
            </h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {content.plan.difference}
          </p>
        </div>
      </div>

      {content.plan.availabilityNote ? (
        <div className="mt-3 flex gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/70">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-zinc-500" strokeWidth={1.8} />
          <div>
            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              {content.availabilityLabel}
            </div>
            <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {content.plan.availabilityNote}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <p className="hidden text-xs text-zinc-500 sm:block dark:text-zinc-400">
          {copy.sourceHint}
        </p>
        <TrackedLink
          href={content.plan.sourceUrl}
          eventKey="click_official"
          eventName="Open official plan guide"
          buttonKey={`${productSlug}-plan-guide`}
          placement="plan_editorial"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:text-zinc-950 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:text-white"
        >
          {content.sourceLabel}
          <ExternalLink aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
        </TrackedLink>
      </div>
    </section>
  );
}

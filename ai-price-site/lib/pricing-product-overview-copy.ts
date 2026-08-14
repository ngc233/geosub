import type { SiteLocale } from "./site-locale";
import { withTraditionalChinese } from "./traditional-chinese";

type OverviewCopy = {
  title: (productName: string, year: number) => string;
  description: (productName: string, planCount: number, regionCount: number) => string;
  heading: string;
  intro: (productName: string) => string;
  monthly: string;
  yearly: string;
  regions: (count: number) => string;
  priceRange: string;
  viewPlan: string;
};

const overviewCopy = withTraditionalChinese({
  zh: {
    title: (name, year) => `${name} 套餐与全球价格对比（${year}）`,
    description: (name, plans, regions) =>
      `比较 ${name} 的 ${plans} 个订阅套餐及最多 ${regions} 个国家和地区的 App Store 价格，查看各套餐价格范围、覆盖地区和独立地区价格明细。`,
    heading: "套餐概览",
    intro: (name) => `先比较 ${name} 的套餐，再进入具体套餐查看各地区价格、税费和购买力差异。`,
    monthly: "月付",
    yearly: "年付",
    regions: (count) => `${count} 个地区`,
    priceRange: "美元价格范围",
    viewPlan: "查看地区价格",
  },
  en: {
    title: (name, year) => `${name} Plans and Prices by Country (${year})`,
    description: (name, plans, regions) =>
      `Compare ${plans} ${name} subscription plans across up to ${regions} App Store regions, including plan-level price ranges and links to verified country pricing.`,
    heading: "Plan overview",
    intro: (name) => `Compare ${name} plans first, then open a plan to review regional prices, taxes and purchasing-power differences.`,
    monthly: "Monthly",
    yearly: "Yearly",
    regions: (count) => `${count} regions`,
    priceRange: "USD price range",
    viewPlan: "View regional prices",
  },
  ja: {
    title: (name, year) => `${name} のプランと国別料金（${year}年）`,
    description: (name, plans, regions) =>
      `${name} の${plans}件のプランを最大${regions}地域の App Store 料金で比較し、各プランの価格帯と国別料金を確認できます。`,
    heading: "プラン概要",
    intro: (name) => `${name} のプランを比較してから、各プランの地域別料金、税金、購買力の違いを確認できます。`,
    monthly: "月額",
    yearly: "年額",
    regions: (count) => `${count}地域`,
    priceRange: "米ドル換算の価格帯",
    viewPlan: "地域別料金を見る",
  },
  ko: {
    title: (name, year) => `${name} 요금제와 국가별 가격 (${year})`,
    description: (name, plans, regions) =>
      `${name}의 ${plans}개 구독 요금제를 최대 ${regions}개 App Store 지역에서 비교하고 요금제별 가격 범위와 국가별 가격을 확인하세요.`,
    heading: "요금제 개요",
    intro: (name) => `${name} 요금제를 먼저 비교한 뒤 각 요금제의 지역별 가격, 세금, 구매력 차이를 확인하세요.`,
    monthly: "월간",
    yearly: "연간",
    regions: (count) => `${count}개 지역`,
    priceRange: "미국 달러 가격 범위",
    viewPlan: "지역별 가격 보기",
  },
  es: {
    title: (name, year) => `Planes y precios de ${name} por país (${year})`,
    description: (name, plans, regions) =>
      `Compara ${plans} planes de ${name} en hasta ${regions} regiones de la App Store, con rangos de precios y detalles por país para cada plan.`,
    heading: "Resumen de planes",
    intro: (name) => `Compara primero los planes de ${name} y abre cada uno para consultar precios regionales, impuestos y poder adquisitivo.`,
    monthly: "Mensual",
    yearly: "Anual",
    regions: (count) => `${count} regiones`,
    priceRange: "Rango de precios en USD",
    viewPlan: "Ver precios regionales",
  },
  tr: {
    title: (name, year) => `${name} Paketleri ve Ülkelere Göre Fiyatlar (${year})`,
    description: (name, plans, regions) =>
      `${name} için ${plans} abonelik paketini en fazla ${regions} App Store bölgesinde karşılaştırın; paket bazında fiyat aralıklarını ve ülke fiyatlarını inceleyin.`,
    heading: "Paket özeti",
    intro: (name) => `Önce ${name} paketlerini karşılaştırın, ardından bölgesel fiyatları, vergileri ve satın alma gücü farklarını inceleyin.`,
    monthly: "Aylık",
    yearly: "Yıllık",
    regions: (count) => `${count} bölge`,
    priceRange: "USD fiyat aralığı",
    viewPlan: "Bölgesel fiyatları gör",
  },
  ar: {
    title: (name, year) => `باقات ${name} والأسعار حسب البلد (${year})`,
    description: (name, plans, regions) =>
      `قارن ${plans} من باقات ${name} عبر ما يصل إلى ${regions} منطقة في App Store، مع نطاق السعر وتفاصيل الأسعار حسب البلد لكل باقة.`,
    heading: "نظرة عامة على الباقات",
    intro: (name) => `قارن باقات ${name} أولاً، ثم افتح كل باقة لمراجعة الأسعار الإقليمية والضرائب وفروق القوة الشرائية.`,
    monthly: "شهري",
    yearly: "سنوي",
    regions: (count) => `${count} منطقة`,
    priceRange: "نطاق السعر بالدولار",
    viewPlan: "عرض الأسعار الإقليمية",
  },
  fr: {
    title: (name, year) => `Offres ${name} et prix par pays (${year})`,
    description: (name, plans, regions) =>
      `Comparez ${plans} offres ${name} dans jusqu’à ${regions} régions de l’App Store, avec la fourchette de prix et le détail par pays pour chaque offre.`,
    heading: "Vue d’ensemble des offres",
    intro: (name) => `Comparez d’abord les offres ${name}, puis consultez les prix régionaux, les taxes et les écarts de pouvoir d’achat.`,
    monthly: "Mensuel",
    yearly: "Annuel",
    regions: (count) => `${count} régions`,
    priceRange: "Fourchette en USD",
    viewPlan: "Voir les prix régionaux",
  },
  it: {
    title: (name, year) => `Piani ${name} e prezzi per paese (${year})`,
    description: (name, plans, regions) =>
      `Confronta ${plans} piani ${name} in un massimo di ${regions} aree dell’App Store, con intervalli di prezzo e dettagli per paese per ogni piano.`,
    heading: "Panoramica dei piani",
    intro: (name) => `Confronta prima i piani ${name}, poi consulta prezzi regionali, imposte e differenze di potere d’acquisto.`,
    monthly: "Mensile",
    yearly: "Annuale",
    regions: (count) => `${count} aree`,
    priceRange: "Intervallo in USD",
    viewPlan: "Vedi i prezzi regionali",
  },
  de: {
    title: (name, year) => `${name}-Tarife und Preise nach Land (${year})`,
    description: (name, plans, regions) =>
      `Vergleichen Sie ${plans} ${name}-Tarife in bis zu ${regions} App-Store-Regionen, einschließlich Preisspannen und Länderpreisen für jeden Tarif.`,
    heading: "Tarifübersicht",
    intro: (name) => `Vergleichen Sie zuerst die ${name}-Tarife und prüfen Sie anschließend regionale Preise, Steuern und Kaufkraftunterschiede.`,
    monthly: "Monatlich",
    yearly: "Jährlich",
    regions: (count) => `${count} Regionen`,
    priceRange: "Preisspanne in USD",
    viewPlan: "Regionale Preise ansehen",
  },
  pt: {
    title: (name, year) => `Planos e preços do ${name} por país (${year})`,
    description: (name, plans, regions) =>
      `Compare ${plans} planos do ${name} em até ${regions} regiões da App Store, com intervalos de preço e detalhes por país para cada plano.`,
    heading: "Visão geral dos planos",
    intro: (name) => `Compare primeiro os planos do ${name} e consulte depois os preços regionais, impostos e diferenças de poder de compra.`,
    monthly: "Mensal",
    yearly: "Anual",
    regions: (count) => `${count} regiões`,
    priceRange: "Intervalo de preços em USD",
    viewPlan: "Ver preços regionais",
  },
} satisfies Record<Exclude<SiteLocale, "zh-tw">, OverviewCopy>);

export function getPricingProductOverviewCopy({
  locale,
  productName,
  planCount,
  regionCount,
  year = new Date().getFullYear(),
}: {
  locale: SiteLocale;
  productName: string;
  planCount: number;
  regionCount: number;
  year?: number;
}) {
  const copy = overviewCopy[locale];
  return {
    ...copy,
    metadataTitle: copy.title(productName, year),
    pageTitle: copy.title(productName, year),
    description: copy.description(productName, planCount, regionCount),
    intro: copy.intro(productName),
  };
}

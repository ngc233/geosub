import { formatUsd, type PlanStats } from "./public-pricing-model";
import { getPlanDisplayName } from "./pricing-labels";
import type { SiteLocale } from "./site-locale";
import { withTraditionalChinese } from "./traditional-chinese";

type SeoTemplate = {
  title: (name: string, year: number) => string;
  description: (
    name: string,
    regionCount: number,
    lowestCountry: string,
    lowestPrice: string,
  ) => string;
  fallbackDescription: (name: string) => string;
};

const seoTemplates = withTraditionalChinese({
  zh: {
    title: (name, year) => `${name}价格：全球各地区对比（${year}）`,
    description: (name, regionCount, lowestCountry, lowestPrice) =>
      `比较 ${regionCount} 个国家和地区的 ${name} App Store 订阅价格。当前最低约 ${lowestPrice}（${lowestCountry}），并查看本地价格、税费、汇率与购买力差异。`,
    fallbackDescription: (name) =>
      `比较 ${name} 在不同国家和地区的 App Store 订阅价格、本地货币、税费、汇率与购买力差异。`,
  },
  en: {
    title: (name, year) => `${name} Price by Country (${year})`,
    description: (name, regionCount, lowestCountry, lowestPrice) =>
      `Compare ${name} App Store prices across ${regionCount} countries and regions. The current lowest is about ${lowestPrice} in ${lowestCountry}, with local prices, taxes, exchange rates and affordability.`,
    fallbackDescription: (name) =>
      `Compare ${name} App Store subscription prices by country, including local prices, taxes, exchange rates and affordability.`,
  },
  ja: {
    title: (name, year) => `${name}の国別料金比較（${year}年）`,
    description: (name, regionCount, lowestCountry, lowestPrice) =>
      `${name}のApp Store料金を${regionCount}の国・地域で比較。現在の最安値は${lowestCountry}の約${lowestPrice}です。現地価格、税、為替、購買力も確認できます。`,
    fallbackDescription: (name) =>
      `${name}のApp Store料金を国・地域別に比較。現地価格、税、為替、購買力の違いを確認できます。`,
  },
  ko: {
    title: (name, year) => `${name} 국가별 가격 비교 (${year})`,
    description: (name, regionCount, lowestCountry, lowestPrice) =>
      `${regionCount}개 국가·지역의 ${name} App Store 가격을 비교하세요. 현재 최저가는 ${lowestCountry}의 약 ${lowestPrice}이며 현지 가격, 세금, 환율, 구매력도 확인할 수 있습니다.`,
    fallbackDescription: (name) =>
      `${name} App Store 구독 가격을 국가별로 비교하고 현지 가격, 세금, 환율, 구매력 차이를 확인하세요.`,
  },
  es: {
    title: (name, year) => `Precio de ${name} por país (${year})`,
    description: (name, regionCount, lowestCountry, lowestPrice) =>
      `Compara el precio de ${name} en App Store en ${regionCount} países y regiones. El más bajo es de unos ${lowestPrice} en ${lowestCountry}, con precios locales, impuestos, cambio y poder adquisitivo.`,
    fallbackDescription: (name) =>
      `Compara el precio de suscripción de ${name} en App Store por país, con precios locales, impuestos, tipos de cambio y poder adquisitivo.`,
  },
  tr: {
    title: (name, year) => `${name} ülkelere göre fiyatları (${year})`,
    description: (name, regionCount, lowestCountry, lowestPrice) =>
      `${name} App Store fiyatlarını ${regionCount} ülke ve bölgede karşılaştırın. Güncel en düşük fiyat ${lowestCountry} için yaklaşık ${lowestPrice}; yerel fiyat, vergi, kur ve satın alma gücü ayrıntılarını inceleyin.`,
    fallbackDescription: (name) =>
      `${name} App Store abonelik fiyatlarını ülkelere göre; yerel fiyat, vergi, döviz kuru ve satın alma gücüyle karşılaştırın.`,
  },
  ar: {
    title: (name, year) => `سعر ${name} حسب الدولة (${year})`,
    description: (name, regionCount, lowestCountry, lowestPrice) =>
      `قارن سعر ${name} في App Store عبر ${regionCount} دولة ومنطقة. أقل سعر حاليًا نحو ${lowestPrice} في ${lowestCountry}، مع الأسعار المحلية والضرائب وسعر الصرف والقدرة الشرائية.`,
    fallbackDescription: (name) =>
      `قارن سعر اشتراك ${name} في App Store حسب الدولة، مع الأسعار المحلية والضرائب وأسعار الصرف والقدرة الشرائية.`,
  },
  fr: {
    title: (name, year) => `Prix de ${name} par pays (${year})`,
    description: (name, regionCount, lowestCountry, lowestPrice) =>
      `Comparez le prix App Store de ${name} dans ${regionCount} pays et régions. Le moins cher est d’environ ${lowestPrice} en ${lowestCountry}, avec prix locaux, taxes, taux de change et pouvoir d’achat.`,
    fallbackDescription: (name) =>
      `Comparez le prix de l’abonnement App Store à ${name} par pays, avec les prix locaux, les taxes, les taux de change et le pouvoir d’achat.`,
  },
  it: {
    title: (name, year) => `Prezzo di ${name} per paese (${year})`,
    description: (name, regionCount, lowestCountry, lowestPrice) =>
      `Confronta il prezzo App Store di ${name} in ${regionCount} paesi e regioni. Il più basso è circa ${lowestPrice} in ${lowestCountry}, con prezzi locali, imposte, cambio e potere d’acquisto.`,
    fallbackDescription: (name) =>
      `Confronta il prezzo dell’abbonamento App Store a ${name} per paese, con prezzi locali, imposte, tassi di cambio e potere d’acquisto.`,
  },
  de: {
    title: (name, year) => `${name} Preise nach Land (${year})`,
    description: (name, regionCount, lowestCountry, lowestPrice) =>
      `Vergleichen Sie die App-Store-Preise für ${name} in ${regionCount} Ländern und Regionen. Am günstigsten ist derzeit ${lowestCountry} mit etwa ${lowestPrice}; inklusive lokaler Preise, Steuern, Wechselkurse und Kaufkraft.`,
    fallbackDescription: (name) =>
      `Vergleichen Sie die App-Store-Abopreise für ${name} nach Land, einschließlich lokaler Preise, Steuern, Wechselkurse und Kaufkraft.`,
  },
  pt: {
    title: (name, year) => `Preço do ${name} por país (${year})`,
    description: (name, regionCount, lowestCountry, lowestPrice) =>
      `Compare o preço de ${name} na App Store em ${regionCount} países e regiões. O mais baixo é cerca de ${lowestPrice} em ${lowestCountry}, com preços locais, impostos, câmbio e poder de compra.`,
    fallbackDescription: (name) =>
      `Compare o preço da assinatura de ${name} na App Store por país, incluindo preços locais, impostos, câmbio e poder de compra.`,
  },
} satisfies Record<Exclude<SiteLocale, "zh-tw">, SeoTemplate>);

export function getPricingDetailSeoCopy({
  locale,
  productName,
  planName,
  stats,
  regionCount,
  year = new Date().getFullYear(),
}: {
  locale: SiteLocale;
  productName: string;
  planName: string;
  stats: PlanStats | null;
  regionCount: number;
  year?: number;
}) {
  const name = getPlanDisplayName(productName, planName);
  const template = seoTemplates[locale];

  return {
    title: template.title(name, year),
    description: stats
      ? template.description(
          name,
          regionCount,
          stats.minRegion.country,
          formatUsd(stats.minRegion.priceUsd),
        )
      : template.fallbackDescription(name),
  };
}

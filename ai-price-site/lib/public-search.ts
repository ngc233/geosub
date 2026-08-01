import type { PreparedSiteLocale } from "./site-locale";

export type PublicSearchResultKind = "product" | "plan" | "article" | "tool";

export type PublicSearchResult = {
  id: string;
  kind: PublicSearchResultKind;
  title: string;
  subtitle: string;
  href: string;
  score: number;
  productId?: string;
  planId?: string;
  articleId?: string;
  logoSlug?: string;
  officialUrl?: string;
  category?: "ai" | "streaming";
};

type SearchResource = {
  id: string;
  kind: "article" | "tool";
  title: string;
  subtitle: string;
  path: string;
  terms: string[];
};

const productAliases: Record<string, string[]> = {
  chatgpt: ["chat gpt", "gpt", "open ai", "openai", "聊天机器人"],
  claude: ["anthropic", "克劳德"],
  gemini: ["google ai", "谷歌 ai", "bard"],
  grok: ["xai", "x ai"],
  manus: ["monica manus"],
  perplexity: ["秘塔搜索", "答案引擎"],
  suno: ["ai music", "音乐生成"],
  netflix: ["奈飞", "网飞"],
  disney: ["disney plus", "迪士尼", "迪士尼+"],
  "hbo-max": ["hbo", "hbo max", "hbomax", "max", "华纳流媒体"],
  copilot: ["microsoft copilot", "ms copilot", "bing chat"],
  poe: ["quora poe"],
  "character-ai": ["character ai", "characterai", "c ai", "c.ai"],
  midjourney: ["mid journey"],
  runway: ["runway ml", "runwayml"],
  kling: ["kling ai", "可灵"],
  sora: ["openai sora", "open ai sora"],
  "youtube-premium": ["youtube premium", "yt premium", "油管会员"],
  spotify: ["spotify premium"],
  "apple-music": ["apple music", "苹果音乐"],
};

const resourceCopy: Record<PreparedSiteLocale, SearchResource[]> = {
  zh: [
    { id: "guides", kind: "article", title: "订阅指南", subtitle: "价格、支付、账号与跨区订阅指南", path: "/guides", terms: ["指南", "教程", "订阅"] },
    { id: "price-guide", kind: "article", title: "全球价格指南", subtitle: "了解汇率、税费和地区价格差异", path: "/guides/price-guide", terms: ["价格", "税费", "地区", "便宜"] },
    { id: "payment-account", kind: "article", title: "支付与账号", subtitle: "支付方式、账号地区和订阅注意事项", path: "/guides/payment-account", terms: ["支付", "账号", "付款", "跨区"] },
    { id: "currency-converter", kind: "tool", title: "汇率转换器", subtitle: "使用 GeoSub 最新汇率换算常用货币", path: "/tools/currency-converter", terms: ["汇率", "货币", "换算", "人民币", "美元"] },
  ],
  "zh-tw": [
    { id: "guides", kind: "article", title: "訂閱指南", subtitle: "價格、付款、帳號與跨區訂閱指南", path: "/guides", terms: ["指南", "教學", "訂閱"] },
    { id: "price-guide", kind: "article", title: "全球價格指南", subtitle: "瞭解匯率、稅費與地區價格差異", path: "/guides/price-guide", terms: ["價格", "稅費", "地區", "便宜"] },
    { id: "payment-account", kind: "article", title: "付款與帳號", subtitle: "付款方式、帳號地區與訂閱注意事項", path: "/guides/payment-account", terms: ["付款", "帳號", "支付", "跨區"] },
    { id: "currency-converter", kind: "tool", title: "匯率換算器", subtitle: "使用 GeoSub 最新匯率換算常用貨幣", path: "/tools/currency-converter", terms: ["匯率", "貨幣", "換算", "台幣", "美元"] },
  ],
  en: [
    { id: "guides", kind: "article", title: "Subscription guides", subtitle: "Pricing, payment, account and regional subscription guides", path: "/guides", terms: ["guide", "how to", "subscription"] },
    { id: "price-guide", kind: "article", title: "Global pricing guide", subtitle: "Understand exchange rates, taxes and regional pricing", path: "/guides/price-guide", terms: ["price", "tax", "region", "cheap"] },
    { id: "payment-account", kind: "article", title: "Payment and account", subtitle: "Payment methods, account regions and subscription notes", path: "/guides/payment-account", terms: ["payment", "account", "billing", "region"] },
    { id: "currency-converter", kind: "tool", title: "Currency converter", subtitle: "Convert common currencies with GeoSub's latest rates", path: "/tools/currency-converter", terms: ["exchange rate", "currency", "convert", "usd"] },
  ],
  ja: [
    { id: "guides", kind: "article", title: "サブスクリプションガイド", subtitle: "料金、支払い、アカウント、地域設定のガイド", path: "/guides", terms: ["ガイド", "方法", "サブスク"] },
    { id: "price-guide", kind: "article", title: "世界の料金ガイド", subtitle: "為替、税金、地域別料金の違いを解説", path: "/guides/price-guide", terms: ["料金", "税金", "地域", "安い"] },
    { id: "payment-account", kind: "article", title: "支払いとアカウント", subtitle: "支払い方法とアカウント地域の注意点", path: "/guides/payment-account", terms: ["支払い", "アカウント", "決済"] },
    { id: "currency-converter", kind: "tool", title: "通貨換算", subtitle: "GeoSub の最新レートで通貨を換算", path: "/tools/currency-converter", terms: ["為替", "通貨", "換算", "円"] },
  ],
  ko: [
    { id: "guides", kind: "article", title: "구독 가이드", subtitle: "가격, 결제, 계정 및 지역별 구독 안내", path: "/guides", terms: ["가이드", "방법", "구독"] },
    { id: "price-guide", kind: "article", title: "글로벌 가격 가이드", subtitle: "환율, 세금 및 지역별 가격 차이 안내", path: "/guides/price-guide", terms: ["가격", "세금", "지역", "저렴"] },
    { id: "payment-account", kind: "article", title: "결제 및 계정", subtitle: "결제 수단과 계정 지역 관련 안내", path: "/guides/payment-account", terms: ["결제", "계정", "지불"] },
    { id: "currency-converter", kind: "tool", title: "환율 계산기", subtitle: "GeoSub 최신 환율로 통화 변환", path: "/tools/currency-converter", terms: ["환율", "통화", "변환", "원"] },
  ],
  es: [
    { id: "guides", kind: "article", title: "Guías de suscripciones", subtitle: "Precios, pagos, cuentas y suscripciones regionales", path: "/guides", terms: ["guía", "cómo", "suscripción"] },
    { id: "price-guide", kind: "article", title: "Guía de precios globales", subtitle: "Tipos de cambio, impuestos y precios regionales", path: "/guides/price-guide", terms: ["precio", "impuesto", "región", "barato"] },
    { id: "payment-account", kind: "article", title: "Pagos y cuentas", subtitle: "Métodos de pago, región de la cuenta y suscripciones", path: "/guides/payment-account", terms: ["pago", "cuenta", "facturación"] },
    { id: "currency-converter", kind: "tool", title: "Conversor de divisas", subtitle: "Convierte divisas con los últimos tipos de GeoSub", path: "/tools/currency-converter", terms: ["tipo de cambio", "divisa", "convertir", "euro"] },
  ],
  tr: [
    { id: "guides", kind: "article", title: "Abonelik rehberleri", subtitle: "Fiyat, ödeme, hesap ve bölgesel abonelik rehberleri", path: "/guides", terms: ["rehber", "nasıl", "abonelik"] },
    { id: "price-guide", kind: "article", title: "Küresel fiyat rehberi", subtitle: "Döviz kurları, vergiler ve bölgesel fiyatlar", path: "/guides/price-guide", terms: ["fiyat", "vergi", "bölge", "ucuz"] },
    { id: "payment-account", kind: "article", title: "Ödeme ve hesap", subtitle: "Ödeme yöntemleri ve hesap bölgesi bilgileri", path: "/guides/payment-account", terms: ["ödeme", "hesap", "faturalandırma"] },
    { id: "currency-converter", kind: "tool", title: "Döviz çevirici", subtitle: "GeoSub'ın güncel kurlarıyla para birimi çevirin", path: "/tools/currency-converter", terms: ["döviz", "kur", "çevir", "lira"] },
  ],
  ar: [
    { id: "guides", kind: "article", title: "أدلة الاشتراكات", subtitle: "أدلة الأسعار والدفع والحساب والاشتراك حسب المنطقة", path: "/guides", terms: ["دليل", "كيفية", "اشتراك"] },
    { id: "price-guide", kind: "article", title: "دليل الأسعار العالمية", subtitle: "أسعار الصرف والضرائب وفروق الأسعار الإقليمية", path: "/guides/price-guide", terms: ["سعر", "ضريبة", "منطقة", "أرخص"] },
    { id: "payment-account", kind: "article", title: "الدفع والحساب", subtitle: "طرق الدفع ومنطقة الحساب وملاحظات الاشتراك", path: "/guides/payment-account", terms: ["دفع", "حساب", "فاتورة"] },
    { id: "currency-converter", kind: "tool", title: "محول العملات", subtitle: "حوّل العملات باستخدام أحدث أسعار GeoSub", path: "/tools/currency-converter", terms: ["صرف", "عملة", "تحويل", "ريال"] },
  ],
  fr: [
    { id: "guides", kind: "article", title: "Guides d'abonnement", subtitle: "Prix, paiement, compte et abonnements régionaux", path: "/guides", terms: ["guide", "comment", "abonnement"] },
    { id: "price-guide", kind: "article", title: "Guide des prix mondiaux", subtitle: "Taux de change, taxes et différences régionales", path: "/guides/price-guide", terms: ["prix", "taxe", "région", "moins cher"] },
    { id: "payment-account", kind: "article", title: "Paiement et compte", subtitle: "Moyens de paiement et région du compte", path: "/guides/payment-account", terms: ["paiement", "compte", "facturation"] },
    { id: "currency-converter", kind: "tool", title: "Convertisseur de devises", subtitle: "Convertissez avec les derniers taux de GeoSub", path: "/tools/currency-converter", terms: ["taux de change", "devise", "convertir", "euro"] },
  ],
  it: [
    { id: "guides", kind: "article", title: "Guide agli abbonamenti", subtitle: "Prezzi, pagamenti, account e abbonamenti regionali", path: "/guides", terms: ["guida", "come", "abbonamento"] },
    { id: "price-guide", kind: "article", title: "Guida ai prezzi globali", subtitle: "Tassi di cambio, imposte e differenze regionali", path: "/guides/price-guide", terms: ["prezzo", "imposta", "regione", "economico"] },
    { id: "payment-account", kind: "article", title: "Pagamento e account", subtitle: "Metodi di pagamento e regione dell'account", path: "/guides/payment-account", terms: ["pagamento", "account", "fatturazione"] },
    { id: "currency-converter", kind: "tool", title: "Convertitore di valuta", subtitle: "Converti con gli ultimi tassi di GeoSub", path: "/tools/currency-converter", terms: ["cambio", "valuta", "convertire", "euro"] },
  ],
  de: [
    { id: "guides", kind: "article", title: "Abonnement-Ratgeber", subtitle: "Preise, Zahlung, Konto und regionale Abonnements", path: "/guides", terms: ["ratgeber", "anleitung", "abonnement"] },
    { id: "price-guide", kind: "article", title: "Globaler Preisratgeber", subtitle: "Wechselkurse, Steuern und regionale Preise", path: "/guides/price-guide", terms: ["preis", "steuer", "region", "günstig"] },
    { id: "payment-account", kind: "article", title: "Zahlung und Konto", subtitle: "Zahlungsarten und Kontoregionen", path: "/guides/payment-account", terms: ["zahlung", "konto", "abrechnung"] },
    { id: "currency-converter", kind: "tool", title: "Währungsrechner", subtitle: "Mit den aktuellen GeoSub-Kursen umrechnen", path: "/tools/currency-converter", terms: ["wechselkurs", "währung", "umrechnen", "euro"] },
  ],
  pt: [
    { id: "guides", kind: "article", title: "Guias de assinaturas", subtitle: "Preços, pagamentos, contas e assinaturas regionais", path: "/guides", terms: ["guia", "como", "assinatura"] },
    { id: "price-guide", kind: "article", title: "Guia de preços globais", subtitle: "Câmbio, impostos e diferenças regionais", path: "/guides/price-guide", terms: ["preço", "imposto", "região", "barato"] },
    { id: "payment-account", kind: "article", title: "Pagamento e conta", subtitle: "Métodos de pagamento e região da conta", path: "/guides/payment-account", terms: ["pagamento", "conta", "faturação"] },
    { id: "currency-converter", kind: "tool", title: "Conversor de moedas", subtitle: "Converta moedas com as taxas mais recentes da GeoSub", path: "/tools/currency-converter", terms: ["câmbio", "moeda", "converter", "euro"] },
  ],
};

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/\p{Mark}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "");
}

function boundedDamerauLevenshtein(
  left: string,
  right: string,
  maxDistance: number
) {
  if (Math.abs(left.length - right.length) > maxDistance) {
    return maxDistance + 1;
  }

  const rows = left.length + 1;
  const columns = right.length + 1;
  const matrix = Array.from(
    { length: rows },
    () => Array<number>(columns).fill(0)
  );

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let column = 0; column < columns; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + substitutionCost
      );

      if (
        row > 1
        && column > 1
        && left[row - 1] === right[column - 2]
        && left[row - 2] === right[column - 1]
      ) {
        matrix[row][column] = Math.min(
          matrix[row][column],
          matrix[row - 2][column - 2] + 1
        );
      }
    }
  }

  return matrix[left.length][right.length];
}

function fuzzySearchScore(query: string, candidate: string) {
  if (query.length < 4 || candidate.length < 4) return 0;
  const maxDistance = query.length >= 8 ? 2 : 1;
  const distance = boundedDamerauLevenshtein(
    query,
    candidate,
    maxDistance
  );
  if (distance > maxDistance) return 0;
  return distance === 1 ? 68 : 60;
}

export function scoreSearchText(query: string, values: Array<string | null | undefined>) {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 2) return 0;

  let best = 0;
  for (const value of values) {
    const normalizedValue = normalizeSearchText(value || "");
    if (!normalizedValue) continue;
    if (normalizedValue === normalizedQuery) best = Math.max(best, 120);
    else if (normalizedValue.startsWith(normalizedQuery)) best = Math.max(best, 95);
    else if (normalizedValue.includes(normalizedQuery)) best = Math.max(best, 75);
    else if (normalizedQuery.includes(normalizedValue)) best = Math.max(best, 55);
    else best = Math.max(
      best,
      fuzzySearchScore(normalizedQuery, normalizedValue)
    );
  }
  return best;
}

export function getProductSearchAliases(slug: string) {
  return productAliases[slug] || [];
}

export function getSearchResources(locale: PreparedSiteLocale, query: string) {
  return resourceCopy[locale]
    .map((resource) => ({
      ...resource,
      score: scoreSearchText(query, [resource.title, resource.subtitle, ...resource.terms]),
    }))
    .filter((resource) => resource.score > 0);
}

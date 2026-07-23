import type { SiteLocale } from "./site-locale";
import { withTraditionalChinese } from "./traditional-chinese";

type ProductNavigationCopy = {
  products: string;
  currentProduct: string;
  ai: string;
  streaming: string;
  other: string;
};

const productNavigationCopy: Record<SiteLocale, ProductNavigationCopy> =
  withTraditionalChinese({
  zh: {
    products: "产品总览",
    currentProduct: "当前产品",
    ai: "AI 订阅",
    streaming: "流媒体",
    other: "其他",
  },
  en: {
    products: "Products",
    currentProduct: "Current product",
    ai: "AI Subscriptions",
    streaming: "Streaming",
    other: "Other",
  },
  ja: {
    products: "製品一覧",
    currentProduct: "現在の製品",
    ai: "AI サブスクリプション",
    streaming: "ストリーミング",
    other: "その他",
  },
  ko: {
    products: "제품 목록",
    currentProduct: "현재 제품",
    ai: "AI 구독",
    streaming: "스트리밍",
    other: "기타",
  },
  es: {
    products: "Productos",
    currentProduct: "Producto actual",
    ai: "Suscripciones de IA",
    streaming: "Streaming",
    other: "Otros",
  },
  tr: {
    products: "Ürünler",
    currentProduct: "Geçerli ürün",
    ai: "Yapay zekâ abonelikleri",
    streaming: "Dijital yayın",
    other: "Diğer",
  },
  ar: {
    products: "المنتجات",
    currentProduct: "المنتج الحالي",
    ai: "اشتراكات الذكاء الاصطناعي",
    streaming: "خدمات البث",
    other: "أخرى",
  },
  fr: {
    products: "Produits",
    currentProduct: "Produit actuel",
    ai: "Abonnements IA",
    streaming: "Streaming",
    other: "Autres",
  },
  it: {
    products: "Prodotti",
    currentProduct: "Prodotto attuale",
    ai: "Abbonamenti IA",
    streaming: "Streaming",
    other: "Altro",
  },
  de: {
    products: "Produkte",
    currentProduct: "Aktuelles Produkt",
    ai: "KI-Abonnements",
    streaming: "Streaming",
    other: "Weitere",
  },
  pt: {
    products: "Produtos",
    currentProduct: "Produto atual",
    ai: "Assinaturas de IA",
    streaming: "Streaming",
    other: "Outros",
  },
  });

export function getProductNavigationCopy(locale: SiteLocale) {
  return productNavigationCopy[locale];
}

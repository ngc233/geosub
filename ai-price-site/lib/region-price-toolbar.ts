import { getLocalizedRegionName } from "./locale-format.ts";
import type { RegionPrice } from "./public-pricing-model.ts";
import type { PreparedSiteLocale } from "./site-locale.ts";

export type RegionPriceQuickFilter =
  | "all"
  | "belowReference"
  | "trustedTax"
  | "traceableSource";

type ToolbarCopy = {
  toolbarLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  clearSearch: string;
  filtersLabel: string;
  filterLabels: Record<RegionPriceQuickFilter, string>;
  resultCount: (shown: number, total: number) => string;
  noMatches: string;
};

const englishCopy: ToolbarCopy = {
  toolbarLabel: "Price lookup tools",
  searchLabel: "Find a region",
  searchPlaceholder: "Country or region code",
  clearSearch: "Clear region search",
  filtersLabel: "Quick filters",
  filterLabels: {
    all: "All",
    belowReference: "Below reference",
    trustedTax: "High-confidence tax",
    traceableSource: "Traceable source",
  },
  resultCount: (shown, total) => `${shown} of ${total}`,
  noMatches: "No regions match the current search and filter.",
};

const copyByLocale = {
  zh: {
    toolbarLabel: "价格查找工具",
    searchLabel: "查找地区",
    searchPlaceholder: "国家、地区或代码",
    clearSearch: "清除地区查找",
    filtersLabel: "快速筛选",
    filterLabels: {
      all: "全部",
      belowReference: "低于基准",
      trustedTax: "税务高可信",
      traceableSource: "来源可查",
    },
    resultCount: (shown, total) => `显示 ${shown}/${total}`,
    noMatches: "没有符合当前查找和筛选条件的地区。",
  },
  "zh-tw": {
    toolbarLabel: "價格查找工具",
    searchLabel: "查找地區",
    searchPlaceholder: "國家、地區或代碼",
    clearSearch: "清除地區查找",
    filtersLabel: "快速篩選",
    filterLabels: {
      all: "全部",
      belowReference: "低於基準",
      trustedTax: "稅務高可信",
      traceableSource: "來源可查",
    },
    resultCount: (shown, total) => `顯示 ${shown}/${total}`,
    noMatches: "沒有符合目前查找和篩選條件的地區。",
  },
  en: englishCopy,
  ja: {
    toolbarLabel: "料金検索ツール",
    searchLabel: "地域を検索",
    searchPlaceholder: "国名・地域名・コード",
    clearSearch: "地域検索をクリア",
    filtersLabel: "クイックフィルター",
    filterLabels: {
      all: "すべて",
      belowReference: "基準より安い",
      trustedTax: "税情報の信頼度が高い",
      traceableSource: "出典を確認可能",
    },
    resultCount: (shown, total) => `${total}件中${shown}件`,
    noMatches: "現在の検索・絞り込み条件に一致する地域はありません。",
  },
  ko: {
    toolbarLabel: "가격 조회 도구",
    searchLabel: "지역 찾기",
    searchPlaceholder: "국가, 지역 또는 코드",
    clearSearch: "지역 검색 지우기",
    filtersLabel: "빠른 필터",
    filterLabels: {
      all: "전체",
      belowReference: "기준가 미만",
      trustedTax: "세금 정보 신뢰도 높음",
      traceableSource: "출처 확인 가능",
    },
    resultCount: (shown, total) => `${total}개 중 ${shown}개`,
    noMatches: "현재 검색 및 필터 조건에 맞는 지역이 없습니다.",
  },
  es: {
    toolbarLabel: "Herramientas de consulta de precios",
    searchLabel: "Buscar una región",
    searchPlaceholder: "País, región o código",
    clearSearch: "Borrar búsqueda de región",
    filtersLabel: "Filtros rápidos",
    filterLabels: {
      all: "Todos",
      belowReference: "Por debajo de la referencia",
      trustedTax: "Impuestos de alta confianza",
      traceableSource: "Fuente verificable",
    },
    resultCount: (shown, total) => `${shown} de ${total}`,
    noMatches: "No hay regiones que coincidan con la búsqueda y el filtro actuales.",
  },
  tr: {
    toolbarLabel: "Fiyat arama araçları",
    searchLabel: "Bölge ara",
    searchPlaceholder: "Ülke, bölge veya kod",
    clearSearch: "Bölge aramasını temizle",
    filtersLabel: "Hızlı filtreler",
    filterLabels: {
      all: "Tümü",
      belowReference: "Referansın altında",
      trustedTax: "Vergi güveni yüksek",
      traceableSource: "Kaynağı izlenebilir",
    },
    resultCount: (shown, total) => `${total} bölgeden ${shown}`,
    noMatches: "Geçerli arama ve filtreyle eşleşen bölge yok.",
  },
  ar: {
    toolbarLabel: "أدوات البحث عن الأسعار",
    searchLabel: "البحث عن منطقة",
    searchPlaceholder: "الدولة أو المنطقة أو الرمز",
    clearSearch: "مسح بحث المنطقة",
    filtersLabel: "عوامل تصفية سريعة",
    filterLabels: {
      all: "الكل",
      belowReference: "أقل من السعر المرجعي",
      trustedTax: "ضريبة عالية الموثوقية",
      traceableSource: "مصدر قابل للتحقق",
    },
    resultCount: (shown, total) => `${shown} من ${total}`,
    noMatches: "لا توجد مناطق تطابق البحث والتصفية الحاليين.",
  },
  fr: {
    toolbarLabel: "Outils de recherche des prix",
    searchLabel: "Rechercher une région",
    searchPlaceholder: "Pays, région ou code",
    clearSearch: "Effacer la recherche",
    filtersLabel: "Filtres rapides",
    filterLabels: {
      all: "Toutes",
      belowReference: "Sous la référence",
      trustedTax: "Fiscalité très fiable",
      traceableSource: "Source traçable",
    },
    resultCount: (shown, total) => `${shown} sur ${total}`,
    noMatches: "Aucune région ne correspond à la recherche et au filtre actuels.",
  },
  it: {
    toolbarLabel: "Strumenti di ricerca prezzi",
    searchLabel: "Cerca una regione",
    searchPlaceholder: "Paese, regione o codice",
    clearSearch: "Cancella la ricerca",
    filtersLabel: "Filtri rapidi",
    filterLabels: {
      all: "Tutte",
      belowReference: "Sotto il riferimento",
      trustedTax: "Imposte ad alta affidabilità",
      traceableSource: "Fonte tracciabile",
    },
    resultCount: (shown, total) => `${shown} su ${total}`,
    noMatches: "Nessuna regione corrisponde alla ricerca e al filtro correnti.",
  },
  de: {
    toolbarLabel: "Werkzeuge zur Preissuche",
    searchLabel: "Region suchen",
    searchPlaceholder: "Land, Region oder Code",
    clearSearch: "Regionssuche löschen",
    filtersLabel: "Schnellfilter",
    filterLabels: {
      all: "Alle",
      belowReference: "Unter Referenzpreis",
      trustedTax: "Hohe Steuersicherheit",
      traceableSource: "Nachvollziehbare Quelle",
    },
    resultCount: (shown, total) => `${shown} von ${total}`,
    noMatches: "Keine Region entspricht der aktuellen Suche und dem Filter.",
  },
  pt: {
    toolbarLabel: "Ferramentas de pesquisa de preços",
    searchLabel: "Procurar uma região",
    searchPlaceholder: "País, região ou código",
    clearSearch: "Limpar pesquisa de região",
    filtersLabel: "Filtros rápidos",
    filterLabels: {
      all: "Todas",
      belowReference: "Abaixo da referência",
      trustedTax: "Impostos de alta confiança",
      traceableSource: "Fonte rastreável",
    },
    resultCount: (shown, total) => `${shown} de ${total}`,
    noMatches: "Nenhuma região corresponde à pesquisa e ao filtro atuais.",
  },
} satisfies Record<PreparedSiteLocale, ToolbarCopy>;

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .trim();
}

export function matchesRegionPriceQuickFilter(
  region: RegionPrice,
  filter: RegionPriceQuickFilter,
  referencePrice: number,
) {
  if (filter === "belowReference") {
    return referencePrice > 0 && region.priceUsd < referencePrice;
  }

  if (filter === "trustedTax") {
    return region.taxConfidence === "high" && region.taxReviewStatus === "verified";
  }

  if (filter === "traceableSource") {
    return Boolean(region.sourceUrl && region.lastCheckedAt);
  }

  return true;
}

export function matchesRegionPriceSearch(
  region: RegionPrice,
  query: string,
  locale: PreparedSiteLocale,
) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return true;

  const localizedCountry = getLocalizedRegionName(region.code, locale) || "";
  const searchableValues = [
    localizedCountry,
    region.country,
    region.code,
    region.currencyCode || "",
    region.localPrice,
  ];

  return searchableValues.some((value) =>
    normalizeSearchValue(value).includes(normalizedQuery),
  );
}

export function filterRegionPrices({
  regions,
  query,
  filter,
  referencePrice,
  locale,
}: {
  regions: RegionPrice[];
  query: string;
  filter: RegionPriceQuickFilter;
  referencePrice: number;
  locale: PreparedSiteLocale;
}) {
  return regions.filter(
    (region) =>
      matchesRegionPriceSearch(region, query, locale) &&
      matchesRegionPriceQuickFilter(region, filter, referencePrice),
  );
}

export function getRegionPriceToolbarCopy(locale: PreparedSiteLocale) {
  return copyByLocale[locale] || englishCopy;
}

import type {
  PreparedSiteLocale,
  SiteLocale,
} from "./site-locale";
import { withTraditionalChinese } from "./traditional-chinese";

type PreparedDetailLocale = PreparedSiteLocale | "de" | "fr";

export type DetailLocale = SiteLocale;

export type DetailModuleKey =
  | "priceOverview"
  | "priceHeatmap"
  | "priceTable"
  | "affordability"
  | "faq";

type DetailCopyInput = {
  productName?: string;
  planName?: string;
};

type DetailModuleCopy = {
  title: string;
  description?: string;
};

type DetailCopyTemplate = Record<
  DetailModuleKey,
  {
    title: string;
    description?: string;
  }
>;

const detailCopyTemplates = withTraditionalChinese({
  zh: {
    priceOverview: {
      title: "{planName} 全球价格分布概览",
      description:
        "快速查看当前套餐在不同国家和地区的价格区间、最低价、最高价和相对差异。",
    },
    priceHeatmap: {
      title: "{planName} 全球价格热力图",
      description:
        "基于国家和地区的分级设色图，颜色越绿表示相对便宜，黄色接近基准，红色表示相对更贵；点击或悬停国家可查看具体价格。",
    },
    priceTable: {
      title: "{planName} 地区价格明细表",
      description:
        "按国家和地区展示本地价格、美元折算价、税费说明和相对美国基准的差异。",
    },
    affordability: {
      title: "{productName} 本地购买力对比",
      description:
        "同一订阅价格在不同收入水平地区的实际负担不同，本模块用于观察价格和本地购买力之间的关系。",
    },
    faq: {
      title: "常见问题",
    },
  },

  en: {
    priceOverview: {
      title: "{planName} global price overview",
      description:
        "A quick summary of the lowest price, highest price, price spread, and regional differences for this plan.",
    },
    priceHeatmap: {
      title: "{planName} global price heatmap",
      description:
        "A country-level choropleth map showing relative subscription prices. Green means cheaper, yellow is close to the benchmark, and red means more expensive.",
    },
    priceTable: {
      title: "{planName} regional price table",
      description:
        "A detailed regional table with local price, USD equivalent, tax notes, and the difference from the US benchmark.",
    },
    affordability: {
      title: "{productName} local affordability comparison",
      description:
        "The same subscription price can feel different across income levels. This section compares pricing against local affordability.",
    },
    faq: {
      title: "Frequently asked questions",
    },
  },

  es: {
    priceOverview: {
      title: "Resumen global de precios de {planName}",
      description:
        "Un resumen rápido del precio mínimo, precio máximo, diferencia regional y distribución global de este plan.",
    },
    priceHeatmap: {
      title: "Mapa de calor global de precios de {planName}",
      description:
        "Mapa coroplético por país y región. El verde indica precios más bajos, el amarillo precios cercanos a la referencia y el rojo precios más altos.",
    },
    priceTable: {
      title: "Tabla de precios regionales de {planName}",
      description:
        "Detalle por país y región con precio local, equivalencia en USD, impuestos y diferencia frente a la referencia.",
    },
    affordability: {
      title: "Comparación de asequibilidad local de {productName}",
      description:
        "El mismo precio de suscripción puede representar una carga distinta según el nivel de ingresos local.",
    },
    faq: {
      title: "Preguntas frecuentes",
    },
  },

  ja: {
    priceOverview: {
      title: "{planName} 世界価格の概要",
      description:
        "このプランの最安値、最高値、地域ごとの価格差をすばやく確認できます。",
    },
    priceHeatmap: {
      title: "{planName} 世界価格ヒートマップ",
      description:
        "国や地域ごとの価格差を色で比較できます。緑は割安、黄色は基準に近い価格、赤は割高を示します。",
    },
    priceTable: {
      title: "{planName} 地域別価格表",
      description:
        "国や地域ごとの現地価格、USD換算、税金情報、基準価格との差を表示します。",
    },
    affordability: {
      title: "{productName} 現地購買力比較",
      description:
        "同じサブスクリプション価格でも、地域の所得水準によって実質的な負担は異なります。",
    },
    faq: {
      title: "よくある質問",
    },
  },

  ko: {
    priceOverview: {
      title: "{planName} 글로벌 가격 분포 개요",
      description:
        "이 요금제의 최저가, 최고가, 지역별 가격 차이를 빠르게 확인합니다.",
    },
    priceHeatmap: {
      title: "{planName} 글로벌 가격 히트맵",
      description:
        "국가와 지역별 가격 차이를 색상으로 보여주는 지도입니다. 초록색은 저렴함, 노란색은 기준에 가까움, 빨간색은 더 비쌈을 의미합니다.",
    },
    priceTable: {
      title: "{planName} 지역별 가격 상세표",
      description:
        "국가와 지역별 현지 가격, USD 환산가, 세금 정보, 기준 가격 대비 차이를 확인할 수 있습니다.",
    },
    affordability: {
      title: "{productName} 현지 구매력 비교",
      description:
        "같은 구독 가격도 지역의 소득 수준에 따라 실제 부담이 달라질 수 있습니다.",
    },
    faq: {
      title: "자주 묻는 질문",
    },
  },

  tr: {
    priceOverview: {
      title: "{planName} dünya geneli fiyat özeti",
      description:
        "Bu paketin en düşük ve en yüksek fiyatını, fiyat aralığını ve bölgesel farklarını tek bakışta inceleyin.",
    },
    priceHeatmap: {
      title: "{planName} dünya geneli fiyat haritası",
      description:
        "Ülke ve bölgelere göre göreli abonelik fiyatlarını gösterir. Yeşil daha uygun, sarı referansa yakın, kırmızı ise daha pahalı fiyatları belirtir.",
    },
    priceTable: {
      title: "{planName} bölgesel fiyat tablosu",
      description:
        "Yerel fiyatı, USD karşılığını, vergi notlarını ve ABD referans fiyatına göre farkı ülke ve bölge bazında karşılaştırın.",
    },
    affordability: {
      title: "{productName} yerel satın alma gücü karşılaştırması",
      description:
        "Aynı abonelik ücreti, yerel gelir düzeyine göre farklı bir yük oluşturabilir. Bu bölüm fiyatı yerel satın alma gücüyle birlikte değerlendirir.",
    },
    faq: {
      title: "Sık sorulan sorular",
    },
  },

  de: {
    priceOverview: {
      title: "{planName} globale Preisübersicht",
      description:
        "Eine kompakte Übersicht über niedrigste, höchste und regionale Preisunterschiede dieses Plans.",
    },
    priceHeatmap: {
      title: "{planName} globale Preis-Heatmap",
      description:
        "Eine länderbasierte Choroplethenkarte für relative Abo-Preise. Grün steht für günstiger, Gelb für nahe am Referenzpreis und Rot für teurer.",
    },
    priceTable: {
      title: "{planName} regionale Preistabelle",
      description:
        "Regionale Details mit lokalem Preis, USD-Umrechnung, Steuerhinweisen und Abweichung vom Referenzpreis.",
    },
    affordability: {
      title: "{productName} Vergleich der lokalen Erschwinglichkeit",
      description:
        "Der gleiche Abo-Preis kann je nach lokalem Einkommensniveau unterschiedlich stark belasten.",
    },
    faq: {
      title: "Häufige Fragen",
    },
  },

  fr: {
    priceOverview: {
      title: "Aperçu mondial des prix {planName}",
      description:
        "Un résumé rapide du prix le plus bas, du prix le plus élevé et des écarts régionaux pour cette offre.",
    },
    priceHeatmap: {
      title: "Carte thermique mondiale des prix {planName}",
      description:
        "Une carte choroplèthe par pays et région. Le vert indique un prix plus bas, le jaune un prix proche de la référence et le rouge un prix plus élevé.",
    },
    priceTable: {
      title: "Tableau des prix régionaux {planName}",
      description:
        "Détail par pays et région avec prix local, équivalent USD, taxes et écart par rapport à la référence.",
    },
    affordability: {
      title: "Comparaison du pouvoir d’achat local pour {productName}",
      description:
        "Un même prix d’abonnement peut représenter une charge différente selon le niveau de revenu local.",
    },
    faq: {
      title: "Questions fréquentes",
    },
  },
  it: {
    priceOverview: { title: "Panoramica mondiale dei prezzi di {planName}", description: "Un riepilogo dei prezzi minimi, massimi e delle differenze regionali per questo piano." },
    priceHeatmap: { title: "Mappa mondiale dei prezzi di {planName}", description: "Una mappa per paese e regione: verde indica prezzi più bassi, giallo valori vicini al riferimento e rosso prezzi più alti." },
    priceTable: { title: "Tabella dei prezzi regionali di {planName}", description: "Dettagli per paese e regione con prezzo locale, equivalente in dollari, imposte e differenza dal riferimento." },
    affordability: { title: "Confronto del potere d’acquisto locale per {productName}", description: "Lo stesso prezzo può avere un peso diverso a seconda del livello di reddito locale." },
    faq: { title: "Domande frequenti" },
  },
  pt: {
    priceOverview: { title: "Visão global dos preços de {planName}", description: "Um resumo dos preços mínimo e máximo e das diferenças regionais deste plano." },
    priceHeatmap: { title: "Mapa mundial dos preços de {planName}", description: "Um mapa por país e região: verde indica preços mais baixos, amarelo valores próximos da referência e vermelho preços mais altos." },
    priceTable: { title: "Tabela de preços regionais de {planName}", description: "Detalhes por país e região com preço local, equivalente em dólares, impostos e diferença face à referência." },
    affordability: { title: "Comparação do poder de compra local para {productName}", description: "O mesmo preço pode representar um peso diferente consoante o nível de rendimento local." },
    faq: { title: "Perguntas frequentes" },
  },

  ar: {
    priceOverview: {
      title: "نظرة عامة على الأسعار العالمية لخطة {planName}",
      description:
        "ملخص سريع لأدنى سعر وأعلى سعر والفروقات الإقليمية لهذه الخطة.",
    },
    priceHeatmap: {
      title: "خريطة حرارية عالمية لأسعار {planName}",
      description:
        "خريطة تلوين حسب الدولة والمنطقة لعرض فروقات الأسعار. الأخضر يعني أرخص، والأصفر قريب من السعر المرجعي، والأحمر أغلى.",
    },
    priceTable: {
      title: "جدول الأسعار الإقليمية لخطة {planName}",
      description:
        "تفاصيل حسب الدولة والمنطقة تشمل السعر المحلي، ما يعادله بالدولار، الضرائب، والفارق عن السعر المرجعي.",
    },
    affordability: {
      title: "مقارنة القدرة الشرائية المحلية لـ {productName}",
      description:
        "قد يختلف عبء نفس سعر الاشتراك حسب مستوى الدخل المحلي في كل منطقة.",
    },
    faq: {
      title: "الأسئلة الشائعة",
    },
  },
  } satisfies Record<
    Exclude<PreparedDetailLocale, "zh-tw">,
    DetailCopyTemplate
  >);

function fillTemplate(template: string, input: DetailCopyInput) {
  return template
    .replaceAll("{productName}", input.productName || "")
    .replaceAll("{planName}", input.planName || "");
}

export function getDetailModuleCopy(
  locale: DetailLocale,
  key: DetailModuleKey,
  input: DetailCopyInput = {}
): DetailModuleCopy {
  const templates = detailCopyTemplates[locale];
  const item: { title: string; description?: string } = templates[key];

  return {
    title: fillTemplate(item.title, input).trim(),
    description: item.description
      ? fillTemplate(item.description, input).trim()
      : undefined,
  };
}

export function getDetailPageCopy(locale: DetailLocale, input: DetailCopyInput) {
  return {
    priceOverview: getDetailModuleCopy(locale, "priceOverview", input),
    priceHeatmap: getDetailModuleCopy(locale, "priceHeatmap", input),
    priceTable: getDetailModuleCopy(locale, "priceTable", input),
    affordability: getDetailModuleCopy(locale, "affordability", input),
    faq: getDetailModuleCopy(locale, "faq", input),
  };
}
export type DetailMapCopy = {
  currentBenchmark: string;
  covered: string;
  none: string;
  regionsSuffix: string;
  noUsBenchmarkNotice: string;
  zoomOutAria: string;
  resetAria: string;
  zoomInAria: string;
  mapAria: (planName: string) => string;
  noPriceData: string;
  sameAsBenchmark: string;
  moreExpensive: (percent: number) => string;
  cheaper: (percent: number) => string;
  localPrice: string;
  tax: string;
  noRegionPrice: string;
  cheaperLegend: string;
  benchmarkLegend: string;
  expensiveLegend: string;
  lowest: string;
  highest: string;
  reference: string;
  recorded: string;
  closeDetail: string;
  perMonth: string;
};

const detailMapCopy = withTraditionalChinese({
  zh: {
    currentBenchmark: "当前基准",
    covered: "已覆盖",
    none: "暂无",
    regionsSuffix: "个地区",
    noUsBenchmarkNotice:
      "当前套餐暂缺美国价格，地图使用已收录的最低价地区作为比较基准，并在图中明确标注。",
    zoomOutAria: "缩小地图",
    resetAria: "重置地图",
    zoomInAria: "放大地图",
    mapAria: (planName) => `${planName} 全球价格热力图`,
    noPriceData: "暂无价格数据",
    sameAsBenchmark: "与基准价格相同",
    moreExpensive: (percent) => `比基准贵 ${percent}%`,
    cheaper: (percent) => `比基准便宜 ${Math.abs(percent)}%`,
    localPrice: "本地价格",
    tax: "税费",
    noRegionPrice: "当前暂无该地区价格数据。",
    cheaperLegend: "更便宜",
    benchmarkLegend: "接近基准",
    expensiveLegend: "更贵",
    lowest: "当前最低价",
    highest: "当前最高价",
    reference: "当前基准",
    recorded: "已收录地区",
    closeDetail: "关闭地图详情",
    perMonth: "/mo",
  },

  en: {
    currentBenchmark: "Benchmark",
    covered: "Covered",
    none: "N/A",
    regionsSuffix: "regions",
    noUsBenchmarkNotice:
      "US pricing is not available for this plan yet, so the map temporarily uses the lowest-priced region as the benchmark. Once US data is added, the benchmark will switch to the United States automatically.",
    zoomOutAria: "Zoom out map",
    resetAria: "Reset map",
    zoomInAria: "Zoom in map",
    mapAria: (planName) => `${planName} global price heatmap`,
    noPriceData: "No price data",
    sameAsBenchmark: "Same as benchmark",
    moreExpensive: (percent) => `${percent}% above benchmark`,
    cheaper: (percent) => `${Math.abs(percent)}% below benchmark`,
    localPrice: "Local price",
    tax: "Tax",
    noRegionPrice: "No price data is available for this region yet.",
    cheaperLegend: "Cheaper",
    benchmarkLegend: "Near benchmark",
    expensiveLegend: "More expensive",
    lowest: "Lowest price",
    highest: "Highest price",
    reference: "Benchmark",
    recorded: "Tracked region",
    closeDetail: "Close map detail",
    perMonth: "/mo",
  },

  es: {
    currentBenchmark: "Referencia",
    covered: "Cobertura",
    none: "N/D",
    regionsSuffix: "regiones",
    noUsBenchmarkNotice:
      "Este plan aún no tiene precio de Estados Unidos. El mapa usa temporalmente la región más barata como referencia.",
    zoomOutAria: "Alejar mapa",
    resetAria: "Restablecer mapa",
    zoomInAria: "Acercar mapa",
    mapAria: (planName) => `Mapa de calor global de precios de ${planName}`,
    noPriceData: "Sin datos de precio",
    sameAsBenchmark: "Igual que la referencia",
    moreExpensive: (percent) => `${percent}% por encima de la referencia`,
    cheaper: (percent) => `${Math.abs(percent)}% por debajo de la referencia`,
    localPrice: "Precio local",
    tax: "Impuestos",
    noRegionPrice: "Aún no hay datos de precio para esta región.",
    cheaperLegend: "Más barato",
    benchmarkLegend: "Cerca de la referencia",
    expensiveLegend: "Más caro",
    lowest: "Precio más bajo",
    highest: "Precio más alto",
    reference: "Referencia",
    recorded: "Región registrada",
    closeDetail: "Cerrar detalle del mapa",
    perMonth: "/mes",
  },

  ja: {
    currentBenchmark: "基準価格",
    covered: "収録地域",
    none: "なし",
    regionsSuffix: "地域",
    noUsBenchmarkNotice:
      "このプランはまだ米国価格が登録されていないため、暫定的に最安地域を基準にしています。",
    zoomOutAria: "地図を縮小",
    resetAria: "地図をリセット",
    zoomInAria: "地図を拡大",
    mapAria: (planName) => `${planName} 世界価格ヒートマップ`,
    noPriceData: "価格データなし",
    sameAsBenchmark: "基準価格と同じ",
    moreExpensive: (percent) => `基準より ${percent}% 高い`,
    cheaper: (percent) => `基準より ${Math.abs(percent)}% 安い`,
    localPrice: "現地価格",
    tax: "税金",
    noRegionPrice: "この地域の価格データはまだありません。",
    cheaperLegend: "割安",
    benchmarkLegend: "基準に近い",
    expensiveLegend: "割高",
    lowest: "最安値",
    highest: "最高値",
    reference: "基準価格",
    recorded: "収録地域",
    closeDetail: "地図詳細を閉じる",
    perMonth: "/月",
  },

  ko: {
    currentBenchmark: "기준 가격",
    covered: "수록 지역",
    none: "없음",
    regionsSuffix: "개 지역",
    noUsBenchmarkNotice:
      "이 요금제는 아직 미국 가격이 없어 현재 최저가 지역을 임시 기준으로 사용합니다.",
    zoomOutAria: "지도 축소",
    resetAria: "지도 초기화",
    zoomInAria: "지도 확대",
    mapAria: (planName) => `${planName} 글로벌 가격 히트맵`,
    noPriceData: "가격 데이터 없음",
    sameAsBenchmark: "기준 가격과 동일",
    moreExpensive: (percent) => `기준보다 ${percent}% 비쌈`,
    cheaper: (percent) => `기준보다 ${Math.abs(percent)}% 저렴`,
    localPrice: "현지 가격",
    tax: "세금",
    noRegionPrice: "이 지역의 가격 데이터가 아직 없습니다.",
    cheaperLegend: "저렴함",
    benchmarkLegend: "기준에 가까움",
    expensiveLegend: "비쌈",
    lowest: "최저가",
    highest: "최고가",
    reference: "기준 가격",
    recorded: "수록 지역",
    closeDetail: "지도 상세 닫기",
    perMonth: "/월",
  },

  tr: {
    currentBenchmark: "Referans fiyat",
    covered: "Kapsanan",
    none: "Yok",
    regionsSuffix: "bölge",
    noUsBenchmarkNotice:
      "Bu paket için henüz ABD fiyatı bulunmuyor. Harita geçici olarak en düşük fiyatlı bölgeyi referans alır; ABD verisi eklendiğinde referans otomatik olarak güncellenir.",
    zoomOutAria: "Haritayı uzaklaştır",
    resetAria: "Haritayı sıfırla",
    zoomInAria: "Haritayı yakınlaştır",
    mapAria: (planName) => `${planName} dünya geneli fiyat haritası`,
    noPriceData: "Fiyat verisi yok",
    sameAsBenchmark: "Referans fiyatla aynı",
    moreExpensive: (percent) => `Referanstan %${percent} daha pahalı`,
    cheaper: (percent) => `Referanstan %${Math.abs(percent)} daha ucuz`,
    localPrice: "Yerel fiyat",
    tax: "Vergi",
    noRegionPrice: "Bu bölge için henüz fiyat verisi bulunmuyor.",
    cheaperLegend: "Daha ucuz",
    benchmarkLegend: "Referansa yakın",
    expensiveLegend: "Daha pahalı",
    lowest: "En düşük fiyat",
    highest: "En yüksek fiyat",
    reference: "Referans fiyat",
    recorded: "İzlenen bölge",
    closeDetail: "Harita ayrıntısını kapat",
    perMonth: "/ay",
  },

  de: {
    currentBenchmark: "Referenz",
    covered: "Abgedeckt",
    none: "Keine Angabe",
    regionsSuffix: "Regionen",
    noUsBenchmarkNotice:
      "Für diesen Plan ist noch kein US-Preis verfügbar. Die Karte nutzt vorübergehend die günstigste Region als Referenz.",
    zoomOutAria: "Karte verkleinern",
    resetAria: "Karte zurücksetzen",
    zoomInAria: "Karte vergrößern",
    mapAria: (planName) => `${planName} globale Preis-Heatmap`,
    noPriceData: "Keine Preisdaten",
    sameAsBenchmark: "Entspricht der Referenz",
    moreExpensive: (percent) => `${percent}% über Referenz`,
    cheaper: (percent) => `${Math.abs(percent)}% unter Referenz`,
    localPrice: "Lokaler Preis",
    tax: "Steuern",
    noRegionPrice: "Für diese Region sind noch keine Preisdaten verfügbar.",
    cheaperLegend: "Günstiger",
    benchmarkLegend: "Nahe Referenz",
    expensiveLegend: "Teurer",
    lowest: "Niedrigster Preis",
    highest: "Höchster Preis",
    reference: "Referenz",
    recorded: "Erfasste Region",
    closeDetail: "Kartendetail schließen",
    perMonth: "/Monat",
  },

  fr: {
    currentBenchmark: "Référence",
    covered: "Couverture",
    none: "N/D",
    regionsSuffix: "régions",
    noUsBenchmarkNotice:
      "Le prix américain n’est pas encore disponible pour cette offre. La carte utilise temporairement la région la moins chère comme référence.",
    zoomOutAria: "Dézoomer la carte",
    resetAria: "Réinitialiser la carte",
    zoomInAria: "Zoomer la carte",
    mapAria: (planName) => `Carte thermique mondiale des prix ${planName}`,
    noPriceData: "Aucune donnée de prix",
    sameAsBenchmark: "Identique à la référence",
    moreExpensive: (percent) => `${percent}% au-dessus de la référence`,
    cheaper: (percent) => `${Math.abs(percent)}% sous la référence`,
    localPrice: "Prix local",
    tax: "Taxes",
    noRegionPrice: "Aucune donnée de prix n’est encore disponible pour cette région.",
    cheaperLegend: "Moins cher",
    benchmarkLegend: "Proche de la référence",
    expensiveLegend: "Plus cher",
    lowest: "Prix le plus bas",
    highest: "Prix le plus élevé",
    reference: "Référence",
    recorded: "Région suivie",
    closeDetail: "Fermer le détail de la carte",
    perMonth: "/mois",
  },
  it: {
    currentBenchmark: "Riferimento", covered: "Copertura", none: "N/D", regionsSuffix: "regioni",
    noUsBenchmarkNotice: "Il prezzo statunitense non è ancora disponibile per questo piano. La mappa usa temporaneamente la regione meno cara come riferimento.",
    zoomOutAria: "Riduci la mappa", resetAria: "Reimposta la mappa", zoomInAria: "Ingrandisci la mappa",
    mapAria: (p) => `Mappa mondiale dei prezzi di ${p}`, noPriceData: "Nessun dato di prezzo",
    sameAsBenchmark: "Uguale al riferimento", moreExpensive: (p) => `${p}% sopra il riferimento`,
    cheaper: (p) => `${Math.abs(p)}% sotto il riferimento`, localPrice: "Prezzo locale", tax: "Imposte",
    noRegionPrice: "Non sono ancora disponibili prezzi per questa regione.", cheaperLegend: "Più economico",
    benchmarkLegend: "Vicino al riferimento", expensiveLegend: "Più caro", lowest: "Prezzo minimo",
    highest: "Prezzo massimo", reference: "Riferimento", recorded: "Regione rilevata",
    closeDetail: "Chiudi i dettagli della mappa", perMonth: "/mese",
  },
  pt: {
    currentBenchmark: "Referência", covered: "Cobertura", none: "N/D", regionsSuffix: "regiões",
    noUsBenchmarkNotice: "O preço dos EUA ainda não está disponível para este plano. O mapa usa temporariamente a região mais barata como referência.",
    zoomOutAria: "Reduzir o mapa", resetAria: "Repor o mapa", zoomInAria: "Ampliar o mapa",
    mapAria: (p) => `Mapa mundial dos preços de ${p}`, noPriceData: "Sem dados de preço",
    sameAsBenchmark: "Igual à referência", moreExpensive: (p) => `${p}% acima da referência`,
    cheaper: (p) => `${Math.abs(p)}% abaixo da referência`, localPrice: "Preço local", tax: "Impostos",
    noRegionPrice: "Ainda não existem dados de preço para esta região.", cheaperLegend: "Mais barato",
    benchmarkLegend: "Próximo da referência", expensiveLegend: "Mais caro", lowest: "Preço mínimo",
    highest: "Preço máximo", reference: "Referência", recorded: "Região acompanhada",
    closeDetail: "Fechar detalhes do mapa", perMonth: "/mês",
  },

  ar: {
    currentBenchmark: "السعر المرجعي",
    covered: "التغطية",
    none: "غير متاح",
    regionsSuffix: "مناطق",
    noUsBenchmarkNotice:
      "لا يتوفر سعر الولايات المتحدة لهذه الخطة بعد، لذلك تستخدم الخريطة مؤقتًا أرخص منطقة كسعر مرجعي.",
    zoomOutAria: "تصغير الخريطة",
    resetAria: "إعادة ضبط الخريطة",
    zoomInAria: "تكبير الخريطة",
    mapAria: (planName) => `خريطة حرارية عالمية لأسعار ${planName}`,
    noPriceData: "لا توجد بيانات سعر",
    sameAsBenchmark: "مطابق للسعر المرجعي",
    moreExpensive: (percent) => `أعلى من المرجع بنسبة ${percent}%`,
    cheaper: (percent) => `أقل من المرجع بنسبة ${Math.abs(percent)}%`,
    localPrice: "السعر المحلي",
    tax: "الضريبة",
    noRegionPrice: "لا توجد بيانات سعر لهذه المنطقة بعد.",
    cheaperLegend: "أرخص",
    benchmarkLegend: "قريب من المرجع",
    expensiveLegend: "أغلى",
    lowest: "أدنى سعر",
    highest: "أعلى سعر",
    reference: "السعر المرجعي",
    recorded: "منطقة مسجلة",
    closeDetail: "إغلاق تفاصيل الخريطة",
    perMonth: "/شهر",
  },
  } satisfies Record<
    Exclude<PreparedDetailLocale, "zh-tw">,
    DetailMapCopy
  >);

export function getDetailMapCopy(locale: DetailLocale): DetailMapCopy {
  return detailMapCopy[locale];
}
export type DetailTableCopy = {
  rank: string;
  region: string;
  price: string;
  priceHelp: string;
  difference: string;
  differenceHelp: string;
  taxNotes: string;
  taxNotesHelp: string;
  judgement: string;
  judgementHelp: string;
  helpAriaSuffix: string;
  description: (visibleCount: number, totalCount: number) => string;
  totalRegions: (totalCount: number) => string;
  showMore: (count: number) => string;
  collapse: string;
  perMonth: string;
  localApproxPrefix: string;
  sameAsBenchmark: string;
  aboveBenchmark: (percent: number) => string;
  belowBenchmark: (percent: number) => string;
  lowPriceZone: string;
  nearBenchmark: string;
  midHighPrice: string;
  highPriceZone: string;
  friendly: string;
  slightlyHigh: string;
  clearlyHigh: string;
};

const detailTableCopy = withTraditionalChinese({
  zh: {
    rank: "#",
    region: "地区",
    price: "价格",
    priceHelp: "该地区当前收录的订阅价格。主价格为美元折算价，下方为本地币种价格。",
    difference: "较美国",
    differenceHelp: "以美国价格作为基准，展示该地区美元折算价比美国便宜或贵多少。",
    taxNotes: "税费 / 说明",
    taxNotesHelp: "显示该地区税费、VAT、GST 或其他可能影响最终结算价的说明。",
    judgement: "价格判断",
    judgementHelp: "根据相对美国基准价的差异，将地区划分为低价区、接近基准、中高价或高价区。",
    helpAriaSuffix: "说明",
    description: (visibleCount, totalCount) =>
      `按美元折算价从低到高排序。默认展示前 ${Math.min(visibleCount, totalCount)} 个地区。`,
    totalRegions: (totalCount) => `共 ${totalCount} 个地区`,
    showMore: (count) => `显示更多 ${count} 个地区`,
    collapse: "收起地区列表",
    perMonth: "/mo",
    localApproxPrefix: "≈",
    sameAsBenchmark: "与美国相同",
    aboveBenchmark: (percent) => `比美国贵 ${percent}%`,
    belowBenchmark: (percent) => `比美国低 ${Math.abs(percent)}%`,
    lowPriceZone: "低价区",
    nearBenchmark: "接近基准",
    midHighPrice: "中高价",
    highPriceZone: "高价区",
    friendly: "较友好",
    slightlyHigh: "偏高",
    clearlyHigh: "明显偏高",
  },

  en: {
    rank: "#",
    region: "Region",
    price: "Price",
    priceHelp: "The tracked subscription price in this region. The main price is the USD equivalent, with the local currency price below.",
    difference: "Vs US",
    differenceHelp: "Uses the US price as the benchmark and shows how much cheaper or more expensive this region is.",
    taxNotes: "Tax / notes",
    taxNotesHelp: "Shows VAT, GST, tax notes, or other factors that may affect the final checkout price.",
    judgement: "Price judgement",
    judgementHelp: "Classifies each region as low price, near benchmark, mid-high price, or high price based on the US benchmark.",
    helpAriaSuffix: "details",
    description: (visibleCount, totalCount) =>
      `Sorted by USD equivalent from low to high. Showing the first ${Math.min(visibleCount, totalCount)} regions by default.`,
    totalRegions: (totalCount) => `${totalCount} regions`,
    showMore: (count) => `Show ${count} more regions`,
    collapse: "Collapse region list",
    perMonth: "/mo",
    localApproxPrefix: "≈",
    sameAsBenchmark: "Same as US",
    aboveBenchmark: (percent) => `${percent}% above US`,
    belowBenchmark: (percent) => `${Math.abs(percent)}% below US`,
    lowPriceZone: "Low-price zone",
    nearBenchmark: "Near benchmark",
    midHighPrice: "Mid-high price",
    highPriceZone: "High-price zone",
    friendly: "More favorable",
    slightlyHigh: "Slightly high",
    clearlyHigh: "Clearly high",
  },

  es: {
    rank: "#",
    region: "Región",
    price: "Precio",
    priceHelp: "Precio de suscripción registrado en esta región. El precio principal es la equivalencia en USD y debajo aparece el precio local.",
    difference: "Vs EE. UU.",
    differenceHelp: "Usa el precio de Estados Unidos como referencia y muestra si esta región es más barata o más cara.",
    taxNotes: "Impuestos / notas",
    taxNotesHelp: "Muestra IVA, GST, impuestos u otros factores que pueden afectar el precio final.",
    judgement: "Evaluación",
    judgementHelp: "Clasifica cada región según su diferencia frente a la referencia de Estados Unidos.",
    helpAriaSuffix: "detalles",
    description: (visibleCount, totalCount) =>
      `Ordenado por equivalencia en USD de menor a mayor. Se muestran por defecto las primeras ${Math.min(visibleCount, totalCount)} regiones.`,
    totalRegions: (totalCount) => `${totalCount} regiones`,
    showMore: (count) => `Mostrar ${count} regiones más`,
    collapse: "Contraer lista de regiones",
    perMonth: "/mes",
    localApproxPrefix: "≈",
    sameAsBenchmark: "Igual que EE. UU.",
    aboveBenchmark: (percent) => `${percent}% por encima de EE. UU.`,
    belowBenchmark: (percent) => `${Math.abs(percent)}% por debajo de EE. UU.`,
    lowPriceZone: "Zona barata",
    nearBenchmark: "Cerca de referencia",
    midHighPrice: "Precio medio-alto",
    highPriceZone: "Zona cara",
    friendly: "Más favorable",
    slightlyHigh: "Algo alto",
    clearlyHigh: "Claramente alto",
  },

  ja: {
    rank: "#",
    region: "地域",
    price: "価格",
    priceHelp: "この地域で収録されているサブスクリプション価格です。主価格はUSD換算、下に現地通貨価格を表示します。",
    difference: "米国比",
    differenceHelp: "米国価格を基準に、この地域がどれだけ安いか高いかを表示します。",
    taxNotes: "税金 / メモ",
    taxNotesHelp: "VAT、GST、税金、または最終価格に影響する可能性のある情報を表示します。",
    judgement: "価格判断",
    judgementHelp: "米国基準価格との差に基づき、低価格、基準付近、中高価格、高価格に分類します。",
    helpAriaSuffix: "説明",
    description: (visibleCount, totalCount) =>
      `USD換算価格の安い順に並べています。初期表示は上位 ${Math.min(visibleCount, totalCount)} 地域です。`,
    totalRegions: (totalCount) => `${totalCount} 地域`,
    showMore: (count) => `さらに ${count} 地域を表示`,
    collapse: "地域リストを閉じる",
    perMonth: "/月",
    localApproxPrefix: "≈",
    sameAsBenchmark: "米国と同じ",
    aboveBenchmark: (percent) => `米国より ${percent}% 高い`,
    belowBenchmark: (percent) => `米国より ${Math.abs(percent)}% 低い`,
    lowPriceZone: "低価格帯",
    nearBenchmark: "基準付近",
    midHighPrice: "中高価格",
    highPriceZone: "高価格帯",
    friendly: "比較的有利",
    slightlyHigh: "やや高い",
    clearlyHigh: "明らかに高い",
  },

  ko: {
    rank: "#",
    region: "지역",
    price: "가격",
    priceHelp: "이 지역에 수록된 구독 가격입니다. 주요 가격은 USD 환산가이며, 아래에는 현지 통화 가격이 표시됩니다.",
    difference: "미국 대비",
    differenceHelp: "미국 가격을 기준으로 이 지역이 얼마나 저렴하거나 비싼지 보여줍니다.",
    taxNotes: "세금 / 설명",
    taxNotesHelp: "VAT, GST, 세금 또는 최종 결제 가격에 영향을 줄 수 있는 정보를 표시합니다.",
    judgement: "가격 판단",
    judgementHelp: "미국 기준 가격과의 차이에 따라 저가, 기준 근접, 중고가, 고가 지역으로 분류합니다.",
    helpAriaSuffix: "설명",
    description: (visibleCount, totalCount) =>
      `USD 환산가 기준 낮은 가격순으로 정렬했습니다. 기본적으로 상위 ${Math.min(visibleCount, totalCount)}개 지역을 표시합니다.`,
    totalRegions: (totalCount) => `총 ${totalCount}개 지역`,
    showMore: (count) => `${count}개 지역 더 보기`,
    collapse: "지역 목록 접기",
    perMonth: "/월",
    localApproxPrefix: "≈",
    sameAsBenchmark: "미국과 동일",
    aboveBenchmark: (percent) => `미국보다 ${percent}% 비쌈`,
    belowBenchmark: (percent) => `미국보다 ${Math.abs(percent)}% 저렴`,
    lowPriceZone: "저가 지역",
    nearBenchmark: "기준 근접",
    midHighPrice: "중고가",
    highPriceZone: "고가 지역",
    friendly: "비교적 유리",
    slightlyHigh: "다소 높음",
    clearlyHigh: "확실히 높음",
  },

  tr: {
    rank: "#",
    region: "Bölge",
    price: "Fiyat",
    priceHelp:
      "Bu bölgede izlenen abonelik fiyatı. Ana değer USD karşılığıdır; yerel para birimindeki fiyat alt satırda gösterilir.",
    difference: "ABD'ye göre",
    differenceHelp:
      "ABD fiyatını referans alarak bu bölgenin ne kadar ucuz veya pahalı olduğunu gösterir.",
    taxNotes: "Vergi / notlar",
    taxNotesHelp:
      "Nihai ödeme tutarını etkileyebilecek KDV, GST, diğer vergiler ve ek açıklamaları gösterir.",
    judgement: "Fiyat değerlendirmesi",
    judgementHelp:
      "Bölgeleri ABD referans fiyatından sapmalarına göre düşük, referansa yakın, orta-yüksek veya yüksek fiyat olarak sınıflandırır.",
    helpAriaSuffix: "ayrıntıları",
    description: (visibleCount, totalCount) =>
      `USD karşılığına göre düşükten yükseğe sıralanır. İlk ${Math.min(visibleCount, totalCount)} bölge varsayılan olarak gösterilir.`,
    totalRegions: (totalCount) => `Toplam ${totalCount} bölge`,
    showMore: (count) => `${count} bölge daha göster`,
    collapse: "Bölge listesini daralt",
    perMonth: "/ay",
    localApproxPrefix: "≈",
    sameAsBenchmark: "ABD ile aynı",
    aboveBenchmark: (percent) => `ABD'den %${percent} daha pahalı`,
    belowBenchmark: (percent) => `ABD'den %${Math.abs(percent)} daha ucuz`,
    lowPriceZone: "Düşük fiyat",
    nearBenchmark: "Referansa yakın",
    midHighPrice: "Orta-yüksek fiyat",
    highPriceZone: "Yüksek fiyat",
    friendly: "Daha avantajlı",
    slightlyHigh: "Biraz yüksek",
    clearlyHigh: "Belirgin biçimde yüksek",
  },

  de: {
    rank: "#",
    region: "Region",
    price: "Preis",
    priceHelp: "Der erfasste Abo-Preis in dieser Region. Der Hauptpreis ist der USD-Gegenwert, darunter steht der lokale Preis.",
    difference: "Ggü. USA",
    differenceHelp: "Nutzt den US-Preis als Referenz und zeigt, ob diese Region günstiger oder teurer ist.",
    taxNotes: "Steuern / Hinweise",
    taxNotesHelp: "Zeigt VAT, GST, Steuerhinweise oder andere Faktoren, die den Endpreis beeinflussen können.",
    judgement: "Preiseinschätzung",
    judgementHelp: "Ordnet jede Region anhand der Abweichung vom US-Referenzpreis ein.",
    helpAriaSuffix: "Details",
    description: (visibleCount, totalCount) =>
      `Nach USD-Gegenwert von niedrig nach hoch sortiert. Standardmäßig werden die ersten ${Math.min(visibleCount, totalCount)} Regionen angezeigt.`,
    totalRegions: (totalCount) => `${totalCount} Regionen`,
    showMore: (count) => `${count} weitere Regionen anzeigen`,
    collapse: "Regionenliste einklappen",
    perMonth: "/Monat",
    localApproxPrefix: "≈",
    sameAsBenchmark: "Wie USA",
    aboveBenchmark: (percent) => `${percent}% über USA`,
    belowBenchmark: (percent) => `${Math.abs(percent)}% unter USA`,
    lowPriceZone: "Günstige Zone",
    nearBenchmark: "Nahe Referenz",
    midHighPrice: "Mittelhoher Preis",
    highPriceZone: "Hohe Preiszone",
    friendly: "Günstiger",
    slightlyHigh: "Etwas hoch",
    clearlyHigh: "Deutlich hoch",
  },

  fr: {
    rank: "#",
    region: "Région",
    price: "Prix",
    priceHelp: "Prix d’abonnement suivi dans cette région. Le prix principal est l’équivalent USD, avec le prix local en dessous.",
    difference: "Vs États-Unis",
    differenceHelp: "Utilise le prix américain comme référence et indique si cette région est moins chère ou plus chère.",
    taxNotes: "Taxes / notes",
    taxNotesHelp: "Affiche TVA, GST, taxes ou autres éléments pouvant influencer le prix final.",
    judgement: "Évaluation",
    judgementHelp: "Classe chaque région selon son écart par rapport au prix de référence américain.",
    helpAriaSuffix: "détails",
    description: (visibleCount, totalCount) =>
      `Trié par équivalent USD du plus bas au plus haut. Les ${Math.min(visibleCount, totalCount)} premières régions sont affichées par défaut.`,
    totalRegions: (totalCount) => `${totalCount} régions`,
    showMore: (count) => `Afficher ${count} régions de plus`,
    collapse: "Réduire la liste des régions",
    perMonth: "/mois",
    localApproxPrefix: "≈",
    sameAsBenchmark: "Identique aux États-Unis",
    aboveBenchmark: (percent) => `${percent}% au-dessus des États-Unis`,
    belowBenchmark: (percent) => `${Math.abs(percent)}% sous les États-Unis`,
    lowPriceZone: "Zone à bas prix",
    nearBenchmark: "Proche référence",
    midHighPrice: "Prix moyen-haut",
    highPriceZone: "Zone chère",
    friendly: "Plus favorable",
    slightlyHigh: "Un peu élevé",
    clearlyHigh: "Nettement élevé",
  },
  it: {
    rank: "#", region: "Regione", price: "Prezzo",
    priceHelp: "Prezzo dell’abbonamento rilevato nella regione. Il valore principale è l’equivalente in dollari, con il prezzo locale sotto.",
    difference: "Vs Stati Uniti", differenceHelp: "Usa il prezzo statunitense come riferimento e mostra se la regione è più o meno cara.",
    taxNotes: "Imposte / note", taxNotesHelp: "Mostra IVA, GST, imposte o altri elementi che possono influire sul prezzo finale.",
    judgement: "Valutazione", judgementHelp: "Classifica ogni regione in base alla differenza dal prezzo di riferimento statunitense.",
    helpAriaSuffix: "dettagli", description: (v,t) => `Ordinata per equivalente in dollari dal più basso al più alto. Sono mostrate inizialmente ${Math.min(v,t)} regioni.`,
    totalRegions: (t) => `${t} regioni`, showMore: (c) => `Mostra altre ${c} regioni`, collapse: "Riduci l’elenco delle regioni",
    perMonth: "/mese", localApproxPrefix: "≈", sameAsBenchmark: "Uguale agli Stati Uniti",
    aboveBenchmark: (p) => `${p}% sopra gli Stati Uniti`, belowBenchmark: (p) => `${Math.abs(p)}% sotto gli Stati Uniti`,
    lowPriceZone: "Fascia economica", nearBenchmark: "Vicino al riferimento", midHighPrice: "Prezzo medio-alto",
    highPriceZone: "Fascia cara", friendly: "Più conveniente", slightlyHigh: "Leggermente alto", clearlyHigh: "Decisamente alto",
  },
  pt: {
    rank: "#", region: "Região", price: "Preço",
    priceHelp: "Preço da assinatura recolhido na região. O valor principal é o equivalente em dólares, com o preço local por baixo.",
    difference: "Vs EUA", differenceHelp: "Usa o preço dos EUA como referência e mostra se a região é mais barata ou mais cara.",
    taxNotes: "Impostos / notas", taxNotesHelp: "Apresenta IVA, GST, impostos ou outros fatores que podem afetar o preço final.",
    judgement: "Avaliação", judgementHelp: "Classifica cada região segundo a diferença face ao preço de referência dos EUA.",
    helpAriaSuffix: "detalhes", description: (v,t) => `Ordenada pelo equivalente em dólares do mais baixo ao mais alto. São mostradas inicialmente ${Math.min(v,t)} regiões.`,
    totalRegions: (t) => `${t} regiões`, showMore: (c) => `Mostrar mais ${c} regiões`, collapse: "Recolher a lista de regiões",
    perMonth: "/mês", localApproxPrefix: "≈", sameAsBenchmark: "Igual aos EUA",
    aboveBenchmark: (p) => `${p}% acima dos EUA`, belowBenchmark: (p) => `${Math.abs(p)}% abaixo dos EUA`,
    lowPriceZone: "Zona de preço baixo", nearBenchmark: "Próximo da referência", midHighPrice: "Preço médio-alto",
    highPriceZone: "Zona de preço elevado", friendly: "Mais favorável", slightlyHigh: "Ligeiramente elevado", clearlyHigh: "Claramente elevado",
  },

  ar: {
    rank: "#",
    region: "المنطقة",
    price: "السعر",
    priceHelp: "سعر الاشتراك المسجل في هذه المنطقة. السعر الرئيسي هو المعادل بالدولار، ويظهر السعر المحلي أسفله.",
    difference: "مقارنة بأمريكا",
    differenceHelp: "يستخدم سعر الولايات المتحدة كمرجع ويعرض ما إذا كانت هذه المنطقة أرخص أو أغلى.",
    taxNotes: "الضرائب / الملاحظات",
    taxNotesHelp: "يعرض الضرائب أو VAT أو GST أو أي عوامل قد تؤثر في السعر النهائي.",
    judgement: "تقييم السعر",
    judgementHelp: "يصنف المناطق حسب الفارق عن السعر المرجعي في الولايات المتحدة.",
    helpAriaSuffix: "تفاصيل",
    description: (visibleCount, totalCount) =>
      `مرتبة حسب المعادل بالدولار من الأرخص إلى الأغلى. يتم عرض أول ${Math.min(visibleCount, totalCount)} مناطق افتراضيًا.`,
    totalRegions: (totalCount) => `${totalCount} مناطق`,
    showMore: (count) => `عرض ${count} مناطق إضافية`,
    collapse: "طي قائمة المناطق",
    perMonth: "/شهر",
    localApproxPrefix: "≈",
    sameAsBenchmark: "مثل الولايات المتحدة",
    aboveBenchmark: (percent) => `أعلى من الولايات المتحدة بنسبة ${percent}%`,
    belowBenchmark: (percent) => `أقل من الولايات المتحدة بنسبة ${Math.abs(percent)}%`,
    lowPriceZone: "منطقة منخفضة السعر",
    nearBenchmark: "قريب من المرجع",
    midHighPrice: "سعر متوسط مرتفع",
    highPriceZone: "منطقة مرتفعة السعر",
    friendly: "أكثر ملاءمة",
    slightlyHigh: "مرتفع قليلًا",
    clearlyHigh: "مرتفع بوضوح",
  },
  } satisfies Record<
    Exclude<PreparedDetailLocale, "zh-tw">,
    DetailTableCopy
  >);

export function getDetailTableCopy(locale: DetailLocale): DetailTableCopy {
  return detailTableCopy[locale];
}

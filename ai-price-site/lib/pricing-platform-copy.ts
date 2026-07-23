import { getPublicPricingCopy } from "./public-pricing-copy";
import type { SiteLocale } from "./site-locale";
import { toTraditionalChinese } from "./traditional-chinese";

type PricingPlatformCopy = ReturnType<
  typeof getPublicPricingCopy
>["pricing"];

const japanesePricingPlatformCopy: PricingPlatformCopy = {
  appStoreSource: "価格情報元：App Store",
  conclusionTitle: (planName) => `${planName} の世界価格まとめ`,
  conclusion: (source, lowest, highest, spread) =>
    `${source} の公式価格では、${lowest}が最安、${highest}が最高で、価格差は約${spread}%です。`,
  conclusionLead: (source, country) =>
    `${source} の公式価格では、${country}が最安で約`,
  conclusionMiddle: (country) => `、${country}が最高で約`,
  conclusionSpread: (spread) => `、価格差は約${spread}%です。`,
  pageUpdated: (date) => `ページ更新：${date}`,
  regionCount: (count) => `${count}地域`,
  displayCurrency: "表示通貨",
  officialWebPricing: "公式サイト価格",
  allDiagnosticSources: "すべての価格情報元",
  allSources: "すべての情報元",
  webLead: "公式サイト価格",
  googlePlayLead: "Google Play 価格",
  allDiagnostics: "その他の情報元",
  cnyLabel: "人民元（CNY）",
  usdLabel: "米ドル（USD）",
  monthlySuffix: "/月",
  cnyUnavailable: "人民元換算は現在利用できません：為替レートを同期中です",
  cnyStale: "人民元換算を一時停止しています：為替レートが古くなっています",
  synced: (date) => `同期日 ${date}`,
  rateBasis: (date) => `為替基準日 ${date}`,
  cnyRate: (rate) => `1米ドル＝${rate.toFixed(4)}人民元で換算`,
  lowest: "最安",
  highest: "最高",
  usBase: "米国基準",
  regions: "対象地域",
  source: "情報元",
  latestCollection: "最終取得",
  fxBasis: "為替基準日",
  planReview: "プラン確認",
  trustStatus: "信頼性",
  verified: "確認済み",
  reviewed: "審査済み",
  needsReview: "要確認",
  unavailable: "利用不可",
  distributionEyebrow: "価格分布",
  distributionTitle: "世界の価格分布と地域ランキング",
  distributionDescription: (productName) =>
    `地図で${productName}の地域別価格差を確認し、一覧で安い地域と高い地域を比較できます。`,
  lowerRegions: "価格が安い地域",
  higherRegions: "価格が高い地域",
  noPrices: (source) => `${source}の価格情報はまだありません`,
  noPricesDescription:
    "比較に必要な確認済み価格が不足しているため、価格分布、ランキング、地域別一覧は表示していません。",
};

const koreanPricingPlatformCopy: PricingPlatformCopy = {
  appStoreSource: "가격 출처: App Store",
  conclusionTitle: (planName) => `${planName} 전 세계 가격 요약`,
  conclusion: (source, lowest, highest, spread) =>
    `${source} 공식 가격 기준으로 최저가는 ${lowest}, 최고가는 ${highest}이며 가격 차이는 약 ${spread}%입니다.`,
  conclusionLead: (source, country) =>
    `${source} 공식 가격 기준으로 최저가는 ${country}로 약 `,
  conclusionMiddle: (country) => `, 최고가는 ${country}로 약 `,
  conclusionSpread: (spread) => `이며, 가격 차이는 약 ${spread}%입니다.`,
  pageUpdated: (date) => `페이지 업데이트: ${date}`,
  regionCount: (count) => `${count}개 지역`,
  displayCurrency: "표시 통화",
  officialWebPricing: "공식 웹사이트 가격",
  allDiagnosticSources: "모든 가격 출처",
  allSources: "모든 출처",
  webLead: "공식 웹사이트 가격",
  googlePlayLead: "Google Play 가격",
  allDiagnostics: "기타 출처",
  cnyLabel: "중국 위안(CNY)",
  usdLabel: "미국 달러(USD)",
  monthlySuffix: "/월",
  cnyUnavailable: "위안화 환산을 준비 중입니다: 환율을 동기화하고 있습니다",
  cnyStale: "위안화 환산이 일시 중단되었습니다: 환율 정보가 오래되었습니다",
  synced: (date) => `동기화일 ${date}`,
  rateBasis: (date) => `환율 기준일 ${date}`,
  cnyRate: (rate) => `1달러 = ${rate.toFixed(4)}위안 기준`,
  lowest: "최저가",
  highest: "최고가",
  usBase: "미국 기준",
  regions: "대상 지역",
  source: "출처",
  latestCollection: "최근 수집",
  fxBasis: "환율 기준일",
  planReview: "요금제 확인",
  trustStatus: "신뢰도",
  verified: "확인됨",
  reviewed: "검토됨",
  needsReview: "확인 필요",
  unavailable: "이용 불가",
  distributionEyebrow: "가격 분포",
  distributionTitle: "전 세계 가격 분포와 지역 순위",
  distributionDescription: (productName) =>
    `지도에서 ${productName}의 지역별 가격 차이를 확인하고, 저렴한 지역과 비싼 지역을 비교해 보세요.`,
  lowerRegions: "가격이 저렴한 지역",
  higherRegions: "가격이 비싼 지역",
  noPrices: (source) => `${source} 가격 정보가 아직 없습니다`,
  noPricesDescription:
    "비교에 필요한 확인된 가격이 부족하여 가격 분포, 순위와 지역별 목록을 표시하지 않습니다.",
};

const spanishPricingPlatformCopy: PricingPlatformCopy = {
  appStoreSource: "Fuente del precio: App Store",
  conclusionTitle: (planName) => `Resumen mundial de precios de ${planName}`,
  conclusion: (source, lowest, highest, spread) =>
    `Según los precios oficiales de ${source}, el mínimo está en ${lowest}, el máximo en ${highest} y la diferencia es de aproximadamente un ${spread}%.`,
  conclusionLead: (source, country) =>
    `Según los precios oficiales de ${source}, el mínimo está en ${country}, con unos `,
  conclusionMiddle: (country) => `, y el máximo en ${country}, con unos `,
  conclusionSpread: (spread) =>
    `; la diferencia es de aproximadamente un ${spread}%.`,
  pageUpdated: (date) => `Página actualizada: ${date}`,
  regionCount: (count) => `${count} regiones`,
  displayCurrency: "Moneda mostrada",
  officialWebPricing: "Precio del sitio oficial",
  allDiagnosticSources: "Todas las fuentes de precios",
  allSources: "Todas las fuentes",
  webLead: "Precio del sitio oficial",
  googlePlayLead: "Precio de Google Play",
  allDiagnostics: "Otras fuentes",
  cnyLabel: "Yuan chino (CNY)",
  usdLabel: "Dólar estadounidense (USD)",
  monthlySuffix: "/mes",
  cnyUnavailable:
    "La conversión a CNY no está disponible mientras se sincroniza el tipo de cambio",
  cnyStale:
    "La conversión a CNY está pausada porque el tipo de cambio no está actualizado",
  synced: (date) => `Sincronizado el ${date}`,
  rateBasis: (date) => `Tipo de cambio del ${date}`,
  cnyRate: (rate) => `Conversión: 1 USD = ${rate.toFixed(4)} CNY`,
  lowest: "Mínimo",
  highest: "Máximo",
  usBase: "Referencia de EE. UU.",
  regions: "Regiones cubiertas",
  source: "Fuente",
  latestCollection: "Última recopilación",
  fxBasis: "Fecha del tipo de cambio",
  planReview: "Revisión del plan",
  trustStatus: "Fiabilidad",
  verified: "Verificado",
  reviewed: "Revisado",
  needsReview: "Requiere revisión",
  unavailable: "No disponible",
  distributionEyebrow: "Distribución de precios",
  distributionTitle: "Distribución mundial y clasificación regional",
  distributionDescription: (productName) =>
    `Consulta en el mapa las diferencias regionales de ${productName} y compara las regiones más baratas y más caras.`,
  lowerRegions: "Regiones con precios más bajos",
  higherRegions: "Regiones con precios más altos",
  noPrices: (source) => `Aún no hay precios de ${source}`,
  noPricesDescription:
    "No hay suficientes precios verificados para mostrar la distribución, la clasificación y la lista regional.",
};

const turkishPricingPlatformCopy: PricingPlatformCopy = {
  appStoreSource: "Fiyat kaynağı: App Store",
  conclusionTitle: (planName) => `${planName} dünya geneli fiyat özeti`,
  conclusion: (source, lowest, highest, spread) =>
    `${source} resmî fiyatlarına göre en düşük fiyat ${lowest}, en yüksek fiyat ${highest}; aradaki fark yaklaşık %${spread}.`,
  conclusionLead: (source, country) =>
    `${source} resmî fiyatlarına göre en düşük fiyat ${country} bölgesinde, yaklaşık `,
  conclusionMiddle: (country) =>
    `; en yüksek fiyat ise ${country} bölgesinde, yaklaşık `,
  conclusionSpread: (spread) => `. Aradaki fark yaklaşık %${spread}.`,
  pageUpdated: (date) => `Sayfa güncelleme tarihi: ${date}`,
  regionCount: (count) => `${count} bölge`,
  displayCurrency: "Görüntülenen para birimi",
  officialWebPricing: "Resmî site fiyatı",
  allDiagnosticSources: "Tüm fiyat kaynakları",
  allSources: "Tüm kaynaklar",
  webLead: "Resmî site fiyatı",
  googlePlayLead: "Google Play fiyatı",
  allDiagnostics: "Diğer kaynaklar",
  cnyLabel: "Çin yuanı (CNY)",
  usdLabel: "ABD doları (USD)",
  monthlySuffix: "/ay",
  cnyUnavailable:
    "Döviz kuru eşitlenirken CNY karşılığı geçici olarak kullanılamıyor",
  cnyStale:
    "Döviz kuru güncel olmadığı için CNY karşılığı geçici olarak durduruldu",
  synced: (date) => `Eşitleme tarihi: ${date}`,
  rateBasis: (date) => `Döviz kuru tarihi: ${date}`,
  cnyRate: (rate) => `Dönüşüm: 1 USD = ${rate.toFixed(4)} CNY`,
  lowest: "En düşük",
  highest: "En yüksek",
  usBase: "ABD referansı",
  regions: "Kapsanan bölgeler",
  source: "Kaynak",
  latestCollection: "Son fiyat toplama",
  fxBasis: "Döviz kuru tarihi",
  planReview: "Paket inceleme tarihi",
  trustStatus: "Güven durumu",
  verified: "Doğrulandı",
  reviewed: "İncelendi",
  needsReview: "İnceleme gerekiyor",
  unavailable: "Kullanılamıyor",
  distributionEyebrow: "Fiyat dağılımı",
  distributionTitle: "Dünya geneli fiyat dağılımı ve bölge sıralaması",
  distributionDescription: (productName) =>
    `${productName} için bölgesel fiyat farklarını haritada inceleyin; en ucuz ve en pahalı bölgeleri karşılaştırın.`,
  lowerRegions: "En düşük fiyatlı bölgeler",
  higherRegions: "En yüksek fiyatlı bölgeler",
  noPrices: (source) => `${source} için henüz fiyat bulunmuyor`,
  noPricesDescription:
    "Fiyat dağılımını, sıralamayı ve bölge listesini göstermek için yeterli sayıda doğrulanmış fiyat bulunmuyor.",
};

const arabicPricingPlatformCopy: PricingPlatformCopy = {
  appStoreSource: "مصدر السعر: App Store",
  conclusionTitle: (planName) => `ملخص أسعار ${planName} حول العالم`,
  conclusion: (source, lowest, highest, spread) =>
    `وفق الأسعار الرسمية في ${source}، يوجد أدنى سعر في ${lowest} وأعلى سعر في ${highest}، بفارق يقارب ${spread}٪.`,
  conclusionLead: (source, country) =>
    `وفق الأسعار الرسمية في ${source}، يوجد أدنى سعر في ${country} بنحو `,
  conclusionMiddle: (country) => `، وأعلى سعر في ${country} بنحو `,
  conclusionSpread: (spread) => `، بفارق يقارب ${spread}٪.`,
  pageUpdated: (date) => `تاريخ تحديث الصفحة: ${date}`,
  regionCount: (count) => `${count} منطقة`,
  displayCurrency: "عملة العرض",
  officialWebPricing: "سعر الموقع الرسمي",
  allDiagnosticSources: "جميع مصادر الأسعار",
  allSources: "جميع المصادر",
  webLead: "سعر الموقع الرسمي",
  googlePlayLead: "سعر Google Play",
  allDiagnostics: "مصادر أخرى",
  cnyLabel: "اليوان الصيني (CNY)",
  usdLabel: "الدولار الأمريكي (USD)",
  monthlySuffix: "/شهر",
  cnyUnavailable:
    "التحويل إلى CNY غير متاح مؤقتاً أثناء مزامنة سعر الصرف",
  cnyStale:
    "تم إيقاف التحويل إلى CNY مؤقتاً لأن سعر الصرف غير محدّث",
  synced: (date) => `تاريخ المزامنة: ${date}`,
  rateBasis: (date) => `تاريخ سعر الصرف: ${date}`,
  cnyRate: (rate) => `التحويل: 1 USD = ${rate.toFixed(4)} CNY`,
  lowest: "الأدنى",
  highest: "الأعلى",
  usBase: "مرجع الولايات المتحدة",
  regions: "المناطق المشمولة",
  source: "المصدر",
  latestCollection: "آخر جمع للأسعار",
  fxBasis: "تاريخ سعر الصرف",
  planReview: "تاريخ مراجعة الباقة",
  trustStatus: "حالة الموثوقية",
  verified: "تم التحقق",
  reviewed: "تمت المراجعة",
  needsReview: "تحتاج إلى مراجعة",
  unavailable: "غير متاح",
  distributionEyebrow: "توزيع الأسعار",
  distributionTitle: "توزيع الأسعار عالمياً وترتيب المناطق",
  distributionDescription: (productName) =>
    `استعرض فروق أسعار ${productName} بين المناطق على الخريطة وقارن المناطق الأقل والأعلى سعراً.`,
  lowerRegions: "المناطق الأقل سعراً",
  higherRegions: "المناطق الأعلى سعراً",
  noPrices: (source) => `لا توجد أسعار متاحة من ${source} حتى الآن`,
  noPricesDescription:
    "لا تتوفر أسعار موثقة كافية لعرض التوزيع والترتيب وقائمة المناطق.",
};

const frenchPricingPlatformCopy: PricingPlatformCopy = {
  appStoreSource: "Source du prix : App Store", conclusionTitle: (p) => `Synthèse mondiale des prix de ${p}`,
  conclusion: (s,l,h,d) => `Selon les prix officiels de ${s}, le minimum est ${l}, le maximum ${h}, soit un écart d’environ ${d} %.`,
  conclusionLead: (s,c) => `Selon les prix officiels de ${s}, le minimum se trouve en ${c}, à environ `,
  conclusionMiddle: (c) => `, et le maximum en ${c}, à environ `, conclusionSpread: (d) => `, soit un écart d’environ ${d} %.`,
  pageUpdated: (d) => `Page mise à jour le ${d}`, regionCount: (c) => `${c} régions`, displayCurrency: "Devise d’affichage",
  officialWebPricing: "Prix du site officiel", allDiagnosticSources: "Toutes les sources de prix", allSources: "Toutes les sources",
  webLead: "Prix du site officiel", googlePlayLead: "Prix Google Play", allDiagnostics: "Autres sources",
  cnyLabel: "Yuan chinois (CNY)", usdLabel: "Dollar américain (USD)", monthlySuffix: "/mois",
  cnyUnavailable: "Conversion en CNY indisponible pendant la synchronisation du taux de change",
  cnyStale: "Conversion en CNY suspendue : le taux de change est trop ancien",
  synced: (d) => `Synchronisé le ${d}`, rateBasis: (d) => `Taux de change du ${d}`, cnyRate: (r) => `Conversion : 1 USD = ${r.toFixed(4)} CNY`,
  lowest: "Minimum", highest: "Maximum", usBase: "Référence américaine", regions: "Régions couvertes",
  source: "Source", latestCollection: "Dernière collecte", fxBasis: "Date du taux de change",
  planReview: "Révision de l’offre", trustStatus: "Fiabilité", verified: "Vérifié", reviewed: "Examiné",
  needsReview: "À vérifier", unavailable: "Indisponible", distributionEyebrow: "Répartition des prix",
  distributionTitle: "Répartition mondiale des prix et classement régional",
  distributionDescription: (p) => `Visualisez les écarts régionaux de ${p} sur la carte et comparez les régions les moins et les plus chères.`,
  lowerRegions: "Régions les moins chères", higherRegions: "Régions les plus chères",
  noPrices: (s) => `Aucun prix ${s} disponible`, noPricesDescription: "Il n’y a pas assez de prix vérifiés pour afficher la répartition, le classement et la liste régionale.",
};

const italianPricingPlatformCopy: PricingPlatformCopy = {
  appStoreSource: "Fonte del prezzo: App Store", conclusionTitle: (p) => `Sintesi mondiale dei prezzi di ${p}`,
  conclusion: (s,l,h,d) => `Secondo i prezzi ufficiali di ${s}, il minimo è ${l}, il massimo ${h}, con una differenza di circa il ${d}%.`,
  conclusionLead: (s,c) => `Secondo i prezzi ufficiali di ${s}, il minimo si trova in ${c}, a circa `,
  conclusionMiddle: (c) => `, e il massimo in ${c}, a circa `, conclusionSpread: (d) => `, con una differenza di circa il ${d}%.`,
  pageUpdated: (d) => `Pagina aggiornata il ${d}`, regionCount: (c) => `${c} regioni`, displayCurrency: "Valuta visualizzata",
  officialWebPricing: "Prezzo del sito ufficiale", allDiagnosticSources: "Tutte le fonti dei prezzi", allSources: "Tutte le fonti",
  webLead: "Prezzo del sito ufficiale", googlePlayLead: "Prezzo Google Play", allDiagnostics: "Altre fonti",
  cnyLabel: "Yuan cinese (CNY)", usdLabel: "Dollaro statunitense (USD)", monthlySuffix: "/mese",
  cnyUnavailable: "Conversione in CNY non disponibile durante la sincronizzazione del cambio",
  cnyStale: "Conversione in CNY sospesa: il tasso di cambio è obsoleto",
  synced: (d) => `Sincronizzato il ${d}`, rateBasis: (d) => `Cambio del ${d}`, cnyRate: (r) => `Conversione: 1 USD = ${r.toFixed(4)} CNY`,
  lowest: "Minimo", highest: "Massimo", usBase: "Riferimento USA", regions: "Regioni coperte",
  source: "Fonte", latestCollection: "Ultima raccolta", fxBasis: "Data del cambio", planReview: "Revisione del piano",
  trustStatus: "Affidabilità", verified: "Verificato", reviewed: "Esaminato", needsReview: "Da verificare", unavailable: "Non disponibile",
  distributionEyebrow: "Distribuzione dei prezzi", distributionTitle: "Distribuzione mondiale dei prezzi e classifica regionale",
  distributionDescription: (p) => `Esplora sulla mappa le differenze regionali di ${p} e confronta le regioni meno e più care.`,
  lowerRegions: "Regioni meno care", higherRegions: "Regioni più care", noPrices: (s) => `Nessun prezzo ${s} disponibile`,
  noPricesDescription: "Non ci sono abbastanza prezzi verificati per mostrare distribuzione, classifica ed elenco regionale.",
};

const germanPricingPlatformCopy: PricingPlatformCopy = {
  appStoreSource: "Preisquelle: App Store", conclusionTitle: (p) => `${p}: weltweite Preisübersicht`,
  conclusion: (s,l,h,d) => `Nach den offiziellen Preisen von ${s} liegt der niedrigste Wert bei ${l}, der höchste bei ${h}; die Spanne beträgt etwa ${d} %.`,
  conclusionLead: (s,c) => `Nach den offiziellen Preisen von ${s} ist ${c} mit etwa `,
  conclusionMiddle: (c) => ` am günstigsten und ${c} mit etwa `, conclusionSpread: (d) => ` am teuersten; die Spanne beträgt rund ${d} %.`,
  pageUpdated: (d) => `Seite aktualisiert am ${d}`, regionCount: (c) => `${c} Regionen`, displayCurrency: "Anzeigewährung",
  officialWebPricing: "Preis der offiziellen Website", allDiagnosticSources: "Alle Preisquellen", allSources: "Alle Quellen",
  webLead: "Preis der offiziellen Website", googlePlayLead: "Google-Play-Preis", allDiagnostics: "Weitere Quellen",
  cnyLabel: "Chinesischer Yuan (CNY)", usdLabel: "US-Dollar (USD)", monthlySuffix: "/Monat",
  cnyUnavailable: "CNY-Umrechnung während der Wechselkurssynchronisierung nicht verfügbar",
  cnyStale: "CNY-Umrechnung ausgesetzt: Wechselkurs ist veraltet",
  synced: (d) => `Synchronisiert am ${d}`, rateBasis: (d) => `Wechselkurs vom ${d}`, cnyRate: (r) => `Umrechnung: 1 USD = ${r.toFixed(4)} CNY`,
  lowest: "Niedrigster", highest: "Höchster", usBase: "US-Referenz", regions: "Abgedeckte Regionen",
  source: "Quelle", latestCollection: "Letzte Erhebung", fxBasis: "Wechselkursdatum", planReview: "Tarifprüfung",
  trustStatus: "Verlässlichkeit", verified: "Geprüft", reviewed: "Kontrolliert", needsReview: "Prüfung nötig", unavailable: "Nicht verfügbar",
  distributionEyebrow: "Preisverteilung", distributionTitle: "Weltweite Preisverteilung und Regionenrangliste",
  distributionDescription: (p) => `Sehen Sie regionale Preisunterschiede für ${p} auf der Karte und vergleichen Sie günstige und teure Regionen.`,
  lowerRegions: "Günstigste Regionen", higherRegions: "Teuerste Regionen", noPrices: (s) => `Noch keine ${s}-Preise`,
  noPricesDescription: "Es liegen nicht genügend geprüfte Preise für Verteilung, Rangliste und Regionenliste vor.",
};

const portuguesePricingPlatformCopy: PricingPlatformCopy = {
  appStoreSource: "Fonte do preço: App Store", conclusionTitle: (p) => `Resumo mundial dos preços de ${p}`,
  conclusion: (s,l,h,d) => `Segundo os preços oficiais de ${s}, o mínimo é ${l}, o máximo ${h}, com uma diferença de cerca de ${d}%.`,
  conclusionLead: (s,c) => `Segundo os preços oficiais de ${s}, o mínimo encontra-se em ${c}, a cerca de `,
  conclusionMiddle: (c) => `, e o máximo em ${c}, a cerca de `, conclusionSpread: (d) => `, com uma diferença de cerca de ${d}%.`,
  pageUpdated: (d) => `Página atualizada em ${d}`, regionCount: (c) => `${c} regiões`, displayCurrency: "Moeda apresentada",
  officialWebPricing: "Preço do site oficial", allDiagnosticSources: "Todas as fontes de preços", allSources: "Todas as fontes",
  webLead: "Preço do site oficial", googlePlayLead: "Preço do Google Play", allDiagnostics: "Outras fontes",
  cnyLabel: "Yuan chinês (CNY)", usdLabel: "Dólar americano (USD)", monthlySuffix: "/mês",
  cnyUnavailable: "Conversão em CNY indisponível durante a sincronização do câmbio",
  cnyStale: "Conversão em CNY suspensa: o câmbio está desatualizado",
  synced: (d) => `Sincronizado em ${d}`, rateBasis: (d) => `Câmbio de ${d}`, cnyRate: (r) => `Conversão: 1 USD = ${r.toFixed(4)} CNY`,
  lowest: "Mínimo", highest: "Máximo", usBase: "Referência dos EUA", regions: "Regiões abrangidas",
  source: "Fonte", latestCollection: "Última recolha", fxBasis: "Data do câmbio", planReview: "Revisão do plano",
  trustStatus: "Fiabilidade", verified: "Verificado", reviewed: "Revisto", needsReview: "A verificar", unavailable: "Indisponível",
  distributionEyebrow: "Distribuição dos preços", distributionTitle: "Distribuição mundial dos preços e classificação regional",
  distributionDescription: (p) => `Explore no mapa as diferenças regionais de ${p} e compare as regiões mais baratas e mais caras.`,
  lowerRegions: "Regiões mais baratas", higherRegions: "Regiões mais caras", noPrices: (s) => `Ainda não há preços de ${s}`,
  noPricesDescription: "Não existem preços verificados suficientes para apresentar a distribuição, a classificação e a lista regional.",
};

export function getPricingPlatformCopy(
  locale: SiteLocale,
): PricingPlatformCopy {
  if (locale === "zh-tw") {
    return toTraditionalChinese(getPublicPricingCopy("zh").pricing);
  }

  if (locale === "zh" || locale === "en") {
    return getPublicPricingCopy(locale).pricing;
  }

  if (locale === "ja") return japanesePricingPlatformCopy;
  if (locale === "ko") return koreanPricingPlatformCopy;
  if (locale === "es") return spanishPricingPlatformCopy;
  if (locale === "tr") return turkishPricingPlatformCopy;
  if (locale === "ar") return arabicPricingPlatformCopy;
  if (locale === "fr") return frenchPricingPlatformCopy;
  if (locale === "it") return italianPricingPlatformCopy;
  if (locale === "de") return germanPricingPlatformCopy;
  return portuguesePricingPlatformCopy;
}

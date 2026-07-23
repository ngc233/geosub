import { formatUsd, type PlanStats } from "./public-pricing-model";
import { getPlanDisplayName } from "./pricing-labels";
import type { PricingFaq } from "./pricing-seo";
import type { PreparedSiteLocale } from "./site-locale";
import { withTraditionalChinese } from "./traditional-chinese";

type StaticDetailCopy = {
  metadataFallbackTitle: string;
  backToPricing: string;
  visitOfficial: string;
  plans: string;
  faqTitle: (productName: string) => string;
  empty: {
    eyebrow: string;
    title: (productName: string, planName: string) => string;
    description: string;
    status: string;
    statusValue: string;
    source: string;
    condition: string;
    conditionValue: string;
  };
};

const staticDetailCopy = withTraditionalChinese({
  zh: {
    metadataFallbackTitle: "订阅价格详情",
    backToPricing: "← 返回订阅价格列表",
    visitOfficial: "访问官方网站 ↗",
    plans: "套餐",
    faqTitle: (productName) => `${productName} 订阅定价 FAQ`,
    empty: {
      eyebrow: "价格待审核",
      title: (productName, planName) => `${productName} ${planName} 价格正在审核`,
      description:
        "该套餐暂时没有足够的已核验地区价格。价格通过来源、币种、周期和一致性检查后，本页才会展示地区排名、地图和购买力对比。",
      status: "当前状态",
      statusValue: "待审核",
      source: "数据来源",
      condition: "展示条件",
      conditionValue: "通过审核后发布",
    },
  },
  en: {
    metadataFallbackTitle: "Pricing Detail",
    backToPricing: "← Back to pricing list",
    visitOfficial: "Visit official website ↗",
    plans: "Plans",
    faqTitle: (productName) => `${productName} Pricing FAQ`,
    empty: {
      eyebrow: "Price pending",
      title: (productName, planName) =>
        `${productName} ${planName} prices are under review`,
      description:
        "This plan does not yet have enough reviewed regional prices. Regional rankings, maps and affordability comparisons are shown only after source, currency, billing-cycle and consistency checks pass.",
      status: "Status",
      statusValue: "Under review",
      source: "Data source",
      condition: "Display condition",
      conditionValue: "Published after review",
    },
  },
  ja: {
    metadataFallbackTitle: "サブスクリプション料金の詳細",
    backToPricing: "← 料金一覧に戻る",
    visitOfficial: "公式サイトを見る ↗",
    plans: "プラン",
    faqTitle: (productName) => `${productName} 料金に関するよくある質問`,
    empty: {
      eyebrow: "料金を確認中",
      title: (productName, planName) =>
        `${productName} ${planName} の料金を確認しています`,
      description:
        "このプランは、公開に必要な地域別料金の確認がまだ完了していません。情報源、通貨、請求周期、価格の一貫性を確認した後に、地域ランキング、地図、購買力比較を表示します。",
      status: "現在の状況",
      statusValue: "確認中",
      source: "データソース",
      condition: "公開条件",
      conditionValue: "確認完了後に公開",
    },
  },
  ko: {
    metadataFallbackTitle: "구독 가격 상세",
    backToPricing: "← 가격 목록으로 돌아가기",
    visitOfficial: "공식 웹사이트 방문 ↗",
    plans: "요금제",
    faqTitle: (productName) => `${productName} 가격 자주 묻는 질문`,
    empty: {
      eyebrow: "가격 검토 중",
      title: (productName, planName) =>
        `${productName} ${planName} 가격을 검토하고 있습니다`,
      description:
        "이 요금제는 아직 공개에 필요한 지역별 가격 검토가 완료되지 않았습니다. 출처, 통화, 결제 주기와 가격 일관성을 확인한 뒤 지역 순위, 지도와 구매력 비교를 표시합니다.",
      status: "현재 상태",
      statusValue: "검토 중",
      source: "데이터 출처",
      condition: "공개 조건",
      conditionValue: "검토 완료 후 공개",
    },
  },
  es: {
    metadataFallbackTitle: "Detalle del precio de suscripción",
    backToPricing: "← Volver a la lista de precios",
    visitOfficial: "Visitar el sitio oficial ↗",
    plans: "Planes",
    faqTitle: (productName) => `Preguntas frecuentes sobre los precios de ${productName}`,
    empty: {
      eyebrow: "Precio en revisión",
      title: (productName, planName) =>
        `Estamos revisando el precio de ${productName} ${planName}`,
      description:
        "Este plan todavía no cuenta con suficientes precios regionales verificados. El ranking, el mapa y la comparación de poder adquisitivo aparecerán cuando superen las comprobaciones de fuente, moneda, periodo de facturación y coherencia.",
      status: "Estado",
      statusValue: "En revisión",
      source: "Fuente de datos",
      condition: "Condición de publicación",
      conditionValue: "Se publica tras la revisión",
    },
  },
  tr: {
    metadataFallbackTitle: "Abonelik fiyatı ayrıntıları",
    backToPricing: "← Fiyat listesine dön",
    visitOfficial: "Resmî web sitesini ziyaret et ↗",
    plans: "Paketler",
    faqTitle: (productName) => `${productName} fiyatları hakkında sık sorulan sorular`,
    empty: {
      eyebrow: "Fiyat inceleniyor",
      title: (productName, planName) =>
        `${productName} ${planName} fiyatı inceleniyor`,
      description:
        "Bu paket için henüz yeterli sayıda doğrulanmış bölgesel fiyat bulunmuyor. Kaynak, para birimi, faturalandırma dönemi ve tutarlılık kontrolleri tamamlandığında bölge sıralaması, harita ve satın alma gücü karşılaştırması gösterilir.",
      status: "Durum",
      statusValue: "İnceleniyor",
      source: "Veri kaynağı",
      condition: "Yayın koşulu",
      conditionValue: "İncelemeden sonra yayımlanır",
    },
  },
  ar: {
    metadataFallbackTitle: "تفاصيل سعر الاشتراك",
    backToPricing: "العودة إلى قائمة الأسعار →",
    visitOfficial: "زيارة الموقع الرسمي ↗",
    plans: "الباقات",
    faqTitle: (productName) => `أسئلة شائعة عن أسعار ${productName}`,
    empty: {
      eyebrow: "السعر قيد المراجعة",
      title: (productName, planName) =>
        `سعر ${productName} ${planName} قيد المراجعة`,
      description:
        "لا تتوفر لهذه الباقة حتى الآن أسعار إقليمية موثوقة بما يكفي للنشر. سيظهر الترتيب والخريطة ومقارنة القدرة الشرائية بعد اجتياز فحوص المصدر والعملة ودورة الفوترة واتساق السعر.",
      status: "الحالة",
      statusValue: "قيد المراجعة",
      source: "مصدر البيانات",
      condition: "شرط النشر",
      conditionValue: "يُنشر بعد اكتمال المراجعة",
    },
  },
  fr: {
    metadataFallbackTitle: "Détail du prix de l’abonnement", backToPricing: "← Retour à la liste des prix",
    visitOfficial: "Visiter le site officiel ↗", plans: "Offres",
    faqTitle: (p) => `Questions fréquentes sur les prix de ${p}`,
    empty: {
      eyebrow: "Prix en cours de vérification", title: (p,n) => `Le prix de ${p} ${n} est en cours de vérification`,
      description: "Cette offre ne dispose pas encore d’assez de prix régionaux vérifiés. Le classement, la carte et le pouvoir d’achat apparaîtront après les contrôles de source, de devise, de période de facturation et de cohérence.",
      status: "État", statusValue: "En cours de vérification", source: "Source des données",
      condition: "Condition de publication", conditionValue: "Publication après vérification",
    },
  },
  it: {
    metadataFallbackTitle: "Dettagli del prezzo dell’abbonamento", backToPricing: "← Torna all’elenco dei prezzi",
    visitOfficial: "Visita il sito ufficiale ↗", plans: "Piani",
    faqTitle: (p) => `Domande frequenti sui prezzi di ${p}`,
    empty: {
      eyebrow: "Prezzo in verifica", title: (p,n) => `Il prezzo di ${p} ${n} è in verifica`,
      description: "Questo piano non dispone ancora di prezzi regionali verificati sufficienti. La classifica, la mappa e il confronto del potere d’acquisto appariranno dopo i controlli su fonte, valuta, periodo di fatturazione e coerenza.",
      status: "Stato", statusValue: "In verifica", source: "Fonte dei dati",
      condition: "Condizione di pubblicazione", conditionValue: "Pubblicato dopo la verifica",
    },
  },
  de: {
    metadataFallbackTitle: "Details zum Abonnementpreis", backToPricing: "← Zurück zur Preisliste",
    visitOfficial: "Offizielle Website besuchen ↗", plans: "Tarife",
    faqTitle: (p) => `Häufige Fragen zu den Preisen von ${p}`,
    empty: {
      eyebrow: "Preis wird geprüft", title: (p,n) => `Der Preis für ${p} ${n} wird geprüft`,
      description: "Für diesen Tarif liegen noch nicht genügend geprüfte Regionalpreise vor. Rangliste, Karte und Kaufkraftvergleich erscheinen nach den Prüfungen von Quelle, Währung, Abrechnungszeitraum und Konsistenz.",
      status: "Status", statusValue: "In Prüfung", source: "Datenquelle",
      condition: "Veröffentlichungsbedingung", conditionValue: "Veröffentlichung nach Prüfung",
    },
  },
  pt: {
    metadataFallbackTitle: "Detalhes do preço da assinatura", backToPricing: "← Voltar à lista de preços",
    visitOfficial: "Visitar o site oficial ↗", plans: "Planos",
    faqTitle: (p) => `Perguntas frequentes sobre os preços de ${p}`,
    empty: {
      eyebrow: "Preço em verificação", title: (p,n) => `O preço de ${p} ${n} está em verificação`,
      description: "Este plano ainda não tem preços regionais verificados suficientes. A classificação, o mapa e a comparação do poder de compra surgirão após os controlos de fonte, moeda, período de faturação e coerência.",
      status: "Estado", statusValue: "Em verificação", source: "Fonte dos dados",
      condition: "Condição de publicação", conditionValue: "Publicado após verificação",
    },
  },
} satisfies Record<
  Exclude<PreparedSiteLocale, "zh-tw">,
  StaticDetailCopy
>);

function getPageTitle(
  locale: PreparedSiteLocale,
  productName: string,
  planName: string,
) {
  const name = getPlanDisplayName(productName, planName);
  const templates: Record<PreparedSiteLocale, string> = withTraditionalChinese({
    zh: `${name} 全球价格对比`,
    en: `${name} Global Price Comparison`,
    ja: `${name} 世界の料金比較`,
    ko: `${name} 전 세계 가격 비교`,
    es: `Comparativa mundial de precios de ${name}`,
    tr: `${name} dünya geneli fiyat karşılaştırması`,
    ar: `مقارنة أسعار ${name} حول العالم`,
    fr: `Comparaison mondiale des prix de ${name}`,
    it: `Confronto mondiale dei prezzi di ${name}`,
    de: `${name}: weltweiter Preisvergleich`,
    pt: `Comparação mundial dos preços de ${name}`,
  });
  return templates[locale];
}

function getDescription(locale: PreparedSiteLocale, productName: string) {
  const descriptions: Record<PreparedSiteLocale, string> =
    withTraditionalChinese({
    zh: `按套餐和地区比较 ${productName} 在 App Store 的公开订阅价格，并结合当前显示币种、税费和购买力理解真实成本。`,
    en: `Compare ${productName} public App Store subscription prices by plan and region, with localized currency, tax and purchasing-power context.`,
    ja: `${productName} のApp Store公開料金をプラン・地域別に比較し、表示通貨、税金、現地の購買力を含めて実質的な負担を確認できます。`,
    ko: `${productName}의 App Store 공개 구독 가격을 요금제와 지역별로 비교하고 표시 통화, 세금, 현지 구매력을 함께 확인하세요.`,
    es: `Compara los precios públicos de ${productName} en App Store por plan y región, con la moneda mostrada, los impuestos y el poder adquisitivo local.`,
    tr: `${productName} App Store abonelik fiyatlarını paket ve bölge bazında; görüntülenen para birimi, vergiler ve yerel satın alma gücü bağlamında karşılaştırın.`,
    ar: `قارن أسعار اشتراك ${productName} المعلنة في App Store حسب الباقة والمنطقة، مع عملة العرض والضرائب وسياق القدرة الشرائية المحلية.`,
    fr: `Comparez les prix publics App Store de ${productName} par offre et par région, en tenant compte de la devise affichée, des taxes et du pouvoir d’achat local.`,
    it: `Confronta i prezzi pubblici App Store di ${productName} per piano e regione, considerando la valuta visualizzata, le imposte e il potere d’acquisto locale.`,
    de: `Vergleichen Sie die öffentlichen App-Store-Preise von ${productName} nach Tarif und Region unter Berücksichtigung der Anzeigewährung, Steuern und lokalen Kaufkraft.`,
    pt: `Compare os preços públicos da App Store de ${productName} por plano e região, considerando a moeda apresentada, os impostos e o poder de compra local.`,
    });
  return descriptions[locale];
}

function getFaqs(
  locale: PreparedSiteLocale,
  productName: string,
  planName: string,
  stats: PlanStats | null,
): PricingFaq[] {
  const name = getPlanDisplayName(productName, planName);
  const year = new Date().getFullYear();
  const lowestCountry = stats?.minRegion.country;
  const lowestPrice = stats ? formatUsd(stats.minRegion.priceUsd) : null;

  const faqByLocale: Record<PreparedSiteLocale, PricingFaq[]> =
    withTraditionalChinese({
    zh: [
      {
        q: `截至 ${year} 年，${name} 哪个地区价格最低？`,
        a: lowestCountry
          ? `按本页最近核验的 App Store 价格，${lowestCountry}当前最低，美元折算约 ${lowestPrice}/月。价格可能随平台定价、税费和汇率变化，请同时查看页面标注日期，并以官方结算价为准。`
          : "本页会在取得足够的已核验地区价格后显示最低价地区。价格可能随平台定价、税费和汇率变化，请以页面标注日期和官方结算价为准。",
      },
      {
        q: `${name} 的显示价格是否含税？`,
        a: "是否含税取决于地区和平台结算规则。本页会标注已知的 VAT、GST、销售税或待核验状态；银行换汇费和结算时新增的税费可能不在展示价格中，最终以官方结算页为准。",
      },
      {
        q: `我可以直接购买最便宜地区的 ${name} 吗？`,
        a: "不一定。能否订阅通常取决于 Apple ID 地区、付款方式、账单信息、当地可用性和平台风控。GeoSub 用于比较公开价格，不建议通过虚假资料或违反平台规则的方式跨区订阅。",
      },
      {
        q: `${productName} 在不同地区为什么价格不同？`,
        a: "地区价格会受到本地定价策略、税费、汇率、市场定位和购买力差异影响。美元折算价用于横向比较，但不代表平台仅按实时汇率换算各地价格。",
      },
      {
        q: `${name} 地区价格多久更新一次？`,
        a: "GeoSub 会定期重新核验已发布价格，并分别标注价格采集日期、汇率日期、套餐复核日期和页面更新时间。平台刚刚调价时，页面需要通过一致性检查后才会更新。",
      },
    ],
    en: [
      {
        q: `Which region has the lowest ${name} price in ${year}?`,
        a: lowestCountry
          ? `Based on the latest reviewed App Store prices on this page, ${lowestCountry} is currently the lowest at about ${lowestPrice} per month. Check the displayed dates and official checkout price because platform pricing, taxes and exchange rates can change.`
          : "The lowest-price region will appear once enough reviewed regional prices are available. Check the displayed dates and official checkout price because platform pricing, taxes and exchange rates can change.",
      },
      {
        q: `Does the displayed ${name} price include tax?`,
        a: "Tax treatment depends on the region and platform checkout rules. Known VAT, GST, sales tax and review status are shown where available. Bank conversion fees or taxes added at checkout may not be included.",
      },
      {
        q: `Can I subscribe to ${name} through the cheapest region?`,
        a: "Not always. Availability can depend on Apple ID region, payment method, billing information, local availability and platform controls. GeoSub compares public prices and does not recommend bypassing platform rules.",
      },
      {
        q: `Why does ${productName} cost more in some regions?`,
        a: "Regional prices can differ because of local pricing strategy, tax treatment, exchange rates, market positioning and purchasing power. USD equivalents support comparison but are not necessarily live currency conversions used by the platform.",
      },
      {
        q: `How often are ${name} regional prices updated?`,
        a: "GeoSub regularly rechecks published prices and separately displays the collection date, exchange-rate date, plan review date and page update date. New platform prices may remain pending until consistency checks pass.",
      },
    ],
    ja: [
      {
        q: `${year}年現在、${name} が最も安い国・地域はどこですか？`,
        a: lowestCountry
          ? `このページで確認済みの最新App Store料金では、現在は${lowestCountry}が最安で、月額約${lowestPrice}です。料金、税金、為替は変動するため、表示日と公式の決済金額もご確認ください。`
          : "十分な数の地域別料金を確認でき次第、最安地域を表示します。料金、税金、為替は変動するため、表示日と公式の決済金額もご確認ください。",
      },
      {
        q: `表示されている ${name} の料金に税金は含まれますか？`,
        a: "税金の扱いは地域と決済ルールによって異なります。確認できたVAT、GST、売上税などは表に記載しますが、決済時の税金やカード会社の為替手数料が含まれない場合があります。",
      },
      {
        q: `${name} を最安地域から契約できますか？`,
        a: "必ずしも契約できるとは限りません。Apple IDの地域、支払い方法、請求先情報、現地での提供状況、プラットフォームの制限が適用されます。GeoSubは公開料金の比較を目的としており、規約の回避を推奨しません。",
      },
      {
        q: `${productName} の料金が地域によって異なるのはなぜですか？`,
        a: "現地の価格戦略、税制、為替、市場環境、購買力などが影響します。USD換算は比較のための目安であり、各地域の料金が常に最新為替だけで決まるわけではありません。",
      },
      {
        q: `${name} の地域別料金はどのくらいの頻度で更新されますか？`,
        a: "GeoSubは公開済み料金を定期的に再確認し、料金取得日、為替基準日、プラン確認日、ページ更新日を分けて表示します。料金変更は整合性確認後に反映されます。",
      },
    ],
    ko: [
      {
        q: `${year}년 기준 ${name} 가격이 가장 저렴한 지역은 어디인가요?`,
        a: lowestCountry
          ? `이 페이지에서 최근 검토한 App Store 가격 기준으로 현재 최저가는 ${lowestCountry}이며 월 약 ${lowestPrice}입니다. 가격, 세금과 환율은 변동될 수 있으므로 표시된 날짜와 공식 결제 금액도 확인하세요.`
          : "충분한 지역별 가격이 검토되면 최저가 지역을 표시합니다. 가격, 세금과 환율은 변동될 수 있으므로 표시된 날짜와 공식 결제 금액도 확인하세요.",
      },
      {
        q: `표시된 ${name} 가격에 세금이 포함되어 있나요?`,
        a: "세금 포함 여부는 지역과 결제 규정에 따라 다릅니다. 확인된 VAT, GST, 판매세와 검토 상태를 표시하지만 결제 단계의 추가 세금이나 카드사 환전 수수료는 포함되지 않을 수 있습니다.",
      },
      {
        q: `${name}을(를) 최저가 지역에서 구독할 수 있나요?`,
        a: "항상 가능한 것은 아닙니다. Apple ID 지역, 결제 수단, 청구 정보, 현지 제공 여부와 플랫폼 제한이 적용될 수 있습니다. GeoSub는 공개 가격을 비교하며 플랫폼 규정 우회를 권장하지 않습니다.",
      },
      {
        q: `${productName} 가격은 왜 지역마다 다른가요?`,
        a: "현지 가격 정책, 세금, 환율, 시장 상황과 구매력 차이가 영향을 줍니다. USD 환산가는 비교를 위한 값이며 플랫폼이 모든 지역 가격을 실시간 환율로만 정한다는 뜻은 아닙니다.",
      },
      {
        q: `${name} 지역별 가격은 얼마나 자주 업데이트되나요?`,
        a: "GeoSub는 공개 가격을 정기적으로 다시 확인하고 가격 수집일, 환율 기준일, 요금제 검토일과 페이지 업데이트일을 구분해 표시합니다. 가격 변경은 일관성 검사를 통과한 뒤 반영됩니다.",
      },
    ],
    es: [
      {
        q: `¿En qué región es más barato ${name} en ${year}?`,
        a: lowestCountry
          ? `Según los últimos precios de App Store verificados en esta página, ${lowestCountry} es actualmente la región más barata, con unos ${lowestPrice} al mes. Consulta también las fechas indicadas y el importe oficial de pago, ya que los precios, impuestos y tipos de cambio pueden variar.`
          : "La región más barata aparecerá cuando haya suficientes precios regionales verificados. Consulta las fechas indicadas y el importe oficial de pago, ya que los precios, impuestos y tipos de cambio pueden variar.",
      },
      {
        q: `¿El precio mostrado de ${name} incluye impuestos?`,
        a: "Depende de la región y de las reglas de pago de la plataforma. Indicamos el IVA, GST, impuesto sobre ventas o estado de revisión cuando se conocen, pero el banco o la página de pago pueden añadir otros cargos.",
      },
      {
        q: `¿Puedo contratar ${name} desde la región más barata?`,
        a: "No siempre. Puede depender de la región del Apple ID, el método de pago, los datos de facturación, la disponibilidad local y los controles de la plataforma. GeoSub compara precios públicos y no recomienda eludir sus normas.",
      },
      {
        q: `¿Por qué ${productName} cuesta más en algunas regiones?`,
        a: "Influyen la estrategia local de precios, los impuestos, el tipo de cambio, el posicionamiento y el poder adquisitivo. La equivalencia en USD sirve para comparar, pero no implica que la plataforma convierta todos los precios al tipo de cambio del día.",
      },
      {
        q: `¿Con qué frecuencia se actualizan los precios regionales de ${name}?`,
        a: "GeoSub vuelve a comprobar periódicamente los precios publicados y distingue entre la fecha de recopilación, la fecha del tipo de cambio, la revisión del plan y la actualización de la página. Los cambios se publican tras superar las comprobaciones de coherencia.",
      },
    ],
    tr: [
      {
        q: `${year} yılında ${name} en ucuz hangi bölgede?`,
        a: lowestCountry
          ? `Bu sayfadaki son doğrulanmış App Store fiyatlarına göre şu anda en düşük fiyat ${lowestCountry} bölgesinde ve aylık yaklaşık ${lowestPrice}. Fiyatlar, vergiler ve döviz kurları değişebileceği için gösterilen tarihleri ve resmî ödeme tutarını da kontrol edin.`
          : "Yeterli sayıda bölgesel fiyat doğrulandığında en ucuz bölge gösterilir. Fiyatlar, vergiler ve döviz kurları değişebileceği için gösterilen tarihleri ve resmî ödeme tutarını da kontrol edin.",
      },
      {
        q: `Gösterilen ${name} fiyatına vergi dâhil mi?`,
        a: "Verginin fiyata dâhil olup olmadığı bölgeye ve platformun ödeme kurallarına bağlıdır. Bilinen KDV, GST, satış vergisi ve inceleme durumu gösterilir; banka kur farkı veya ödeme sırasında eklenen vergiler dâhil olmayabilir.",
      },
      {
        q: `${name} aboneliğini en ucuz bölgeden satın alabilir miyim?`,
        a: "Her zaman mümkün değildir. Apple ID bölgesi, ödeme yöntemi, fatura bilgileri, yerel kullanılabilirlik ve platform kontrolleri geçerli olabilir. GeoSub yalnızca herkese açık fiyatları karşılaştırır ve platform kurallarının aşılmasını önermez.",
      },
      {
        q: `${productName} neden bazı bölgelerde daha pahalı?`,
        a: "Yerel fiyatlandırma stratejisi, vergiler, döviz kurları, pazar konumu ve satın alma gücü fiyatları etkiler. USD karşılığı karşılaştırma içindir; platformun her bölge fiyatını güncel kurla çevirdiği anlamına gelmez.",
      },
      {
        q: `${name} bölgesel fiyatları ne sıklıkla güncelleniyor?`,
        a: "GeoSub yayımlanmış fiyatları düzenli olarak yeniden kontrol eder; fiyat toplama, döviz kuru, paket inceleme ve sayfa güncelleme tarihlerini ayrı gösterir. Yeni fiyatlar tutarlılık kontrollerinden sonra yayımlanır.",
      },
    ],
    ar: [
      {
        q: `ما المنطقة التي تقدم أرخص سعر لاشتراك ${name} في ${year}؟`,
        a: lowestCountry
          ? `بحسب أحدث أسعار App Store التي تمت مراجعتها في هذه الصفحة، تُعد ${lowestCountry} الأرخص حاليًا بسعر يقارب ${lowestPrice} شهريًا. راجع التواريخ المعروضة وسعر الدفع الرسمي لأن الأسعار والضرائب وأسعار الصرف قد تتغير.`
          : "ستظهر المنطقة الأرخص بعد توفر عدد كافٍ من الأسعار الإقليمية المراجعة. راجع التواريخ المعروضة وسعر الدفع الرسمي لأن الأسعار والضرائب وأسعار الصرف قد تتغير.",
      },
      {
        q: `هل يشمل سعر ${name} المعروض الضرائب؟`,
        a: "يعتمد ذلك على المنطقة وقواعد الدفع في المنصة. نعرض ضريبة القيمة المضافة أو GST أو ضريبة المبيعات وحالة المراجعة عند توفرها، لكن قد تضاف رسوم تحويل أو ضرائب أخرى عند الدفع.",
      },
      {
        q: `هل يمكنني الاشتراك في ${name} من المنطقة الأرخص؟`,
        a: "ليس دائمًا. قد يعتمد الأمر على منطقة Apple ID وطريقة الدفع وبيانات الفوترة والتوافر المحلي وضوابط المنصة. تقارن GeoSub الأسعار المعلنة ولا توصي بتجاوز قواعد المنصة.",
      },
      {
        q: `لماذا يختلف سعر ${productName} بين المناطق؟`,
        a: "تؤثر استراتيجية التسعير المحلية والضرائب وسعر الصرف ووضع السوق والقدرة الشرائية في السعر. التحويل إلى الدولار مخصص للمقارنة ولا يعني أن المنصة تعتمد سعر الصرف اللحظي وحده.",
      },
      {
        q: `كم مرة تُحدّث أسعار ${name} الإقليمية؟`,
        a: "تعيد GeoSub التحقق من الأسعار المنشورة دوريًا، وتعرض بصورة منفصلة تاريخ جمع السعر وتاريخ سعر الصرف وتاريخ مراجعة الباقة وتاريخ تحديث الصفحة. لا تُنشر التغييرات إلا بعد اجتياز فحوص الاتساق.",
      },
    ],
    fr: [
      { q: `Dans quelle région ${name} est-il le moins cher en ${year} ?`, a: lowestCountry ? `D’après les derniers prix App Store vérifiés sur cette page, ${lowestCountry} est actuellement la région la moins chère, à environ ${lowestPrice} par mois. Consultez aussi les dates affichées et le prix officiel au paiement.` : "La région la moins chère apparaîtra dès que suffisamment de prix régionaux auront été vérifiés. Consultez les dates affichées et le prix officiel au paiement." },
      { q: `Le prix affiché pour ${name} inclut-il les taxes ?`, a: "Cela dépend de la région et des règles de paiement. La TVA, la GST, les taxes sur les ventes et l’état de vérification sont indiqués lorsqu’ils sont connus ; des frais de change ou taxes supplémentaires peuvent s’ajouter au paiement." },
      { q: `Puis-je souscrire à ${name} dans la région la moins chère ?`, a: "Pas toujours. Cela peut dépendre du pays de l’identifiant Apple, du moyen de paiement, des coordonnées de facturation, de la disponibilité locale et des contrôles de la plateforme. GeoSub compare les prix publics sans recommander le contournement des règles." },
      { q: `Pourquoi ${productName} coûte-t-il plus cher dans certaines régions ?`, a: "Les stratégies tarifaires locales, les taxes, les taux de change, le positionnement et le pouvoir d’achat influencent les prix. L’équivalent en dollars facilite la comparaison, mais ne signifie pas que la plateforme applique uniquement le taux du jour." },
      { q: `À quelle fréquence les prix régionaux de ${name} sont-ils actualisés ?`, a: "GeoSub vérifie régulièrement les prix publiés et distingue la date de collecte, la date du taux de change, la révision de l’offre et la mise à jour de la page. Un nouveau prix n’est publié qu’après les contrôles de cohérence." },
    ],
    it: [
      { q: `In quale regione ${name} costa meno nel ${year}?`, a: lowestCountry ? `Secondo gli ultimi prezzi App Store verificati in questa pagina, ${lowestCountry} è attualmente la regione meno cara, a circa ${lowestPrice} al mese. Controlla anche le date indicate e il prezzo ufficiale al pagamento.` : "La regione meno cara apparirà quando saranno disponibili abbastanza prezzi regionali verificati. Controlla le date indicate e il prezzo ufficiale al pagamento." },
      { q: `Il prezzo mostrato per ${name} include le imposte?`, a: "Dipende dalla regione e dalle regole di pagamento. IVA, GST, imposte sulle vendite e stato della verifica sono indicati quando noti; al pagamento possono aggiungersi commissioni di cambio o altre imposte." },
      { q: `Posso abbonarmi a ${name} dalla regione meno cara?`, a: "Non sempre. Possono contare la regione dell’Apple ID, il metodo di pagamento, i dati di fatturazione, la disponibilità locale e i controlli della piattaforma. GeoSub confronta prezzi pubblici e non consiglia di aggirare le regole." },
      { q: `Perché ${productName} costa di più in alcune regioni?`, a: "Strategie di prezzo locali, imposte, cambi, posizionamento e potere d’acquisto influenzano il costo. L’equivalente in dollari facilita il confronto, ma non implica che la piattaforma usi soltanto il cambio del giorno." },
      { q: `Con quale frequenza vengono aggiornati i prezzi regionali di ${name}?`, a: "GeoSub ricontrolla periodicamente i prezzi pubblicati e distingue data di raccolta, data del cambio, revisione del piano e aggiornamento della pagina. Le variazioni vengono pubblicate dopo i controlli di coerenza." },
    ],
    de: [
      { q: `In welcher Region ist ${name} im Jahr ${year} am günstigsten?`, a: lowestCountry ? `Nach den zuletzt geprüften App-Store-Preisen auf dieser Seite ist ${lowestCountry} derzeit mit etwa ${lowestPrice} pro Monat am günstigsten. Beachten Sie auch die Datumsangaben und den offiziellen Endpreis.` : "Die günstigste Region wird angezeigt, sobald genügend Regionalpreise geprüft wurden. Beachten Sie die Datumsangaben und den offiziellen Endpreis." },
      { q: `Enthält der angezeigte Preis für ${name} Steuern?`, a: "Das hängt von Region und Zahlungsregeln ab. Bekannte Umsatzsteuer, GST, Verkaufssteuer und Prüfstatus werden angezeigt; Wechselgebühren oder zusätzliche Steuern können erst beim Bezahlen hinzukommen." },
      { q: `Kann ich ${name} über die günstigste Region abonnieren?`, a: "Nicht immer. Maßgeblich können Apple-ID-Region, Zahlungsmethode, Rechnungsdaten, lokale Verfügbarkeit und Plattformprüfungen sein. GeoSub vergleicht öffentliche Preise und empfiehlt keine Umgehung von Regeln." },
      { q: `Warum kostet ${productName} in manchen Regionen mehr?`, a: "Lokale Preisstrategien, Steuern, Wechselkurse, Marktpositionierung und Kaufkraft beeinflussen den Preis. Der Dollarwert dient dem Vergleich und bedeutet nicht, dass die Plattform nur zum Tageskurs umrechnet." },
      { q: `Wie oft werden die Regionalpreise für ${name} aktualisiert?`, a: "GeoSub prüft veröffentlichte Preise regelmäßig neu und zeigt Erhebungsdatum, Wechselkursdatum, Tarifprüfung und Seitenaktualisierung getrennt an. Änderungen werden erst nach Konsistenzprüfungen veröffentlicht." },
    ],
    pt: [
      { q: `Em que região ${name} é mais barato em ${year}?`, a: lowestCountry ? `Segundo os últimos preços da App Store verificados nesta página, ${lowestCountry} é atualmente a região mais barata, a cerca de ${lowestPrice} por mês. Consulte também as datas apresentadas e o preço oficial no pagamento.` : "A região mais barata aparecerá quando existirem preços regionais verificados suficientes. Consulte as datas apresentadas e o preço oficial no pagamento." },
      { q: `O preço apresentado para ${name} inclui impostos?`, a: "Depende da região e das regras de pagamento. IVA, GST, impostos sobre vendas e estado da verificação são apresentados quando conhecidos; poderão acrescer taxas cambiais ou outros impostos no pagamento." },
      { q: `Posso assinar ${name} através da região mais barata?`, a: "Nem sempre. Pode depender da região do Apple ID, do método de pagamento, dos dados de faturação, da disponibilidade local e dos controlos da plataforma. O GeoSub compara preços públicos e não recomenda contornar regras." },
      { q: `Porque é que ${productName} custa mais em algumas regiões?`, a: "Estratégias locais de preço, impostos, câmbio, posicionamento e poder de compra influenciam o valor. O equivalente em dólares facilita a comparação, mas não significa que a plataforma use apenas o câmbio do dia." },
      { q: `Com que frequência são atualizados os preços regionais de ${name}?`, a: "O GeoSub volta a verificar regularmente os preços publicados e distingue a data de recolha, a data do câmbio, a revisão do plano e a atualização da página. As alterações só são publicadas após os controlos de coerência." },
    ],
    });

  return faqByLocale[locale];
}

export function getPricingDetailPageCopy({
  locale,
  productName,
  planName,
  stats,
}: {
  locale: PreparedSiteLocale;
  productName: string;
  planName: string;
  stats: PlanStats | null;
}) {
  const staticCopy = staticDetailCopy[locale];

  return {
    ...staticCopy,
    faqTitle: staticCopy.faqTitle(productName),
    empty: {
      ...staticCopy.empty,
      title: staticCopy.empty.title(productName, planName),
    },
    pageTitle: getPageTitle(locale, productName, planName),
    description: getDescription(locale, productName),
    faqs: getFaqs(locale, productName, planName, stats),
  };
}

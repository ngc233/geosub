import type { PreparedSiteLocale } from "./site-locale";
import { withTraditionalChinese } from "./traditional-chinese.ts";

type TaxNoteCopy = {
  include: (label: string, usually: boolean) => string;
  provinceVaries: (detail?: string) => string;
  stateIcsmVaries: string;
  stateSalesTaxVaries: string;
  regionalSalesTaxVaries: string;
  vatNeedsReview: string;
  usuallyGstInclusive: string;
  usuallyVatInclusive: string;
  appStoreGstInclusive: string;
  appStoreVatInclusive: string;
  digitalServiceTaxVaries: string;
  noCountryProfile: string;
  checkoutApplies: string;
  unknown: string;
  terms: Record<string, string>;
};

const taxNoteCopy = withTraditionalChinese({
  zh: {
    include: (label, usually) => (usually ? `通常含 ${label}` : `含 ${label}`),
    provinceVaries: (detail) =>
      detail ? `各省 ${detail} GST/HST 不同` : "各省 GST/HST 不同",
    stateIcsmVaries: "州税（ICMS）不同",
    stateSalesTaxVaries: "各州销售税不同",
    regionalSalesTaxVaries: "销售税因地区不同",
    vatNeedsReview: "VAT 规则需复核",
    usuallyGstInclusive: "通常已含 GST，最终以结算页为准",
    usuallyVatInclusive: "通常已含 VAT，最终以结算页为准",
    appStoreGstInclusive: "App Store 标价通常已含 GST，最终以结算页为准",
    appStoreVatInclusive: "App Store 标价通常已含 VAT，最终以结算页为准",
    digitalServiceTaxVaries: "数字服务税务规则可能随服务类别变化，最终以结算页为准",
    noCountryProfile: "未匹配到国家税率资料；最终以 App Store 结算页为准",
    checkoutApplies: "最终以结算页为准",
    unknown: "税务规则因地区而异，最终以 App Store 结算页为准",
    terms: {
      "consumption tax": "消费税",
      "service tax": "服务税",
      "sales tax": "销售税",
      "by region": "因地区不同",
    },
  },
  ja: {
    include: (label, usually) => (usually ? `通常は${label}込み` : `${label}込み`),
    provinceVaries: (detail) =>
      detail ? `州により ${detail} の GST/HST が異なります` : "州により GST/HST が異なります",
    stateIcsmVaries: "州により ICMS が異なります",
    stateSalesTaxVaries: "州により売上税が異なります",
    regionalSalesTaxVaries: "地域により売上税が異なります",
    vatNeedsReview: "VAT の取扱いは確認が必要です",
    usuallyGstInclusive: "通常は GST 込みです。最終金額は決済画面で確認してください",
    usuallyVatInclusive: "通常は VAT 込みです。最終金額は決済画面で確認してください",
    appStoreGstInclusive:
      "App Store の表示価格は通常 GST 込みです。最終金額は決済画面で確認してください",
    appStoreVatInclusive:
      "App Store の表示価格は通常 VAT 込みです。最終金額は決済画面で確認してください",
    digitalServiceTaxVaries:
      "デジタルサービス税の取扱いはサービス区分により異なる場合があります。最終金額は決済画面で確認してください",
    noCountryProfile:
      "該当国の税率情報が未登録です。最終金額は App Store の決済画面で確認してください",
    checkoutApplies: "最終金額は決済画面で確認してください",
    unknown: "税務上の取扱いは地域により異なります。最終金額は App Store の決済画面で確認してください",
    terms: {
      "consumption tax": "消費税",
      "service tax": "サービス税",
      "sales tax": "売上税",
      "by region": "地域別",
    },
  },
  ko: {
    include: (label, usually) => (usually ? `일반적으로 ${label} 포함` : `${label} 포함`),
    provinceVaries: (detail) =>
      detail ? `주별 ${detail} GST/HST 상이` : "주별 GST/HST 상이",
    stateIcsmVaries: "주별 ICMS 상이",
    stateSalesTaxVaries: "주별 판매세 상이",
    regionalSalesTaxVaries: "지역별 판매세 상이",
    vatNeedsReview: "VAT 적용 방식 확인 필요",
    usuallyGstInclusive: "일반적으로 GST가 포함되며, 최종 금액은 결제 화면을 기준으로 합니다",
    usuallyVatInclusive: "일반적으로 VAT가 포함되며, 최종 금액은 결제 화면을 기준으로 합니다",
    appStoreGstInclusive:
      "App Store 표시 가격에는 일반적으로 GST가 포함되며, 최종 금액은 결제 화면을 기준으로 합니다",
    appStoreVatInclusive:
      "App Store 표시 가격에는 일반적으로 VAT가 포함되며, 최종 금액은 결제 화면을 기준으로 합니다",
    digitalServiceTaxVaries:
      "디지털 서비스 세금은 서비스 유형에 따라 달라질 수 있으며, 최종 금액은 결제 화면을 기준으로 합니다",
    noCountryProfile:
      "해당 국가의 세율 정보가 아직 없습니다. 최종 금액은 App Store 결제 화면을 기준으로 합니다",
    checkoutApplies: "최종 금액은 결제 화면을 기준으로 합니다",
    unknown: "세금 적용 방식은 지역에 따라 다르며, 최종 금액은 App Store 결제 화면을 기준으로 합니다",
    terms: {
      "consumption tax": "소비세",
      "service tax": "서비스세",
      "sales tax": "판매세",
      "by region": "지역별",
    },
  },
  es: {
    include: (label, usually) => (usually ? `Suele incluir ${label}` : `Incluye ${label}`),
    provinceVaries: (detail) =>
      detail ? `El GST/HST (${detail}) varía según la provincia` : "El GST/HST varía según la provincia",
    stateIcsmVaries: "El ICMS varía según el estado",
    stateSalesTaxVaries: "El impuesto sobre ventas varía según el estado",
    regionalSalesTaxVaries: "El impuesto sobre ventas varía según la región",
    vatNeedsReview: "El tratamiento del IVA está pendiente de revisión",
    usuallyGstInclusive: "Suele incluir el GST; se aplica el importe mostrado al pagar",
    usuallyVatInclusive: "Suele incluir el IVA; se aplica el importe mostrado al pagar",
    appStoreGstInclusive:
      "El precio de App Store suele incluir el GST; se aplica el importe mostrado al pagar",
    appStoreVatInclusive:
      "El precio de App Store suele incluir el IVA; se aplica el importe mostrado al pagar",
    digitalServiceTaxVaries:
      "El tratamiento fiscal de los servicios digitales puede variar según el tipo de servicio; se aplica el importe mostrado al pagar",
    noCountryProfile:
      "Aún no hay un perfil fiscal para este país; se aplica el importe mostrado en App Store al pagar",
    checkoutApplies: "Se aplica el importe mostrado al pagar",
    unknown:
      "El tratamiento fiscal varía según la región; se aplica el importe mostrado en App Store al pagar",
    terms: {
      "consumption tax": "impuesto al consumo",
      "service tax": "impuesto sobre servicios",
      "sales tax": "impuesto sobre ventas",
      "by region": "según la región",
    },
  },
  tr: {
    include: (label, usually) => (usually ? `Genellikle ${label} dahildir` : `${label} dahildir`),
    provinceVaries: (detail) =>
      detail ? `GST/HST (${detail}) eyalete göre değişir` : "GST/HST eyalete göre değişir",
    stateIcsmVaries: "ICMS eyalete göre değişir",
    stateSalesTaxVaries: "Satış vergisi eyalete göre değişir",
    regionalSalesTaxVaries: "Satış vergisi bölgeye göre değişir",
    vatNeedsReview: "KDV uygulamasının incelenmesi gerekiyor",
    usuallyGstInclusive: "Genellikle GST dahildir; son tutar ödeme ekranında gösterilir",
    usuallyVatInclusive: "Genellikle KDV dahildir; son tutar ödeme ekranında gösterilir",
    appStoreGstInclusive:
      "App Store liste fiyatına genellikle GST dahildir; son tutar ödeme ekranında gösterilir",
    appStoreVatInclusive:
      "App Store liste fiyatına genellikle KDV dahildir; son tutar ödeme ekranında gösterilir",
    digitalServiceTaxVaries:
      "Dijital hizmet vergisi hizmet türüne göre değişebilir; son tutar ödeme ekranında gösterilir",
    noCountryProfile:
      "Bu ülke için henüz vergi oranı profili yok; App Store ödeme ekranındaki tutar geçerlidir",
    checkoutApplies: "Ödeme ekranındaki son tutar geçerlidir",
    unknown:
      "Vergi uygulaması bölgeye göre değişir; App Store ödeme ekranındaki son tutar geçerlidir",
    terms: {
      "consumption tax": "tüketim vergisi",
      "service tax": "hizmet vergisi",
      "sales tax": "satış vergisi",
      "by region": "bölgeye göre",
    },
  },
  ar: {
    include: (label, usually) => (usually ? `يشمل عادةً ${label}` : `يشمل ${label}`),
    provinceVaries: (detail) =>
      detail ? `تختلف ضريبة GST/HST (${detail}) حسب المقاطعة` : "تختلف ضريبة GST/HST حسب المقاطعة",
    stateIcsmVaries: "تختلف ضريبة ICMS حسب الولاية",
    stateSalesTaxVaries: "تختلف ضريبة المبيعات حسب الولاية",
    regionalSalesTaxVaries: "تختلف ضريبة المبيعات حسب المنطقة",
    vatNeedsReview: "تحتاج آلية تطبيق ضريبة القيمة المضافة إلى مراجعة",
    usuallyGstInclusive: "يشمل السعر عادةً ضريبة GST، ويُعتمد المبلغ الظاهر عند الدفع",
    usuallyVatInclusive: "يشمل السعر عادةً ضريبة القيمة المضافة، ويُعتمد المبلغ الظاهر عند الدفع",
    appStoreGstInclusive:
      "يشمل سعر App Store عادةً ضريبة GST، ويُعتمد المبلغ الظاهر عند الدفع",
    appStoreVatInclusive:
      "يشمل سعر App Store عادةً ضريبة القيمة المضافة، ويُعتمد المبلغ الظاهر عند الدفع",
    digitalServiceTaxVaries:
      "قد تختلف معاملة ضريبة الخدمات الرقمية حسب نوع الخدمة، ويُعتمد المبلغ الظاهر عند الدفع",
    noCountryProfile:
      "لا يتوفر حتى الآن ملف ضريبي لهذا البلد، ويُعتمد المبلغ الظاهر عند الدفع في App Store",
    checkoutApplies: "يُعتمد المبلغ الظاهر عند الدفع",
    unknown:
      "تختلف المعاملة الضريبية حسب المنطقة، ويُعتمد المبلغ الظاهر عند الدفع في App Store",
    terms: {
      "consumption tax": "ضريبة الاستهلاك",
      "service tax": "ضريبة الخدمات",
      "sales tax": "ضريبة المبيعات",
      "by region": "حسب المنطقة",
    },
  },
  fr: {
    include: (l,u) => u ? `Inclut généralement ${l}` : `Inclut ${l}`,
    provinceVaries: (d) => d ? `La GST/HST (${d}) varie selon la province` : "La GST/HST varie selon la province",
    stateIcsmVaries: "L’ICMS varie selon l’État", stateSalesTaxVaries: "La taxe de vente varie selon l’État",
    regionalSalesTaxVaries: "La taxe de vente varie selon la région", vatNeedsReview: "Le traitement de la TVA doit être vérifié",
    usuallyGstInclusive: "La GST est généralement incluse ; le montant au paiement prévaut",
    usuallyVatInclusive: "La TVA est généralement incluse ; le montant au paiement prévaut",
    appStoreGstInclusive: "Le prix App Store inclut généralement la GST ; le montant au paiement prévaut",
    appStoreVatInclusive: "Le prix App Store inclut généralement la TVA ; le montant au paiement prévaut",
    digitalServiceTaxVaries: "La fiscalité des services numériques peut varier selon le service ; le montant au paiement prévaut",
    noCountryProfile: "Aucun profil fiscal n’est encore disponible pour ce pays ; le montant App Store au paiement prévaut",
    checkoutApplies: "Le montant affiché au paiement prévaut",
    unknown: "Le traitement fiscal varie selon la région ; le montant App Store au paiement prévaut",
    terms: { "consumption tax": "taxe à la consommation", "service tax": "taxe sur les services", "sales tax": "taxe de vente", "by region": "selon la région" },
  },
  it: {
    include: (l,u) => u ? `Di norma include ${l}` : `Include ${l}`,
    provinceVaries: (d) => d ? `La GST/HST (${d}) varia per provincia` : "La GST/HST varia per provincia",
    stateIcsmVaries: "L’ICMS varia per stato", stateSalesTaxVaries: "L’imposta sulle vendite varia per stato",
    regionalSalesTaxVaries: "L’imposta sulle vendite varia per regione", vatNeedsReview: "Il trattamento IVA deve essere verificato",
    usuallyGstInclusive: "Di norma include la GST; fa fede l’importo al pagamento",
    usuallyVatInclusive: "Di norma include l’IVA; fa fede l’importo al pagamento",
    appStoreGstInclusive: "Il prezzo App Store di norma include la GST; fa fede l’importo al pagamento",
    appStoreVatInclusive: "Il prezzo App Store di norma include l’IVA; fa fede l’importo al pagamento",
    digitalServiceTaxVaries: "Il trattamento fiscale dei servizi digitali può variare per servizio; fa fede l’importo al pagamento",
    noCountryProfile: "Non è ancora disponibile un profilo fiscale per questo paese; fa fede l’importo App Store al pagamento",
    checkoutApplies: "Fa fede l’importo mostrato al pagamento",
    unknown: "Il trattamento fiscale varia per regione; fa fede l’importo App Store al pagamento",
    terms: { "consumption tax": "imposta sui consumi", "service tax": "imposta sui servizi", "sales tax": "imposta sulle vendite", "by region": "per regione" },
  },
  de: {
    include: (l,u) => u ? `Enthält üblicherweise ${l}` : `Enthält ${l}`,
    provinceVaries: (d) => d ? `GST/HST (${d}) variiert nach Provinz` : "GST/HST variiert nach Provinz",
    stateIcsmVaries: "ICMS variiert nach Bundesstaat", stateSalesTaxVaries: "Verkaufssteuer variiert nach Bundesstaat",
    regionalSalesTaxVaries: "Verkaufssteuer variiert nach Region", vatNeedsReview: "Die Umsatzsteuerbehandlung muss geprüft werden",
    usuallyGstInclusive: "GST ist üblicherweise enthalten; maßgeblich ist der Betrag beim Bezahlen",
    usuallyVatInclusive: "Umsatzsteuer ist üblicherweise enthalten; maßgeblich ist der Betrag beim Bezahlen",
    appStoreGstInclusive: "Der App-Store-Preis enthält üblicherweise GST; maßgeblich ist der Betrag beim Bezahlen",
    appStoreVatInclusive: "Der App-Store-Preis enthält üblicherweise Umsatzsteuer; maßgeblich ist der Betrag beim Bezahlen",
    digitalServiceTaxVaries: "Die Besteuerung digitaler Dienste kann je nach Dienst variieren; maßgeblich ist der Betrag beim Bezahlen",
    noCountryProfile: "Für dieses Land liegt noch kein Steuerprofil vor; maßgeblich ist der App-Store-Betrag beim Bezahlen",
    checkoutApplies: "Maßgeblich ist der beim Bezahlen angezeigte Betrag",
    unknown: "Die steuerliche Behandlung variiert nach Region; maßgeblich ist der App-Store-Betrag beim Bezahlen",
    terms: { "consumption tax": "Verbrauchssteuer", "service tax": "Dienstleistungssteuer", "sales tax": "Verkaufssteuer", "by region": "je nach Region" },
  },
  pt: {
    include: (l,u) => u ? `Normalmente inclui ${l}` : `Inclui ${l}`,
    provinceVaries: (d) => d ? `O GST/HST (${d}) varia por província` : "O GST/HST varia por província",
    stateIcsmVaries: "O ICMS varia por estado", stateSalesTaxVaries: "O imposto sobre vendas varia por estado",
    regionalSalesTaxVaries: "O imposto sobre vendas varia por região", vatNeedsReview: "O tratamento do IVA precisa de verificação",
    usuallyGstInclusive: "Normalmente inclui GST; prevalece o valor no pagamento",
    usuallyVatInclusive: "Normalmente inclui IVA; prevalece o valor no pagamento",
    appStoreGstInclusive: "O preço da App Store normalmente inclui GST; prevalece o valor no pagamento",
    appStoreVatInclusive: "O preço da App Store normalmente inclui IVA; prevalece o valor no pagamento",
    digitalServiceTaxVaries: "O tratamento fiscal dos serviços digitais pode variar por serviço; prevalece o valor no pagamento",
    noCountryProfile: "Ainda não existe um perfil fiscal para este país; prevalece o valor da App Store no pagamento",
    checkoutApplies: "Prevalece o valor apresentado no pagamento",
    unknown: "O tratamento fiscal varia por região; prevalece o valor da App Store no pagamento",
    terms: { "consumption tax": "imposto sobre o consumo", "service tax": "imposto sobre serviços", "sales tax": "imposto sobre vendas", "by region": "por região" },
  },
} satisfies Record<
  Exclude<PreparedSiteLocale, "en" | "zh-tw">,
  TaxNoteCopy
>);

function localizeIncludedLabel(label: string, copy: TaxNoteCopy) {
  return Object.entries(copy.terms).reduce(
    (result, [source, translated]) =>
      result.replace(new RegExp(source, "gi"), translated),
    label,
  );
}

export function localizeTaxNote(
  value: string,
  locale: PreparedSiteLocale,
  options: { unknownFallback?: boolean } = {},
) {
  const raw = value.trim();
  if (!raw || locale === "en") return raw;

  const copy = taxNoteCopy[locale];
  const includeMatch = raw.match(/^(?:Includes|Usually includes)\s+(.+)$/i);
  if (includeMatch) {
    return copy.include(
      localizeIncludedLabel(includeMatch[1], copy),
      /^Usually includes/i.test(raw),
    );
  }

  const provinceMatch = raw.match(/^GST\/HST varies by province(?:,\s*(.+))?$/i);
  if (provinceMatch) return copy.provinceVaries(provinceMatch[1]);
  if (/State ICMS varies/i.test(raw)) return copy.stateIcsmVaries;
  if (/Sales tax varies by state/i.test(raw)) return copy.stateSalesTaxVaries;
  if (/Sales tax varies by region/i.test(raw)) return copy.regionalSalesTaxVaries;
  if (/VAT treatment needs review/i.test(raw)) return copy.vatNeedsReview;
  if (/Usually GST-inclusive/i.test(raw)) return copy.usuallyGstInclusive;
  if (/Usually VAT-inclusive/i.test(raw)) return copy.usuallyVatInclusive;
  if (/App Store list price.*GST-inclusive/i.test(raw)) return copy.appStoreGstInclusive;
  if (/App Store list price.*VAT-inclusive/i.test(raw)) return copy.appStoreVatInclusive;
  if (/Digital service tax treatment may vary/i.test(raw)) return copy.digitalServiceTaxVaries;
  if (/No country tax-rate profile matched yet/i.test(raw)) return copy.noCountryProfile;
  if (/final checkout applies/i.test(raw)) return copy.checkoutApplies;

  return options.unknownFallback ? copy.unknown : raw;
}

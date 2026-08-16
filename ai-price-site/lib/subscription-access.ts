import type { PreparedSiteLocale } from "./site-locale";
import type { RegionPrice } from "./public-pricing-model";

export type SubscriptionAccessEvidence = "confirmed" | "conditional" | "unknown";

export type SubscriptionAccessFact = {
  key: "store" | "account" | "payment" | "giftCard" | "source" | "checked";
  evidence: SubscriptionAccessEvidence;
};

export type SubscriptionAccessAssessment = {
  conclusion: "restrictions" | "incomplete";
  facts: SubscriptionAccessFact[];
};

const ACCOUNT_PATTERN = /apple\s*(?:id|account)|account\s*(?:country|region)|账号地区|帳號地區|アカウント.*地域|계정.*지역|pa[ií]s.*cuenta|regi[oó]n.*cuenta|hesap.*bölge|بلد.*الحساب|r[eé]gion.*compte|paese.*account|kontoland|regi[aã]o.*conta/i;
const PAYMENT_PATTERN = /payment method|local payment|付款方式|支付方式|付款方法|支払い方法|결제 수단|m[eé]todo de pago|[oö]deme y[oö]ntemi|طريقة الدفع|moyen de paiement|metodo di pagamento|zahlungsmethode|m[eé]todo de pagamento/i;

export function assessSubscriptionAccess(
  region: Pick<
    RegionPrice,
    | "billingPlatform"
    | "localPriceValue"
    | "riskRequirements"
    | "sourceUrl"
    | "lastCheckedAt"
  >,
): SubscriptionAccessAssessment {
  const requirements = region.riskRequirements?.trim() || "";
  const accountConditional = ACCOUNT_PATTERN.test(requirements);
  const paymentConditional = PAYMENT_PATTERN.test(requirements);

  const facts: SubscriptionAccessFact[] = [
    {
      key: "store",
      evidence:
        region.billingPlatform === "ios" && Number(region.localPriceValue) > 0
          ? "confirmed"
          : "unknown",
    },
    {
      key: "account",
      evidence: accountConditional ? "conditional" : "unknown",
    },
    {
      key: "payment",
      evidence: paymentConditional ? "conditional" : "unknown",
    },
    // A generic risk profile mentioning gift cards is not proof that Apple or
    // the product officially supports gift-card payment in this country.
    { key: "giftCard", evidence: "unknown" },
    { key: "source", evidence: region.sourceUrl ? "confirmed" : "unknown" },
    { key: "checked", evidence: region.lastCheckedAt ? "confirmed" : "unknown" },
  ];

  return {
    conclusion:
      accountConditional || paymentConditional ? "restrictions" : "incomplete",
    facts,
  };
}

type SubscriptionAccessCopy = {
  conclusion: Record<SubscriptionAccessAssessment["conclusion"], string>;
  facts: Record<SubscriptionAccessFact["key"], string>;
  evidence: Record<SubscriptionAccessEvidence, string>;
  checkedValue: (date: string) => string;
};

const englishCopy: SubscriptionAccessCopy = {
  conclusion: {
    restrictions: "Conditions apply",
    incomplete: "Details incomplete",
  },
  facts: {
    store: "Plan listed in this App Store",
    account: "Matching account region",
    payment: "Local payment method",
    giftCard: "Official gift-card support",
    source: "Official source link",
    checked: "Price verification date",
  },
  evidence: {
    confirmed: "Confirmed",
    conditional: "May be required",
    unknown: "Not verified",
  },
  checkedValue: (date) => `Checked ${date}`,
};

const copyByLocale = {
  zh: {
    conclusion: { restrictions: "存在限制", incomplete: "条件不完整" },
    facts: {
      store: "当地 App Store 已列出该套餐",
      account: "账号地区是否需要匹配",
      payment: "是否需要当地付款方式",
      giftCard: "礼品卡是否获官方支持",
      source: "官方来源入口",
      checked: "价格核验日期",
    },
    evidence: { confirmed: "已确认", conditional: "可能需要", unknown: "未核验" },
    checkedValue: (date) => `核验于 ${date}`,
  },
  "zh-tw": {
    conclusion: { restrictions: "存在限制", incomplete: "條件不完整" },
    facts: {
      store: "當地 App Store 已列出此方案",
      account: "帳號地區是否需要一致",
      payment: "是否需要當地付款方式",
      giftCard: "禮品卡是否獲官方支援",
      source: "官方來源連結",
      checked: "價格核驗日期",
    },
    evidence: { confirmed: "已確認", conditional: "可能需要", unknown: "未核驗" },
    checkedValue: (date) => `核驗於 ${date}`,
  },
  en: englishCopy,
  ja: {
    conclusion: { restrictions: "条件あり", incomplete: "条件未確認" },
    facts: {
      store: "現地 App Store でのプラン掲載",
      account: "アカウント地域の一致",
      payment: "現地の支払い方法",
      giftCard: "公式ギフトカード対応",
      source: "公式ソース",
      checked: "価格確認日",
    },
    evidence: { confirmed: "確認済み", conditional: "必要な場合あり", unknown: "未確認" },
    checkedValue: (date) => `${date} に確認`,
  },
  ko: {
    conclusion: { restrictions: "조건 있음", incomplete: "조건 미확인" },
    facts: {
      store: "현지 App Store 요금제 등록",
      account: "계정 지역 일치 여부",
      payment: "현지 결제 수단",
      giftCard: "공식 기프트 카드 지원",
      source: "공식 출처 링크",
      checked: "가격 확인일",
    },
    evidence: { confirmed: "확인됨", conditional: "필요할 수 있음", unknown: "미확인" },
    checkedValue: (date) => `${date} 확인`,
  },
  es: {
    conclusion: { restrictions: "Hay condiciones", incomplete: "Datos incompletos" },
    facts: {
      store: "Plan disponible en la App Store local",
      account: "Coincidencia de la región de la cuenta",
      payment: "Método de pago local",
      giftCard: "Compatibilidad oficial con tarjetas regalo",
      source: "Enlace a la fuente oficial",
      checked: "Fecha de verificación del precio",
    },
    evidence: { confirmed: "Confirmado", conditional: "Puede ser necesario", unknown: "Sin verificar" },
    checkedValue: (date) => `Verificado el ${date}`,
  },
  tr: {
    conclusion: { restrictions: "Koşullar var", incomplete: "Koşullar eksik" },
    facts: {
      store: "Paket yerel App Store'da listeleniyor",
      account: "Hesap bölgesinin eşleşmesi",
      payment: "Yerel ödeme yöntemi",
      giftCard: "Resmî hediye kartı desteği",
      source: "Resmî kaynak bağlantısı",
      checked: "Fiyat doğrulama tarihi",
    },
    evidence: { confirmed: "Doğrulandı", conditional: "Gerekebilir", unknown: "Doğrulanmadı" },
    checkedValue: (date) => `${date} tarihinde doğrulandı`,
  },
  ar: {
    conclusion: { restrictions: "توجد شروط", incomplete: "الشروط غير مكتملة" },
    facts: {
      store: "الباقة مدرجة في App Store المحلي",
      account: "مطابقة منطقة الحساب",
      payment: "وسيلة دفع محلية",
      giftCard: "دعم رسمي لبطاقات الهدايا",
      source: "رابط المصدر الرسمي",
      checked: "تاريخ التحقق من السعر",
    },
    evidence: { confirmed: "مؤكد", conditional: "قد يكون مطلوباً", unknown: "غير متحقق" },
    checkedValue: (date) => `تم التحقق في ${date}`,
  },
  fr: {
    conclusion: { restrictions: "Conditions applicables", incomplete: "Conditions incomplètes" },
    facts: {
      store: "Offre présente dans l’App Store local",
      account: "Correspondance de la région du compte",
      payment: "Moyen de paiement local",
      giftCard: "Prise en charge officielle des cartes cadeaux",
      source: "Lien vers la source officielle",
      checked: "Date de vérification du prix",
    },
    evidence: { confirmed: "Confirmé", conditional: "Peut être requis", unknown: "Non vérifié" },
    checkedValue: (date) => `Vérifié le ${date}`,
  },
  it: {
    conclusion: { restrictions: "Si applicano condizioni", incomplete: "Condizioni incomplete" },
    facts: {
      store: "Piano presente nell’App Store locale",
      account: "Corrispondenza della regione dell’account",
      payment: "Metodo di pagamento locale",
      giftCard: "Supporto ufficiale per carte regalo",
      source: "Link alla fonte ufficiale",
      checked: "Data di verifica del prezzo",
    },
    evidence: { confirmed: "Confermato", conditional: "Potrebbe essere richiesto", unknown: "Non verificato" },
    checkedValue: (date) => `Verificato il ${date}`,
  },
  de: {
    conclusion: { restrictions: "Bedingungen gelten", incomplete: "Bedingungen unvollständig" },
    facts: {
      store: "Tarif im lokalen App Store gelistet",
      account: "Übereinstimmende Accountregion",
      payment: "Lokale Zahlungsmethode",
      giftCard: "Offizielle Geschenkkarten-Unterstützung",
      source: "Link zur offiziellen Quelle",
      checked: "Datum der Preisprüfung",
    },
    evidence: { confirmed: "Bestätigt", conditional: "Kann erforderlich sein", unknown: "Nicht geprüft" },
    checkedValue: (date) => `Geprüft am ${date}`,
  },
  pt: {
    conclusion: { restrictions: "Existem condições", incomplete: "Condições incompletas" },
    facts: {
      store: "Plano disponível na App Store local",
      account: "Correspondência da região da conta",
      payment: "Método de pagamento local",
      giftCard: "Suporte oficial para cartões-presente",
      source: "Ligação para a fonte oficial",
      checked: "Data de verificação do preço",
    },
    evidence: { confirmed: "Confirmado", conditional: "Pode ser necessário", unknown: "Não verificado" },
    checkedValue: (date) => `Verificado em ${date}`,
  },
} satisfies Record<PreparedSiteLocale, SubscriptionAccessCopy>;

export function getSubscriptionAccessCopy(locale: PreparedSiteLocale) {
  return copyByLocale[locale] || englishCopy;
}

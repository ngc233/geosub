import type { RegionPrice } from "./public-pricing-model";
import type { DetailLocale } from "./detail-page-copy";
import { hasBrokenText, hasCjkText } from "./pricing-detail-tax";

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);

  if (value && typeof value === "object" && "toString" in value) {
    return Number(value.toString());
  }

  return 0;
}
export function getRiskLevel(value: string | null): RegionPrice["riskLevel"] {
  if (value === "low" || value === "medium" || value === "high" || value === "unknown") {
    return value;
  }

  return "unknown";
}

export function getRiskLevelFromScore(score: number): RegionPrice["riskLevel"] {
  if (score <= 49) return "low";
  if (score <= 74) return "medium";
  return "high";
}

export function clampRiskScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getRiskLevelLabel(level: RegionPrice["riskLevel"], locale: DetailLocale) {
  if (locale === "fr") {
    if (level === "low") return "Faible";
    if (level === "high") return "Élevé";
    if (level === "medium") return "Modéré";
    return "Non vérifié";
  }
  if (locale === "it") {
    if (level === "low") return "Basso";
    if (level === "high") return "Alto";
    if (level === "medium") return "Medio";
    return "Non verificato";
  }
  if (locale === "de") {
    if (level === "low") return "Niedrig";
    if (level === "high") return "Hoch";
    if (level === "medium") return "Mittel";
    return "Ungeprüft";
  }
  if (locale === "pt") {
    if (level === "low") return "Baixo";
    if (level === "high") return "Alto";
    if (level === "medium") return "Médio";
    return "Não verificado";
  }
  if (locale === "ar") {
    if (level === "low") return "منخفض";
    if (level === "high") return "مرتفع";
    if (level === "medium") return "متوسط";
    return "غير موثق";
  }

  if (locale === "tr") {
    if (level === "low") return "Düşük";
    if (level === "high") return "Yüksek";
    if (level === "medium") return "Orta";
    return "Doğrulanmadı";
  }

  if (locale === "es") {
    if (level === "low") return "Bajo";
    if (level === "high") return "Alto";
    if (level === "medium") return "Medio";
    return "Sin verificar";
  }

  if (locale === "ko") {
    if (level === "low") return "낮음";
    if (level === "high") return "높음";
    if (level === "medium") return "중간";
    return "미확인";
  }

  if (locale === "ja") {
    if (level === "low") return "低";
    if (level === "high") return "高";
    if (level === "medium") return "中";
    return "未確認";
  }

  if (locale !== "zh") {
    if (level === "low") return "Low";
    if (level === "high") return "High";
    if (level === "medium") return "Medium";
    return "Unverified";
  }

  if (level === "low") return "低";
  if (level === "high") return "高";
  if (level === "medium") return "中";
  return "待核验";
}

export function translateRiskProfileTextToZh(value: string) {
  const raw = value.trim();

  if (/Apple ID region|account region|payment method|billing information/i.test(raw)) {
    return "跨区订阅可能受到 Apple ID 或账号地区、付款方式、账单信息和平台风控影响。";
  }

  if (/gift card|local payment|local billing|VPN/i.test(raw)) {
    return "可能需要当地付款方式或账单资料；使用礼品卡或网络位置切换仍可能触发平台核验。";
  }

  if (/tax|checkout|final price/i.test(raw)) {
    return "展示价格可能与最终结算价存在税费差异，请以官方结算页为准。";
  }

  if (/availability|not available|region restriction/i.test(raw)) {
    return "该服务或套餐可能受地区可用性限制，请以当地 App Store 实际展示为准。";
  }

  return "该地区的跨区订阅条件仍需核验，请以官方结算页和平台规则为准。";
}

export function translateRiskProfileTextToJa(value: string) {
  const raw = value.trim();

  if (/Apple ID region|account region|payment method|billing information/i.test(raw)) {
    return "地域をまたぐ契約では、Apple Accountの地域、支払い方法、請求先情報、プラットフォームの審査が影響する場合があります。";
  }

  if (/gift card|local payment|local billing|VPN/i.test(raw)) {
    return "現地の支払い方法や請求先情報が必要な場合があります。ギフトカードや接続地域の変更を利用しても、プラットフォームの確認対象になることがあります。";
  }

  if (/tax|checkout|final price/i.test(raw)) {
    return "表示価格と最終支払額は税金などにより異なる場合があります。公式の購入画面をご確認ください。";
  }

  if (/availability|not available|region restriction/i.test(raw)) {
    return "サービスまたはプランは地域によって利用できない場合があります。現地のApp Store表示をご確認ください。";
  }

  return "この地域での契約条件は、公式の購入画面とプラットフォームの規則をご確認ください。";
}

export function translateRiskProfileTextToKo(value: string) {
  const raw = value.trim();

  if (/Apple ID region|account region|payment method|billing information/i.test(raw)) {
    return "지역 간 구독은 Apple Account의 국가·지역, 결제 수단, 청구 정보와 플랫폼 심사의 영향을 받을 수 있습니다.";
  }

  if (/gift card|local payment|local billing|VPN/i.test(raw)) {
    return "현지 결제 수단이나 청구 정보가 필요할 수 있습니다. 기프트 카드나 접속 지역을 변경해도 플랫폼의 확인 대상이 될 수 있습니다.";
  }

  if (/tax|checkout|final price/i.test(raw)) {
    return "표시 가격과 최종 결제 금액은 세금 등에 따라 달라질 수 있습니다. 공식 결제 화면에서 확인하세요.";
  }

  if (/availability|not available|region restriction/i.test(raw)) {
    return "서비스 또는 요금제는 지역에 따라 이용하지 못할 수 있습니다. 현지 App Store 표시를 확인하세요.";
  }

  return "이 지역의 구독 조건은 공식 결제 화면과 플랫폼 정책을 확인하세요.";
}

export function translateRiskProfileTextToEs(value: string) {
  const raw = value.trim();

  if (/Apple ID region|account region|payment method|billing information/i.test(raw)) {
    return "Las suscripciones entre regiones pueden depender del país o la región de la cuenta de Apple, el método de pago, los datos de facturación y las comprobaciones de la plataforma.";
  }

  if (/gift card|local payment|local billing|VPN/i.test(raw)) {
    return "Puede ser necesario disponer de un método de pago o una dirección de facturación local. Las tarjetas regalo o el cambio de ubicación de red también pueden activar comprobaciones de la plataforma.";
  }

  if (/tax|checkout|final price/i.test(raw)) {
    return "El precio mostrado y el importe final pueden diferir por los impuestos. Confirma el total en la pantalla oficial de pago.";
  }

  if (/availability|not available|region restriction/i.test(raw)) {
    return "El servicio o el plan puede no estar disponible en todas las regiones. Comprueba lo que aparece en la App Store local.";
  }

  return "Consulta las condiciones de suscripción de esta región en la pantalla oficial de pago y en las normas de la plataforma.";
}

export function translateRiskProfileTextToTr(value: string) {
  const raw = value.trim();

  if (/Apple ID region|account region|payment method|billing information/i.test(raw)) {
    return "Bölgeler arası aboneliklerde Apple hesabının ülkesi veya bölgesi, ödeme yöntemi, fatura bilgileri ve platform kontrolleri etkili olabilir.";
  }

  if (/gift card|local payment|local billing|VPN/i.test(raw)) {
    return "Yerel bir ödeme yöntemi veya fatura adresi gerekebilir. Hediye kartı ya da ağ konumunu değiştirmek de platform kontrollerini tetikleyebilir.";
  }

  if (/tax|checkout|final price/i.test(raw)) {
    return "Gösterilen fiyat ile son ödeme tutarı vergiler nedeniyle farklı olabilir. Toplam tutarı resmî ödeme ekranında doğrulayın.";
  }

  if (/availability|not available|region restriction/i.test(raw)) {
    return "Hizmet veya paket her bölgede sunulmayabilir. Yerel App Store sayfasındaki kullanılabilirliği kontrol edin.";
  }

  return "Bu bölgedeki abonelik koşullarını resmî ödeme ekranından ve platform kurallarından kontrol edin.";
}

export function translateRiskProfileTextToAr(value: string) {
  const raw = value.trim();

  if (/Apple ID region|account region|payment method|billing information/i.test(raw)) {
    return "قد تتأثر الاشتراكات بين المناطق ببلد أو منطقة حساب Apple وطريقة الدفع وبيانات الفوترة وضوابط المنصة.";
  }

  if (/gift card|local payment|local billing|VPN/i.test(raw)) {
    return "قد يلزم استخدام وسيلة دفع أو عنوان فوترة محلي. وقد تؤدي بطاقات الهدايا أو تغيير موقع الشبكة أيضاً إلى مراجعات إضافية من المنصة.";
  }

  if (/tax|checkout|final price/i.test(raw)) {
    return "قد يختلف السعر المعروض عن المبلغ النهائي بسبب الضرائب. تحقّق من الإجمالي في شاشة الدفع الرسمية.";
  }

  if (/availability|not available|region restriction/i.test(raw)) {
    return "قد لا تتوفر الخدمة أو الباقة في جميع المناطق. تحقّق من ظهورها في App Store المحلي.";
  }

  return "راجِع شروط الاشتراك في هذه المنطقة عبر شاشة الدفع الرسمية وقواعد المنصة.";
}

export function translateRiskProfileTextToLatin(
  value: string,
  locale: Extract<DetailLocale, "fr" | "it" | "de" | "pt">,
) {
  const raw = value.trim();
  const copy = {
    fr: {
      account: "Les abonnements entre régions peuvent dépendre du pays du compte Apple, du moyen de paiement, des coordonnées de facturation et des contrôles de la plateforme.",
      payment: "Un moyen de paiement ou une adresse de facturation locale peut être nécessaire. Les cartes cadeaux ou un changement de localisation réseau peuvent aussi déclencher des contrôles.",
      tax: "Le prix affiché peut différer du montant final en raison des taxes. Vérifiez le total sur la page de paiement officielle.",
      availability: "Le service ou l’offre peut ne pas être disponible dans toutes les régions. Vérifiez sa présence dans l’App Store local.",
      source: "La source n’est pas l’App Store ; l’évaluation du risque est donc uniquement indicative.",
      lowPrice: "Le prix est nettement inférieur à la référence américaine ; vérifiez attentivement le paiement et le pays du compte.",
      highPrice: "Le prix est nettement supérieur à la référence américaine. Il s’agit surtout d’un surcoût, pas nécessairement d’un risque de plateforme.",
      taxLow: "La fiabilité des informations fiscales est faible et doit être vérifiée.",
      fallback: "Vérifiez les conditions d’abonnement de cette région sur la page de paiement officielle et dans les règles de la plateforme.",
    },
    it: {
      account: "Gli abbonamenti tra regioni possono dipendere dal paese dell’account Apple, dal metodo di pagamento, dai dati di fatturazione e dai controlli della piattaforma.",
      payment: "Può essere necessario un metodo di pagamento o un indirizzo di fatturazione locale. Anche carte regalo o cambi di posizione della rete possono attivare controlli.",
      tax: "Il prezzo mostrato può differire dall’importo finale per effetto delle imposte. Verifica il totale nella pagina di pagamento ufficiale.",
      availability: "Il servizio o il piano potrebbe non essere disponibile in tutte le regioni. Verifica la disponibilità nell’App Store locale.",
      source: "La fonte non è l’App Store; la valutazione del rischio è quindi solo indicativa.",
      lowPrice: "Il prezzo è nettamente inferiore al riferimento statunitense; verifica con attenzione pagamento e paese dell’account.",
      highPrice: "Il prezzo è nettamente superiore al riferimento statunitense. Si tratta soprattutto di un maggior costo, non necessariamente di un rischio della piattaforma.",
      taxLow: "Le informazioni fiscali hanno un’affidabilità bassa e devono essere verificate.",
      fallback: "Verifica le condizioni di abbonamento della regione nella pagina di pagamento ufficiale e nelle regole della piattaforma.",
    },
    de: {
      account: "Regionsübergreifende Abonnements können vom Land des Apple-Kontos, der Zahlungsmethode, den Rechnungsdaten und den Plattformprüfungen abhängen.",
      payment: "Möglicherweise sind eine lokale Zahlungsmethode oder Rechnungsadresse erforderlich. Auch Geschenkkarten oder ein geänderter Netzwerkstandort können Prüfungen auslösen.",
      tax: "Der angezeigte Preis kann wegen Steuern vom Endbetrag abweichen. Prüfen Sie die Summe auf der offiziellen Zahlungsseite.",
      availability: "Der Dienst oder Tarif ist möglicherweise nicht in allen Regionen verfügbar. Prüfen Sie das Angebot im lokalen App Store.",
      source: "Die Quelle ist nicht der App Store; die Risikobewertung ist daher nur ein Richtwert.",
      lowPrice: "Der Preis liegt deutlich unter der US-Referenz; prüfen Sie Zahlungsmethode und Kontoland besonders sorgfältig.",
      highPrice: "Der Preis liegt deutlich über der US-Referenz. Das ist vor allem ein Kostenfaktor und nicht zwingend ein Plattformrisiko.",
      taxLow: "Die Steuerinformationen haben eine geringe Verlässlichkeit und sollten geprüft werden.",
      fallback: "Prüfen Sie die Abonnementbedingungen dieser Region auf der offiziellen Zahlungsseite und in den Plattformregeln.",
    },
    pt: {
      account: "As assinaturas entre regiões podem depender do país da conta Apple, do método de pagamento, dos dados de faturação e dos controlos da plataforma.",
      payment: "Poderá ser necessário um método de pagamento ou endereço de faturação local. Cartões-oferta ou alterações da localização da rede também podem desencadear controlos.",
      tax: "O preço apresentado pode diferir do valor final devido a impostos. Confirme o total na página oficial de pagamento.",
      availability: "O serviço ou plano pode não estar disponível em todas as regiões. Confirme a disponibilidade na App Store local.",
      source: "A fonte não é a App Store; a avaliação de risco é, por isso, apenas indicativa.",
      lowPrice: "O preço está claramente abaixo da referência dos EUA; verifique com atenção o pagamento e o país da conta.",
      highPrice: "O preço está claramente acima da referência dos EUA. Trata-se sobretudo de um custo maior, não necessariamente de um risco da plataforma.",
      taxLow: "A informação fiscal tem baixa fiabilidade e deve ser verificada.",
      fallback: "Consulte as condições de assinatura desta região na página oficial de pagamento e nas regras da plataforma.",
    },
  }[locale];

  if (/Apple ID region|account region|payment method|billing information/i.test(raw)) return copy.account;
  if (/gift card|local payment|local billing|VPN/i.test(raw)) return copy.payment;
  if (/not an App Store source/i.test(raw)) return copy.source;
  if (/far below|clearly below/i.test(raw)) return copy.lowPrice;
  if (/far above/i.test(raw)) return copy.highPrice;
  if (/Tax profile confidence is low/i.test(raw)) return copy.taxLow;
  if (/tax|checkout|final price/i.test(raw)) return copy.tax;
  if (/availability|not available|region restriction/i.test(raw)) return copy.availability;
  return copy.fallback;
}

export function getLocalizedRiskProfileText({
  zh,
  en,
  locale,
}: {
  zh: string | null;
  en: string | null;
  locale: DetailLocale;
}) {
  const zhText = zh?.trim();
  const enText = en?.trim();
  const canonical = enText || zhText;

  if (!canonical) return undefined;
  if (locale === "ja") {
    return translateRiskProfileTextToJa(canonical);
  }
  if (locale === "ko") {
    return translateRiskProfileTextToKo(canonical);
  }
  if (locale === "es") {
    return translateRiskProfileTextToEs(canonical);
  }
  if (locale === "tr") {
    return translateRiskProfileTextToTr(canonical);
  }
  if (locale === "ar") {
    return translateRiskProfileTextToAr(canonical);
  }
  if (locale === "fr" || locale === "it" || locale === "de" || locale === "pt") {
    return translateRiskProfileTextToLatin(canonical, locale);
  }
  if (locale !== "zh") return canonical;

  if (zhText && !hasBrokenText(zhText) && hasCjkText(zhText)) {
    return zhText;
  }

  return enText ? translateRiskProfileTextToZh(enText) : undefined;
}

export function assessAppStoreRisk({
  baseLevel,
  baseScore,
  baseFactors,
  baseNote,
  requirements,
  diffPercent,
  taxConfidence,
  taxVariable,
  billingPlatform,
  locale,
}: {
  baseLevel: string | null;
  baseScore: unknown;
  baseFactors?: string;
  baseNote?: string;
  requirements?: string;
  diffPercent: number;
  taxConfidence: string | null;
  taxVariable: boolean | null;
  billingPlatform: string | null;
  locale: DetailLocale;
}) {
  const factors: string[] = [];
  let score = toNumber(baseScore);

  if (score <= 0) {
    const level = getRiskLevel(baseLevel);
    score = level === "low" ? 42 : level === "high" ? 78 : level === "medium" ? 62 : 58;
  }

  if (baseFactors) factors.push(baseFactors);

  const platform = (billingPlatform || "unknown").toLowerCase();
  if (platform !== "ios") {
    score += 5;
    factors.push(
      locale === "zh"
        ? "当前不是 App Store 来源，风险模型仅作参考。"
        : locale === "ja"
          ? "App Store以外の情報元であるため、リスク評価は参考値です。"
          : locale === "ko"
            ? "App Store 이외의 출처이므로 위험 평가는 참고용입니다."
            : locale === "es"
              ? "La fuente no es App Store, por lo que la evaluación de riesgo es solo orientativa."
              : locale === "tr"
                ? "Kaynak App Store olmadığı için risk değerlendirmesi yalnızca genel bir göstergedir."
                : locale === "ar"
                  ? "المصدر ليس App Store، لذا فإن تقييم المخاطر إرشادي فقط."
                : "This is not an App Store source, so the risk model is only indicative.",
    );
  }

  if (diffPercent <= -40) {
    score += 10;
    factors.push(
      locale === "zh"
        ? "价格大幅低于美国，跨区订阅时更需要关注付款和账号限制。"
        : locale === "ja"
          ? "米国基準より大幅に安いため、支払い方法とアカウント地域の条件に注意が必要です。"
          : locale === "ko"
            ? "미국 기준보다 크게 저렴하므로 결제 수단과 계정 지역 조건을 특히 확인해야 합니다."
            : locale === "es"
              ? "El precio está muy por debajo de la referencia de EE. UU.; conviene revisar con especial atención el método de pago y la región de la cuenta."
              : locale === "tr"
                ? "Fiyat ABD referansının çok altındadır; ödeme yöntemini ve hesap bölgesi koşullarını özellikle kontrol edin."
                : locale === "ar"
                  ? "السعر أقل بكثير من مرجع الولايات المتحدة؛ تحقّق بعناية من وسيلة الدفع وشروط منطقة الحساب."
                : "The price is far below the US reference, so payment and account restrictions deserve extra attention.",
    );
  } else if (diffPercent <= -25) {
    score += 6;
    factors.push(
      locale === "zh"
        ? "价格明显低于美国，建议以结算页能否完成为准。"
        : locale === "ja"
          ? "米国基準より明らかに安いため、公式の購入画面で手続きできるかをご確認ください。"
          : locale === "ko"
            ? "미국 기준보다 뚜렷하게 저렴하므로 공식 결제 화면에서 실제 구매 가능 여부를 확인하세요."
            : locale === "es"
              ? "El precio es claramente inferior a la referencia de EE. UU.; comprueba que la compra pueda completarse en la pantalla oficial de pago."
              : locale === "tr"
                ? "Fiyat ABD referansından belirgin biçimde düşüktür; satın alma işleminin resmî ödeme ekranında tamamlanabildiğini doğrulayın."
                : locale === "ar"
                  ? "السعر أقل بوضوح من مرجع الولايات المتحدة؛ تأكد من إمكانية إتمام الشراء في شاشة الدفع الرسمية."
                : "The price is clearly below the US reference; rely on checkout completion.",
    );
  } else if (diffPercent <= -12) {
    score += 3;
  } else if (diffPercent >= 45) {
    score += 3;
    factors.push(
      locale === "zh"
        ? "价格明显高于美国，主要体现为成本风险，不直接等同于平台高风控。"
        : locale === "ja"
          ? "米国基準より大幅に高い価格です。これは主に費用面の注意であり、プラットフォーム上の高リスクを直接示すものではありません。"
          : locale === "ko"
            ? "미국 기준보다 크게 비싼 가격입니다. 이는 주로 비용 부담을 뜻하며 플랫폼 위험이 높다는 의미는 아닙니다."
            : locale === "es"
              ? "El precio está muy por encima de la referencia de EE. UU. Esto supone sobre todo un mayor coste, no necesariamente un riesgo elevado de la plataforma."
              : locale === "tr"
                ? "Fiyat ABD referansının çok üzerindedir. Bu durum daha çok maliyet yükünü gösterir; tek başına yüksek platform riski anlamına gelmez."
                : locale === "ar"
                  ? "السعر أعلى بكثير من مرجع الولايات المتحدة. ويعكس ذلك عبئاً مالياً أكبر، لا خطراً مرتفعاً على المنصة بالضرورة."
                : "The price is far above the US reference; this is mainly cost risk, not high platform risk by itself.",
    );
  }

  if (taxVariable) {
    score += 3;
    factors.push(
      locale === "zh"
        ? "税费按州或省变化，结算价可能和展示价略有差异。"
        : locale === "ja"
          ? "税額は州や地域によって異なるため、最終支払額が表示価格と少し異なる場合があります。"
          : locale === "ko"
            ? "세금은 주나 지역에 따라 달라 최종 결제 금액이 표시 가격과 다를 수 있습니다."
            : locale === "es"
              ? "Los impuestos varían según el estado o la provincia, por lo que el importe final puede diferir del precio mostrado."
              : locale === "tr"
                ? "Vergiler eyalet veya bölgeye göre değişebildiği için son ödeme tutarı gösterilen fiyattan farklı olabilir."
                : locale === "ar"
                  ? "تختلف الضرائب حسب الولاية أو المنطقة، لذلك قد يختلف المبلغ النهائي عن السعر المعروض."
                : "Taxes vary by state or province, so checkout price may differ slightly.",
    );
  }

  if (taxConfidence === "low") {
    score += 5;
    factors.push(
      locale === "zh"
        ? "税务资料可信度较低。"
        : locale === "ja"
          ? "税情報の信頼性が低いため、確認が必要です。"
          : locale === "ko"
            ? "세금 정보의 신뢰도가 낮아 확인이 필요합니다."
            : locale === "es"
              ? "La información fiscal tiene una fiabilidad baja y conviene verificarla."
              : locale === "tr"
                ? "Vergi bilgilerinin güven düzeyi düşüktür; ayrıca doğrulanması gerekir."
                : locale === "ar"
                  ? "موثوقية المعلومات الضريبية منخفضة وتحتاج إلى تحقق إضافي."
                : "Tax profile confidence is low.",
    );
  } else if (taxConfidence === "medium") {
    score += 1;
  }

  const finalScore = clampRiskScore(score);
  const finalLevel = getRiskLevelFromScore(finalScore);
  const noteParts = [...new Set([requirements, baseNote].filter(Boolean))];
  const riskNote =
    noteParts.join(" ") ||
    (locale === "zh"
      ? "跨区订阅可能受到 Apple ID 地区、付款方式、账单信息和平台风控影响。"
      : locale === "ja"
        ? "地域をまたぐ契約では、Apple Accountの地域、支払い方法、請求先情報、プラットフォームの審査が影響する場合があります。"
        : locale === "ko"
          ? "지역 간 구독은 Apple Account의 국가·지역, 결제 수단, 청구 정보와 플랫폼 심사의 영향을 받을 수 있습니다."
          : locale === "es"
            ? "Las suscripciones entre regiones pueden depender del país o la región de la cuenta de Apple, el método de pago, los datos de facturación y las comprobaciones de la plataforma."
            : locale === "tr"
              ? "Bölgeler arası aboneliklerde Apple hesabının ülkesi veya bölgesi, ödeme yöntemi, fatura bilgileri ve platform kontrolleri etkili olabilir."
              : locale === "ar"
                ? "قد تتأثر الاشتراكات بين المناطق ببلد أو منطقة حساب Apple وطريقة الدفع وبيانات الفوترة وضوابط المنصة."
              : locale === "fr" || locale === "it" || locale === "de" || locale === "pt"
                ? translateRiskProfileTextToLatin("Apple ID region and payment method", locale)
              : "Cross-region subscription may be affected by Apple ID region, payment method, billing information, and platform risk controls.");

  return {
    level: finalLevel,
    score: finalScore,
    // The score remains an internal anomaly signal. Public pages show the
    // underlying subscription conditions instead of presenting it as fact.
    note: riskNote,
    factors: factors
      .map((factor) =>
        locale === "fr" || locale === "it" || locale === "de" || locale === "pt"
          ? translateRiskProfileTextToLatin(factor, locale)
          : factor,
      )
      .join(" "),
  };
}
export function getLocalizedRiskText({
  zh,
  en,
  locale,
}: {
  zh: string | null;
  en: string | null;
  locale: DetailLocale;
}) {
  return getLocalizedRiskProfileText({ zh, en, locale });
}


import type { DisplayCurrency } from "./display-currency";
import type { SiteLocale } from "./site-locale";

export type CurrencyPair = {
  slug: string;
  from: DisplayCurrency;
  to: DisplayCurrency;
};

const pair = (
  from: DisplayCurrency,
  to: DisplayCurrency,
): CurrencyPair => ({
  slug: `${from.toLowerCase()}-${to.toLowerCase()}`,
  from,
  to,
});

const featuredPairsByLocale: Record<SiteLocale, CurrencyPair[]> = {
  zh: [
    pair("USD", "CNY"),
    pair("USD", "HKD"),
    pair("USD", "TWD"),
    pair("USD", "SGD"),
    pair("USD", "JPY"),
    pair("USD", "EUR"),
  ],
  "zh-tw": [
    pair("USD", "TWD"),
    pair("CNY", "TWD"),
    pair("JPY", "TWD"),
    pair("KRW", "TWD"),
    pair("HKD", "TWD"),
  ],
  en: [
    pair("USD", "EUR"),
    pair("USD", "GBP"),
    pair("USD", "CAD"),
    pair("USD", "AUD"),
    pair("USD", "JPY"),
    pair("USD", "INR"),
  ],
  ja: [
    pair("USD", "JPY"),
    pair("EUR", "JPY"),
    pair("CNY", "JPY"),
    pair("KRW", "JPY"),
  ],
  ko: [
    pair("USD", "KRW"),
    pair("JPY", "KRW"),
    pair("CNY", "KRW"),
    pair("EUR", "KRW"),
  ],
  es: [
    pair("EUR", "USD"),
    pair("USD", "MXN"),
    pair("USD", "EUR"),
    pair("USD", "CAD"),
  ],
  tr: [
    pair("USD", "TRY"),
    pair("EUR", "TRY"),
    pair("GBP", "TRY"),
    pair("SAR", "TRY"),
  ],
  ar: [
    pair("USD", "SAR"),
    pair("EUR", "SAR"),
    pair("USD", "AED"),
    pair("TRY", "SAR"),
  ],
  fr: [
    pair("EUR", "USD"),
    pair("EUR", "GBP"),
    pair("EUR", "CHF"),
    pair("USD", "CAD"),
  ],
  it: [
    pair("EUR", "USD"),
    pair("EUR", "GBP"),
    pair("EUR", "CHF"),
    pair("USD", "EUR"),
  ],
  de: [
    pair("EUR", "USD"),
    pair("EUR", "GBP"),
    pair("EUR", "CHF"),
    pair("USD", "EUR"),
  ],
  pt: [
    pair("EUR", "USD"),
    pair("USD", "BRL"),
    pair("EUR", "GBP"),
    pair("USD", "EUR"),
  ],
};

export type CurrencyPairCopy = {
  title: (fromName: string, toName: string, pairCode: string) => string;
  description: (
    fromName: string,
    toName: string,
    fromCode: string,
    toCode: string,
  ) => string;
  eyebrow: string;
  currentRate: string;
  examplesTitle: string;
  examplesDescription: (fromCode: string, toCode: string) => string;
  methodologyTitle: string;
  methodology: string;
  paymentTitle: string;
  paymentNote: string;
  popularPairs: string;
  backToConverter: string;
  faqRate: (fromCode: string, toCode: string) => string;
  faqRateAnswer: string;
  faqCalculation: string;
  faqCalculationAnswer: (
    fromCode: string,
    toCode: string,
  ) => string;
  faqCharge: string;
  faqChargeAnswer: string;
};

const copyByLocale: Record<SiteLocale, CurrencyPairCopy> = {
  zh: {
    title: (from, to, code) => `${from}兑${to}汇率换算（${code}）`,
    description: (from, to, fromCode, toCode) =>
      `使用定期更新的参考汇率，将${from}（${fromCode}）换算为${to}（${toCode}），并查看常见订阅金额的快速对照。`,
    eyebrow: "精选货币对",
    currentRate: "当前参考汇率",
    examplesTitle: "常见金额换算",
    examplesDescription: (from, to) => `快速查看 ${from} 换算为 ${to} 的常见金额。`,
    methodologyTitle: "换算方法",
    methodology:
      "GeoSub 先把原币种折算为美元基准，再换算为目标币种。只有同步时间不超过 18 小时的汇率才会用于计算。",
    paymentTitle: "实际扣款提示",
    paymentNote:
      "银行卡、支付平台、税费与结算时间可能影响最终金额。本页适合估算，不代表发卡行报价。",
    popularPairs: "更多常用货币对",
    backToConverter: "返回完整汇率换算器",
    faqRate: (from, to) => `${from} 兑 ${to} 的汇率多久更新一次？`,
    faqRateAnswer: "参考汇率通常每 12 小时同步一次，页面会显示当前使用的汇率基准日期。",
    faqCalculation: "页面如何计算换算结果？",
    faqCalculationAnswer: (from, to) =>
      `系统使用同一批美元基准汇率计算 ${from} 与 ${to} 的交叉汇率，避免混用不同日期的数据。`,
    faqCharge: "为什么实际扣款与页面结果不同？",
    faqChargeAnswer:
      "发卡行点差、支付平台换汇费、税费和入账时间都可能让最终扣款略有不同。",
  },
  "zh-tw": {
    title: (from, to, code) => `${from}兌${to}匯率換算（${code}）`,
    description: (from, to, fromCode, toCode) =>
      `使用定期更新的參考匯率，將${from}（${fromCode}）換算為${to}（${toCode}），並查看常見訂閱金額的快速對照。`,
    eyebrow: "精選貨幣對",
    currentRate: "目前參考匯率",
    examplesTitle: "常見金額換算",
    examplesDescription: (from, to) => `快速查看 ${from} 換算為 ${to} 的常見金額。`,
    methodologyTitle: "換算方式",
    methodology:
      "GeoSub 先將原幣折算為美元基準，再換算為目標幣別。只有同步時間不超過 18 小時的匯率才會用於計算。",
    paymentTitle: "實際扣款提醒",
    paymentNote:
      "發卡銀行、付款平台、稅費與結算時間可能影響最終金額。本頁適合估算，不代表銀行實際報價。",
    popularPairs: "更多常用貨幣對",
    backToConverter: "返回完整匯率換算器",
    faqRate: (from, to) => `${from}兌${to}的匯率多久更新一次？`,
    faqRateAnswer: "參考匯率通常每 12 小時同步一次，頁面會顯示目前採用的匯率基準日。",
    faqCalculation: "頁面如何計算換算結果？",
    faqCalculationAnswer: (from, to) =>
      `系統使用同一批美元基準匯率計算 ${from} 與 ${to} 的交叉匯率，避免混用不同日期的資料。`,
    faqCharge: "為什麼實際扣款與頁面結果不同？",
    faqChargeAnswer:
      "發卡銀行價差、付款平台換匯費、稅費與入帳時間都可能讓最終扣款略有不同。",
  },
  en: {
    title: (from, to, code) => `${from} to ${to} converter (${code})`,
    description: (from, to, fromCode, toCode) =>
      `Convert ${from} (${fromCode}) to ${to} (${toCode}) with regularly refreshed reference rates and quick examples for common subscription amounts.`,
    eyebrow: "Featured currency pair",
    currentRate: "Current reference rate",
    examplesTitle: "Common conversion amounts",
    examplesDescription: (from, to) => `Quick examples for converting ${from} to ${to}.`,
    methodologyTitle: "How the conversion works",
    methodology:
      "GeoSub converts the source currency through the same USD reference set before calculating the target value. Rates older than 18 hours are not used.",
    paymentTitle: "Your final charge",
    paymentNote:
      "Card spreads, payment-platform fees, taxes, and settlement timing can change the final amount. This page is an estimate, not a bank quote.",
    popularPairs: "More popular currency pairs",
    backToConverter: "Back to the full currency converter",
    faqRate: (from, to) => `How often is the ${from} to ${to} rate updated?`,
    faqRateAnswer:
      "Reference rates normally synchronize every 12 hours, and the page shows the rate date currently in use.",
    faqCalculation: "How is the conversion calculated?",
    faqCalculationAnswer: (from, to) =>
      `GeoSub calculates the ${from}/${to} cross rate from one consistent set of USD reference rates instead of mixing data from different dates.`,
    faqCharge: "Why can my actual charge be different?",
    faqChargeAnswer:
      "Card-network spreads, payment-platform conversion fees, taxes, and settlement timing can all affect the final charge.",
  },
  ja: {
    title: (from, to, code) => `${from}から${to}への換算（${code}）`,
    description: (from, to, fromCode, toCode) =>
      `定期更新される参考レートで、${from}（${fromCode}）を${to}（${toCode}）に換算し、よく使われる金額の目安を確認できます。`,
    eyebrow: "主要通貨ペア",
    currentRate: "現在の参考レート",
    examplesTitle: "よく使われる金額の換算",
    examplesDescription: (from, to) => `${from}から${to}への換算例です。`,
    methodologyTitle: "換算方法",
    methodology:
      "GeoSubは同一時点の米ドル基準レートを介して換算します。更新から18時間を超えたレートは計算に使用しません。",
    paymentTitle: "実際の請求額について",
    paymentNote:
      "カード会社のスプレッド、決済手数料、税金、決済時刻により、実際の請求額は異なる場合があります。",
    popularPairs: "その他の主要通貨ペア",
    backToConverter: "通貨換算ツールに戻る",
    faqRate: (from, to) => `${from}から${to}のレートはいつ更新されますか？`,
    faqRateAnswer: "参考レートは通常12時間ごとに同期され、現在の基準日がページに表示されます。",
    faqCalculation: "換算結果はどのように計算されますか？",
    faqCalculationAnswer: (from, to) =>
      `${from}と${to}を同一時点の米ドル基準レートから計算し、異なる日付のデータは混在させません。`,
    faqCharge: "実際の請求額と異なるのはなぜですか？",
    faqChargeAnswer:
      "カード会社の為替スプレッド、決済手数料、税金、売上処理の時刻が最終金額に影響します。",
  },
  ko: {
    title: (from, to, code) => `${from}에서 ${to} 환율 계산기 (${code})`,
    description: (from, to, fromCode, toCode) =>
      `정기적으로 갱신되는 기준 환율로 ${from}(${fromCode})을 ${to}(${toCode})로 환산하고 자주 쓰는 구독 금액을 비교해 보세요.`,
    eyebrow: "주요 통화쌍",
    currentRate: "현재 기준 환율",
    examplesTitle: "자주 쓰는 금액 환산",
    examplesDescription: (from, to) => `${from}을 ${to}로 바꾼 예시입니다.`,
    methodologyTitle: "환산 방식",
    methodology:
      "GeoSub는 같은 시점의 미국 달러 기준 환율을 통해 교차 환율을 계산합니다. 18시간이 지난 환율은 사용하지 않습니다.",
    paymentTitle: "실제 결제 금액 안내",
    paymentNote:
      "카드사 환율 차이, 결제 플랫폼 수수료, 세금과 승인 시점에 따라 실제 청구액은 달라질 수 있습니다.",
    popularPairs: "다른 주요 통화쌍",
    backToConverter: "전체 환율 계산기로 돌아가기",
    faqRate: (from, to) => `${from}/${to} 환율은 얼마나 자주 갱신되나요?`,
    faqRateAnswer: "기준 환율은 보통 12시간마다 동기화되며 현재 적용 날짜가 페이지에 표시됩니다.",
    faqCalculation: "환산 결과는 어떻게 계산하나요?",
    faqCalculationAnswer: (from, to) =>
      `${from}과 ${to}를 동일한 미국 달러 기준 환율 묶음으로 계산해 서로 다른 날짜의 데이터를 섞지 않습니다.`,
    faqCharge: "실제 결제 금액이 다른 이유는 무엇인가요?",
    faqChargeAnswer:
      "카드사 스프레드, 결제 플랫폼 환전 수수료, 세금과 승인 시점이 최종 금액에 영향을 줄 수 있습니다.",
  },
  es: {
    title: (from, to, code) => `Conversor de ${from} a ${to} (${code})`,
    description: (from, to, fromCode, toCode) =>
      `Convierte ${from} (${fromCode}) a ${to} (${toCode}) con tipos de referencia actualizados y ejemplos para importes habituales de suscripción.`,
    eyebrow: "Par de divisas destacado",
    currentRate: "Tipo de referencia actual",
    examplesTitle: "Conversiones habituales",
    examplesDescription: (from, to) => `Ejemplos rápidos de ${from} a ${to}.`,
    methodologyTitle: "Cómo se calcula",
    methodology:
      "GeoSub calcula el cruce a partir de una misma serie de tipos frente al dólar. No utiliza tipos con más de 18 horas de antigüedad.",
    paymentTitle: "Importe final del pago",
    paymentNote:
      "El margen de la tarjeta, las comisiones de la plataforma, los impuestos y la fecha de liquidación pueden modificar el cargo final.",
    popularPairs: "Más pares de divisas",
    backToConverter: "Volver al conversor completo",
    faqRate: (from, to) => `¿Cada cuánto se actualiza el tipo ${from}/${to}?`,
    faqRateAnswer: "Los tipos de referencia suelen sincronizarse cada 12 horas y la fecha aplicada aparece en la página.",
    faqCalculation: "¿Cómo se calcula la conversión?",
    faqCalculationAnswer: (from, to) =>
      `GeoSub calcula el cruce ${from}/${to} con una única serie de tipos frente al dólar, sin mezclar fechas.`,
    faqCharge: "¿Por qué puede variar el cargo real?",
    faqChargeAnswer:
      "El margen de la tarjeta, las comisiones de cambio, los impuestos y la fecha de liquidación pueden cambiar el importe.",
  },
  tr: {
    title: (from, to, code) => `${from} - ${to} döviz çevirici (${code})`,
    description: (from, to, fromCode, toCode) =>
      `Düzenli güncellenen referans kurlarla ${from} (${fromCode}) tutarını ${to} (${toCode}) cinsine çevirin ve yaygın abonelik tutarlarını karşılaştırın.`,
    eyebrow: "Öne çıkan döviz çifti",
    currentRate: "Güncel referans kur",
    examplesTitle: "Yaygın tutar dönüşümleri",
    examplesDescription: (from, to) => `${from} tutarlarının ${to} karşılıkları.`,
    methodologyTitle: "Hesaplama yöntemi",
    methodology:
      "GeoSub çapraz kuru aynı tarihli USD referans kurları üzerinden hesaplar. 18 saatten eski kurlar kullanılmaz.",
    paymentTitle: "Gerçek ödeme tutarı",
    paymentNote:
      "Kart kuru farkı, ödeme platformu ücreti, vergiler ve provizyon zamanı nihai tutarı değiştirebilir.",
    popularPairs: "Diğer popüler döviz çiftleri",
    backToConverter: "Tam döviz çeviriciye dön",
    faqRate: (from, to) => `${from}/${to} kuru ne sıklıkla güncellenir?`,
    faqRateAnswer: "Referans kurlar normalde 12 saatte bir eşitlenir ve kullanılan tarih sayfada gösterilir.",
    faqCalculation: "Dönüşüm nasıl hesaplanır?",
    faqCalculationAnswer: (from, to) =>
      `${from}/${to} çapraz kuru, farklı tarihleri karıştırmadan aynı USD referans setinden hesaplanır.`,
    faqCharge: "Gerçek ödeme neden farklı olabilir?",
    faqChargeAnswer:
      "Kart kuru farkı, döviz çevirme ücreti, vergiler ve işlemin muhasebeleşme zamanı sonucu etkileyebilir.",
  },
  ar: {
    title: (from, to, code) => `تحويل ${from} إلى ${to} (${code})`,
    description: (from, to, fromCode, toCode) =>
      `حوّل ${from} (${fromCode}) إلى ${to} (${toCode}) باستخدام أسعار مرجعية تُحدّث بانتظام، مع أمثلة لمبالغ الاشتراكات الشائعة.`,
    eyebrow: "زوج عملات مختار",
    currentRate: "السعر المرجعي الحالي",
    examplesTitle: "تحويل مبالغ شائعة",
    examplesDescription: (from, to) => `أمثلة سريعة لتحويل ${from} إلى ${to}.`,
    methodologyTitle: "طريقة الحساب",
    methodology:
      "تحسب GeoSub السعر المتقاطع من مجموعة واحدة من الأسعار المرجعية مقابل الدولار. ولا تُستخدم الأسعار الأقدم من 18 ساعة.",
    paymentTitle: "المبلغ الفعلي عند الدفع",
    paymentNote:
      "قد تؤثر فروق سعر البطاقة ورسوم منصة الدفع والضرائب ووقت التسوية في المبلغ النهائي.",
    popularPairs: "أزواج عملات شائعة أخرى",
    backToConverter: "العودة إلى محوّل العملات الكامل",
    faqRate: (from, to) => `كم مرة يُحدّث سعر ${from}/${to}؟`,
    faqRateAnswer: "تُزامن الأسعار المرجعية عادة كل 12 ساعة، وتظهر على الصفحة فترة السعر المستخدمة.",
    faqCalculation: "كيف تُحسب نتيجة التحويل؟",
    faqCalculationAnswer: (from, to) =>
      `يُحسب سعر ${from}/${to} من مجموعة موحدة من أسعار الدولار لتجنب خلط بيانات من تواريخ مختلفة.`,
    faqCharge: "لماذا قد يختلف المبلغ المخصوم فعلياً؟",
    faqChargeAnswer:
      "يمكن أن تؤثر فروق سعر البطاقة ورسوم التحويل والضرائب ووقت التسوية في المبلغ النهائي.",
  },
  fr: {
    title: (from, to, code) => `Convertisseur ${from} vers ${to} (${code})`,
    description: (from, to, fromCode, toCode) =>
      `Convertissez ${from} (${fromCode}) en ${to} (${toCode}) avec des taux de référence régulièrement actualisés et des exemples d'abonnements courants.`,
    eyebrow: "Paire de devises sélectionnée",
    currentRate: "Taux de référence actuel",
    examplesTitle: "Montants courants",
    examplesDescription: (from, to) => `Exemples rapides de conversion de ${from} en ${to}.`,
    methodologyTitle: "Méthode de conversion",
    methodology:
      "GeoSub calcule le taux croisé à partir d'une même série de taux de référence en USD. Les taux datant de plus de 18 heures ne sont pas utilisés.",
    paymentTitle: "Montant réellement débité",
    paymentNote:
      "La marge de la carte, les frais de conversion, les taxes et la date de règlement peuvent modifier le montant final.",
    popularPairs: "Autres paires courantes",
    backToConverter: "Revenir au convertisseur complet",
    faqRate: (from, to) => `À quelle fréquence le taux ${from}/${to} est-il actualisé ?`,
    faqRateAnswer: "Les taux sont normalement synchronisés toutes les 12 heures et la date utilisée est indiquée sur la page.",
    faqCalculation: "Comment la conversion est-elle calculée ?",
    faqCalculationAnswer: (from, to) =>
      `Le taux croisé ${from}/${to} est calculé à partir d'une même série de taux en USD, sans mélanger les dates.`,
    faqCharge: "Pourquoi le débit réel peut-il différer ?",
    faqChargeAnswer:
      "La marge de la carte, les frais de change, les taxes et la date de règlement peuvent influencer le montant final.",
  },
  it: {
    title: (from, to, code) => `Convertitore da ${from} a ${to} (${code})`,
    description: (from, to, fromCode, toCode) =>
      `Converti ${from} (${fromCode}) in ${to} (${toCode}) con tassi di riferimento aggiornati regolarmente ed esempi per comuni importi di abbonamento.`,
    eyebrow: "Coppia di valute in evidenza",
    currentRate: "Tasso di riferimento attuale",
    examplesTitle: "Conversioni frequenti",
    examplesDescription: (from, to) => `Esempi rapidi da ${from} a ${to}.`,
    methodologyTitle: "Metodo di calcolo",
    methodology:
      "GeoSub calcola il cambio incrociato usando la stessa serie di tassi rispetto al dollaro. I tassi più vecchi di 18 ore non vengono utilizzati.",
    paymentTitle: "Addebito effettivo",
    paymentNote:
      "Lo spread della carta, le commissioni, le imposte e il momento della contabilizzazione possono modificare l'importo finale.",
    popularPairs: "Altre coppie frequenti",
    backToConverter: "Torna al convertitore completo",
    faqRate: (from, to) => `Ogni quanto viene aggiornato il tasso ${from}/${to}?`,
    faqRateAnswer: "I tassi di riferimento vengono normalmente sincronizzati ogni 12 ore e la data usata è indicata nella pagina.",
    faqCalculation: "Come viene calcolata la conversione?",
    faqCalculationAnswer: (from, to) =>
      `Il cambio ${from}/${to} viene ricavato da un'unica serie di tassi in USD, senza mescolare date diverse.`,
    faqCharge: "Perché l'addebito effettivo può essere diverso?",
    faqChargeAnswer:
      "Lo spread della carta, le commissioni di cambio, le imposte e la data di contabilizzazione possono incidere sul totale.",
  },
  de: {
    title: (from, to, code) => `${from} in ${to} umrechnen (${code})`,
    description: (from, to, fromCode, toCode) =>
      `Rechnen Sie ${from} (${fromCode}) mit regelmäßig aktualisierten Referenzkursen in ${to} (${toCode}) um und vergleichen Sie typische Abo-Beträge.`,
    eyebrow: "Ausgewähltes Währungspaar",
    currentRate: "Aktueller Referenzkurs",
    examplesTitle: "Häufige Umrechnungsbeträge",
    examplesDescription: (from, to) => `Schnelle Beispiele für ${from} in ${to}.`,
    methodologyTitle: "Berechnungsmethode",
    methodology:
      "GeoSub berechnet den Kreuzkurs aus derselben Reihe von USD-Referenzkursen. Kurse, die älter als 18 Stunden sind, werden nicht verwendet.",
    paymentTitle: "Tatsächlicher Zahlbetrag",
    paymentNote:
      "Kartenspanne, Umrechnungsgebühren, Steuern und Buchungszeitpunkt können den endgültigen Betrag verändern.",
    popularPairs: "Weitere beliebte Währungspaare",
    backToConverter: "Zurück zum vollständigen Währungsrechner",
    faqRate: (from, to) => `Wie oft wird der Kurs ${from}/${to} aktualisiert?`,
    faqRateAnswer: "Die Referenzkurse werden normalerweise alle 12 Stunden synchronisiert; das Kursdatum steht auf der Seite.",
    faqCalculation: "Wie wird die Umrechnung berechnet?",
    faqCalculationAnswer: (from, to) =>
      `Der Kreuzkurs ${from}/${to} wird aus einem einheitlichen Satz von USD-Referenzkursen berechnet, ohne Daten verschiedener Tage zu mischen.`,
    faqCharge: "Warum kann der tatsächliche Betrag abweichen?",
    faqChargeAnswer:
      "Kartenspanne, Wechselgebühren, Steuern und Buchungszeitpunkt können den endgültigen Betrag beeinflussen.",
  },
  pt: {
    title: (from, to, code) => `Conversor de ${from} para ${to} (${code})`,
    description: (from, to, fromCode, toCode) =>
      `Converta ${from} (${fromCode}) em ${to} (${toCode}) com taxas de referência atualizadas regularmente e exemplos para valores comuns de subscrição.`,
    eyebrow: "Par de moedas em destaque",
    currentRate: "Taxa de referência atual",
    examplesTitle: "Conversões frequentes",
    examplesDescription: (from, to) => `Exemplos rápidos de ${from} para ${to}.`,
    methodologyTitle: "Método de cálculo",
    methodology:
      "A GeoSub calcula a taxa cruzada a partir da mesma série de taxas de referência em USD. Taxas com mais de 18 horas não são utilizadas.",
    paymentTitle: "Valor efetivamente cobrado",
    paymentNote:
      "A margem do cartão, as comissões de câmbio, os impostos e a data de liquidação podem alterar o valor final.",
    popularPairs: "Outros pares de moedas",
    backToConverter: "Voltar ao conversor completo",
    faqRate: (from, to) => `Com que frequência é atualizada a taxa ${from}/${to}?`,
    faqRateAnswer: "As taxas de referência são normalmente sincronizadas a cada 12 horas e a data utilizada aparece na página.",
    faqCalculation: "Como é calculada a conversão?",
    faqCalculationAnswer: (from, to) =>
      `A taxa cruzada ${from}/${to} é calculada a partir de uma única série de taxas em USD, sem misturar datas.`,
    faqCharge: "Porque pode o débito real ser diferente?",
    faqChargeAnswer:
      "A margem do cartão, as comissões, os impostos e o momento da liquidação podem alterar o total.",
  },
};

export function getFeaturedCurrencyPairs(locale: SiteLocale) {
  return featuredPairsByLocale[locale];
}

export function getCurrencyPair(locale: SiteLocale, slug: string) {
  return featuredPairsByLocale[locale].find((item) => item.slug === slug) || null;
}

export function getCurrencyPairLocales(slug: string) {
  return (Object.keys(featuredPairsByLocale) as SiteLocale[]).filter((locale) =>
    featuredPairsByLocale[locale].some((item) => item.slug === slug),
  );
}

export function getCurrencyPairCopy(locale: SiteLocale) {
  return copyByLocale[locale];
}

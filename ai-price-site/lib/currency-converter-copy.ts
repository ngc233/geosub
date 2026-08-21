import type { SiteLocale } from "./site-locale";

export type CurrencyConverterCopy = {
  metadataTitle: string;
  metadataDescription: string;
  eyebrow: string;
  title: string;
  description: string;
  amountLabel: string;
  amountAria: string;
  fromAria: string;
  toLabel: string;
  toAria: string;
  swap: string;
  swapAria: string;
  approximately: string;
  invalidAmount: string;
  unavailable: string;
  quickTitle: string;
  quickDescription: string;
  comparisonTitle: string;
  unavailableShort: string;
  stale: string;
  rateBasis: string;
  pending: string;
  resultNote: string;
  questions: Array<{ question: string; answer: string }>;
};

const currencyConverterCopy: Record<SiteLocale, CurrencyConverterCopy> =
  {
    zh: {
      metadataTitle: "订阅汇率换算器",
      metadataDescription:
        "使用 GeoSub 定期更新的参考汇率换算 AI、流媒体和软件订阅月费，查看常见金额的多币种对照、汇率基准时间与实际扣款提示。",
      eyebrow: "订阅实用工具",
      title: "订阅汇率换算器",
      description:
        "把海外 AI、流媒体和软件订阅价格换算成你熟悉的币种。汇率通常每 12 小时同步一次，适合估算月费与比较不同地区价格。",
      amountLabel: "金额与原币种",
      amountAria: "需要换算的金额",
      fromAria: "选择原币种",
      toLabel: "换算为",
      toAria: "选择目标币种",
      swap: "交换币种",
      swapAria: "交换原币种和目标币种",
      approximately: "约等于",
      invalidAmount: "请输入有效金额",
      unavailable: "当前汇率不可用",
      quickTitle: "常见订阅金额",
      quickDescription: "快速查看常见美元月费档位的本币估算。",
      comparisonTitle: "多币种快速对照",
      unavailableShort: "不可用",
      stale: "当前使用最近一次可用汇率，可能与实时汇率有偏差；下次同步后会自动更新。",
      rateBasis: "汇率基准",
      pending: "待同步",
      resultNote: "结果仅供估算，实际扣款以支付平台为准。",
      questions: [
        {
          question: "汇率多久更新一次？",
          answer:
            "GeoSub 通常每 12 小时同步一次参考汇率，并在换算器底部标出当前汇率的基准日期。",
        },
        {
          question: "为什么实际扣款可能不同？",
          answer:
            "银行卡汇率、支付平台换汇、税费和结算时间都可能使最终扣款与换算结果略有差异。",
        },
        {
          question: "这个工具适合比较什么？",
          answer:
            "它适合快速换算常见订阅月费。决定是否订阅前，还应查看产品页上的地区价格、税务说明和更新时间。",
        },
      ],
    },
    "zh-tw": {
    metadataTitle: "訂閱匯率換算器",
    metadataDescription: "使用 GeoSub 定期更新的參考匯率，換算 AI、流媒體和軟體訂閱的跨幣種月費。",
    eyebrow: "訂閱實用工具",
    title: "訂閱匯率換算器",
    description: "把海外 AI、流媒體和軟體訂閱價格換算成你熟悉的幣種。匯率通常每 12 小時同步一次，適合估算月費與比較不同地區價格。",
    amountLabel: "金額與原幣種",
    amountAria: "需要換算的金額",
    fromAria: "選擇原幣種",
    toLabel: "換算為",
    toAria: "選擇目標幣種",
    swap: "交換幣種",
    swapAria: "交換原幣種和目標幣種",
    approximately: "約等於",
    invalidAmount: "請輸入有效金額",
    unavailable: "當前匯率不可用",
    quickTitle: "常見訂閱金額",
    quickDescription: "快速檢視常見美元月費檔位的本幣估算。",
    comparisonTitle: "多幣種快速對照",
    unavailableShort: "不可用",
    stale: "當前使用最近一次可用匯率，可能與即時匯率有偏差；下次同步後會自動更新。",
    rateBasis: "匯率基準",
    pending: "待同步",
    resultNote: "結果僅供估算，實際扣款以支付平台為準。",
    questions: [
        {
            question: "匯率多久更新一次？",
            answer: "GeoSub 通常每 12 小時同步一次參考匯率，並在換算器底部標出當前匯率的基準日期。",
        },
        {
            question: "為什麼實際扣款可能不同？",
            answer: "銀行卡匯率、支付平台換匯、稅費和結算時間都可能使最終扣款與換算結果略有差異。",
        },
        {
            question: "這個工具適合比較什麼？",
            answer: "它適合快速換算常見訂閱月費。決定是否訂閱前，還應檢視產品頁上的地區價格、稅務說明和更新時間。",
        },
    ],
},
    en: {
      metadataTitle: "Subscription Currency Converter",
      metadataDescription:
        "Convert AI, streaming, and software subscription prices with GeoSub's regularly updated reference exchange rates.",
      eyebrow: "Subscription tool",
      title: "Subscription currency converter",
      description:
        "Convert overseas AI, streaming, and software subscription prices into a familiar currency. Reference rates normally refresh every 12 hours for practical monthly-cost estimates.",
      amountLabel: "Amount and source currency",
      amountAria: "Amount to convert",
      fromAria: "Select source currency",
      toLabel: "Convert to",
      toAria: "Select target currency",
      swap: "Swap currencies",
      swapAria: "Swap source and target currencies",
      approximately: "is approximately",
      invalidAmount: "Enter a valid amount",
      unavailable: "Rate currently unavailable",
      quickTitle: "Common subscription prices",
      quickDescription: "Estimate familiar monthly price points in another currency.",
      comparisonTitle: "Quick currency comparison",
      unavailableShort: "Unavailable",
      stale: "Using the latest available rate. The live rate may differ; this estimate will update after the next sync.",
      rateBasis: "Rate date",
      pending: "Awaiting sync",
      resultNote: "Estimates only. Your payment provider determines the final charge.",
      questions: [
        {
          question: "How often are exchange rates updated?",
          answer:
            "GeoSub normally synchronizes reference exchange rates every 12 hours and shows the applicable rate date below the converter.",
        },
        {
          question: "Why can the final charge differ?",
          answer:
            "Card-network rates, payment-platform conversion, taxes, and settlement timing can all make the final charge differ slightly.",
        },
        {
          question: "What is this converter best used for?",
          answer:
            "It is designed for quick subscription-cost estimates. Before subscribing, also check the product page for regional prices, taxes, and data dates.",
        },
      ],
    },
    ja: {
      metadataTitle: "サブスクリプション為替換算",
      metadataDescription:
        "GeoSubが定期更新する参考為替レートで、AI、動画配信、ソフトウェアの月額料金を換算できます。",
      eyebrow: "サブスクリプション便利ツール",
      title: "サブスクリプション為替換算",
      description:
        "海外のAI、動画配信、ソフトウェアの料金を使い慣れた通貨に換算します。参考レートは通常12時間ごとに更新され、月額料金の目安や地域比較に利用できます。",
      amountLabel: "金額と換算元通貨",
      amountAria: "換算する金額",
      fromAria: "換算元通貨を選択",
      toLabel: "換算先",
      toAria: "換算先通貨を選択",
      swap: "通貨を入れ替える",
      swapAria: "換算元と換算先の通貨を入れ替える",
      approximately: "はおよそ",
      invalidAmount: "有効な金額を入力してください",
      unavailable: "現在レートを利用できません",
      quickTitle: "よくある月額料金",
      quickDescription: "一般的な米ドルの月額料金をすばやく換算します。",
      comparisonTitle: "複数通貨の早見表",
      unavailableShort: "利用不可",
      stale: "直近の利用可能なレートを使用しています。現在のレートと異なる場合があり、次回同期後に自動更新されます。",
      rateBasis: "為替基準日",
      pending: "同期待ち",
      resultNote: "換算は目安です。実際の請求額は決済事業者のレートをご確認ください。",
      questions: [
        { question: "為替レートはどのくらいの頻度で更新されますか？", answer: "GeoSubは通常12時間ごとに参考為替レートを同期し、換算画面の下部に基準日を表示します。" },
        { question: "実際の請求額と違うことがあるのはなぜですか？", answer: "カード会社や決済サービスの換算レート、税金、決済時刻によって、最終的な請求額が多少異なる場合があります。" },
        { question: "この換算ツールは何に向いていますか？", answer: "サブスクリプション月額の概算に適しています。契約前には、商品ページの地域別料金、税金、更新日もご確認ください。" },
      ],
    },
    ko: {
      metadataTitle: "구독 환율 계산기",
      metadataDescription:
        "GeoSub가 정기적으로 갱신하는 기준 환율로 AI, 스트리밍, 소프트웨어 구독료를 환산하세요.",
      eyebrow: "구독 도구",
      title: "구독 환율 계산기",
      description:
        "해외 AI, 스트리밍, 소프트웨어 구독료를 익숙한 통화로 환산합니다. 기준 환율은 보통 12시간마다 갱신되며 월 구독료를 가늠하고 지역별 가격을 비교하는 데 적합합니다.",
      amountLabel: "금액 및 기준 통화",
      amountAria: "환산할 금액",
      fromAria: "기준 통화 선택",
      toLabel: "환산 통화",
      toAria: "환산할 통화 선택",
      swap: "통화 바꾸기",
      swapAria: "기준 통화와 환산 통화 바꾸기",
      approximately: "은(는) 약",
      invalidAmount: "올바른 금액을 입력하세요",
      unavailable: "현재 환율을 사용할 수 없습니다",
      quickTitle: "자주 쓰는 구독 금액",
      quickDescription: "일반적인 미국 달러 월 구독료를 빠르게 환산합니다.",
      comparisonTitle: "여러 통화 빠른 비교",
      unavailableShort: "사용 불가",
      stale: "최근 사용 가능한 환율을 적용하고 있습니다. 실시간 환율과 다를 수 있으며 다음 동기화 후 자동 갱신됩니다.",
      rateBasis: "환율 기준일",
      pending: "동기화 대기",
      resultNote: "예상 금액이며 실제 청구액은 결제 서비스의 환율을 따릅니다.",
      questions: [
        { question: "환율은 얼마나 자주 갱신되나요?", answer: "GeoSub는 보통 12시간마다 기준 환율을 동기화하며 계산기 아래에 적용된 기준일을 표시합니다." },
        { question: "실제 청구액과 차이가 나는 이유는 무엇인가요?", answer: "카드사 환율, 결제 플랫폼의 환전 방식, 세금, 결제 시점에 따라 최종 청구액이 조금 달라질 수 있습니다." },
        { question: "이 계산기는 언제 유용한가요?", answer: "구독 월 비용을 빠르게 가늠할 때 유용합니다. 구독 전에는 상품 페이지의 지역별 가격, 세금, 데이터 날짜도 확인하세요." },
      ],
    },
    es: {
      metadataTitle: "Conversor de divisas para suscripciones",
      metadataDescription:
        "Convierte precios de suscripciones de IA, streaming y software con los tipos de cambio de referencia que actualiza GeoSub.",
      eyebrow: "Herramienta para suscripciones",
      title: "Conversor de divisas para suscripciones",
      description:
        "Convierte suscripciones extranjeras de IA, streaming y software a una moneda conocida. Los tipos de referencia suelen actualizarse cada 12 horas para estimar cuotas mensuales.",
      amountLabel: "Importe y moneda de origen",
      amountAria: "Importe que quieres convertir",
      fromAria: "Seleccionar moneda de origen",
      toLabel: "Convertir a",
      toAria: "Seleccionar moneda de destino",
      swap: "Intercambiar monedas",
      swapAria: "Intercambiar moneda de origen y destino",
      approximately: "equivale aproximadamente a",
      invalidAmount: "Introduce un importe válido",
      unavailable: "Tipo de cambio no disponible",
      quickTitle: "Cuotas habituales",
      quickDescription: "Calcula rápidamente cuotas mensuales habituales en dólares.",
      comparisonTitle: "Comparación rápida de monedas",
      unavailableShort: "No disponible",
      stale: "Se usa el último tipo disponible. El tipo actual puede variar y la estimación se actualizará tras la próxima sincronización.",
      rateBasis: "Fecha del tipo",
      pending: "Pendiente de sincronización",
      resultNote: "Es una estimación; el proveedor de pago determina el cargo final.",
      questions: [
        { question: "¿Cada cuánto se actualizan los tipos de cambio?", answer: "GeoSub sincroniza normalmente los tipos de referencia cada 12 horas y muestra debajo la fecha aplicada." },
        { question: "¿Por qué puede variar el cargo final?", answer: "El tipo de la tarjeta, la conversión de la plataforma, los impuestos y el momento de liquidación pueden alterar ligeramente el importe final." },
        { question: "¿Para qué sirve mejor este conversor?", answer: "Sirve para estimar rápidamente una cuota. Antes de contratar, revisa también los precios regionales, los impuestos y las fechas de la página del producto." },
      ],
    },
    tr: {
      metadataTitle: "Abonelik döviz çevirici",
      metadataDescription:
        "GeoSub'ın düzenli olarak güncellediği referans kurlarla yapay zekâ, dijital yayın ve yazılım aboneliklerini dönüştürün.",
      eyebrow: "Abonelik aracı",
      title: "Abonelik döviz çevirici",
      description:
        "Yurt dışındaki yapay zekâ, dijital yayın ve yazılım aboneliklerini bildiğiniz para birimine çevirin. Referans kurlar aylık maliyet tahmini için genellikle 12 saatte bir güncellenir.",
      amountLabel: "Tutar ve kaynak para birimi",
      amountAria: "Çevrilecek tutar",
      fromAria: "Kaynak para birimini seçin",
      toLabel: "Hedef para birimi",
      toAria: "Hedef para birimini seçin",
      swap: "Para birimlerini değiştir",
      swapAria: "Kaynak ve hedef para birimlerini değiştir",
      approximately: "yaklaşık olarak",
      invalidAmount: "Geçerli bir tutar girin",
      unavailable: "Kur şu anda kullanılamıyor",
      quickTitle: "Yaygın abonelik tutarları",
      quickDescription: "Yaygın aylık dolar fiyatlarını hızlıca hesaplayın.",
      comparisonTitle: "Hızlı döviz karşılaştırması",
      unavailableShort: "Kullanılamıyor",
      stale: "Son kullanılabilir kur kullanılıyor. Güncel kur farklı olabilir; tahmin bir sonraki eşitlemede otomatik güncellenir.",
      rateBasis: "Kur tarihi",
      pending: "Senkronizasyon bekleniyor",
      resultNote: "Sonuç tahminidir; kesin tutarı ödeme kuruluşu belirler.",
      questions: [
        { question: "Kurlar ne sıklıkla güncellenir?", answer: "GeoSub referans kurları genellikle 12 saatte bir eşitler ve kullanılan tarihi dönüştürücünün altında gösterir." },
        { question: "Nihai ödeme neden farklı olabilir?", answer: "Kart kuru, ödeme platformunun çevrim yöntemi, vergiler ve işlem zamanı nihai tutarı bir miktar değiştirebilir." },
        { question: "Bu araç hangi amaçla kullanılmalı?", answer: "Abonelik maliyetini hızlıca tahmin etmek içindir. Satın almadan önce ürün sayfasındaki bölgesel fiyatları, vergileri ve veri tarihlerini de kontrol edin." },
      ],
    },
    ar: {
      metadataTitle: "محول عملات للاشتراكات",
      metadataDescription:
        "حوّل أسعار اشتراكات الذكاء الاصطناعي والبث والبرامج باستخدام أسعار الصرف المرجعية التي يحدّثها GeoSub بانتظام.",
      eyebrow: "أداة للاشتراكات",
      title: "محول عملات للاشتراكات",
      description:
        "حوّل أسعار اشتراكات الذكاء الاصطناعي والبث والبرامج الأجنبية إلى عملة مألوفة. تُحدّث الأسعار المرجعية عادةً كل 12 ساعة لتقدير التكلفة الشهرية.",
      amountLabel: "المبلغ وعملة المصدر",
      amountAria: "المبلغ المراد تحويله",
      fromAria: "اختر عملة المصدر",
      toLabel: "التحويل إلى",
      toAria: "اختر العملة المستهدفة",
      swap: "تبديل العملتين",
      swapAria: "تبديل عملة المصدر والعملة المستهدفة",
      approximately: "يساوي تقريبًا",
      invalidAmount: "أدخل مبلغًا صالحًا",
      unavailable: "سعر الصرف غير متاح حاليًا",
      quickTitle: "أسعار اشتراك شائعة",
      quickDescription: "حوّل سريعًا مبالغ شهرية شائعة بالدولار.",
      comparisonTitle: "مقارنة سريعة بين العملات",
      unavailableShort: "غير متاح",
      stale: "يُستخدم أحدث سعر صرف متاح وقد يختلف عن السعر الحالي؛ سيتحدث التقدير تلقائياً بعد المزامنة التالية.",
      rateBasis: "تاريخ سعر الصرف",
      pending: "في انتظار المزامنة",
      resultNote: "النتيجة تقديرية، ويحدد مزود الدفع قيمة الخصم النهائية.",
      questions: [
        { question: "كم مرة تُحدّث أسعار الصرف؟", answer: "يزامن GeoSub أسعار الصرف المرجعية عادةً كل 12 ساعة، ويعرض تاريخ السعر المستخدم أسفل المحول." },
        { question: "لماذا قد تختلف قيمة الخصم النهائية؟", answer: "قد تؤثر أسعار شبكة البطاقة وتحويل منصة الدفع والضرائب ووقت التسوية في المبلغ النهائي." },
        { question: "ما الاستخدام الأنسب لهذا المحول؟", answer: "هو مناسب لتقدير تكلفة الاشتراك بسرعة. قبل الاشتراك، راجع أيضًا الأسعار الإقليمية والضرائب وتواريخ البيانات في صفحة المنتج." },
      ],
    },
    fr: {
      metadataTitle: "Convertisseur de devises pour abonnements",
      metadataDescription:
        "Convertissez les prix des abonnements IA, streaming et logiciels avec les taux de référence régulièrement mis à jour par GeoSub.",
      eyebrow: "Outil pour les abonnements",
      title: "Convertisseur de devises pour abonnements",
      description:
        "Convertissez les abonnements étrangers d’IA, de streaming et de logiciels dans une devise familière. Les taux de référence sont normalement actualisés toutes les 12 heures.",
      amountLabel: "Montant et devise d’origine",
      amountAria: "Montant à convertir",
      fromAria: "Sélectionner la devise d’origine",
      toLabel: "Convertir en",
      toAria: "Sélectionner la devise cible",
      swap: "Inverser les devises",
      swapAria: "Inverser les devises d’origine et cible",
      approximately: "vaut environ",
      invalidAmount: "Saisissez un montant valide",
      unavailable: "Taux actuellement indisponible",
      quickTitle: "Tarifs d’abonnement courants",
      quickDescription: "Estimez rapidement des mensualités courantes en dollars.",
      comparisonTitle: "Comparaison rapide des devises",
      unavailableShort: "Indisponible",
      stale: "Le dernier taux disponible est utilisé. Le taux actuel peut différer et l’estimation sera actualisée à la prochaine synchronisation.",
      rateBasis: "Date du taux",
      pending: "Synchronisation en attente",
      resultNote: "Estimation uniquement. Le prestataire de paiement fixe le montant débité.",
      questions: [
        { question: "À quelle fréquence les taux sont-ils mis à jour ?", answer: "GeoSub synchronise normalement les taux de référence toutes les 12 heures et indique la date appliquée sous le convertisseur." },
        { question: "Pourquoi le débit final peut-il être différent ?", answer: "Le taux du réseau bancaire, la conversion de la plateforme, les taxes et l’heure de règlement peuvent modifier légèrement le montant final." },
        { question: "À quoi sert surtout ce convertisseur ?", answer: "Il sert à estimer rapidement le coût d’un abonnement. Avant de vous abonner, consultez aussi les prix régionaux, les taxes et les dates sur la page du produit." },
      ],
    },
    it: {
      metadataTitle: "Convertitore di valuta per abbonamenti",
      metadataDescription:
        "Converti i prezzi di abbonamenti IA, streaming e software con i tassi di riferimento aggiornati regolarmente da GeoSub.",
      eyebrow: "Strumento per abbonamenti",
      title: "Convertitore di valuta per abbonamenti",
      description:
        "Converti gli abbonamenti esteri di IA, streaming e software in una valuta familiare. I tassi di riferimento vengono normalmente aggiornati ogni 12 ore.",
      amountLabel: "Importo e valuta di partenza",
      amountAria: "Importo da convertire",
      fromAria: "Seleziona la valuta di partenza",
      toLabel: "Converti in",
      toAria: "Seleziona la valuta di destinazione",
      swap: "Scambia le valute",
      swapAria: "Scambia la valuta di partenza e quella di destinazione",
      approximately: "equivale a circa",
      invalidAmount: "Inserisci un importo valido",
      unavailable: "Tasso attualmente non disponibile",
      quickTitle: "Prezzi di abbonamento comuni",
      quickDescription: "Stima rapidamente i canoni mensili più comuni in dollari.",
      comparisonTitle: "Confronto rapido tra valute",
      unavailableShort: "Non disponibile",
      stale: "È utilizzato l’ultimo tasso disponibile. Il tasso attuale può variare e la stima si aggiornerà alla prossima sincronizzazione.",
      rateBasis: "Data del tasso",
      pending: "Sincronizzazione in attesa",
      resultNote: "È una stima; il fornitore di pagamento determina l’addebito finale.",
      questions: [
        { question: "Con quale frequenza vengono aggiornati i tassi?", answer: "GeoSub sincronizza normalmente i tassi di riferimento ogni 12 ore e mostra sotto al convertitore la data applicata." },
        { question: "Perché l’addebito finale può essere diverso?", answer: "Il tasso della carta, la conversione della piattaforma, le imposte e il momento di regolamento possono modificare leggermente l’importo finale." },
        { question: "A cosa serve soprattutto questo convertitore?", answer: "Serve a stimare rapidamente il costo di un abbonamento. Prima dell’acquisto, controlla anche prezzi regionali, imposte e date nella pagina del prodotto." },
      ],
    },
    de: {
      metadataTitle: "Währungsrechner für Abonnements",
      metadataDescription:
        "Rechnen Sie KI-, Streaming- und Software-Abos mit den regelmäßig aktualisierten Referenzkursen von GeoSub um.",
      eyebrow: "Abo-Werkzeug",
      title: "Währungsrechner für Abonnements",
      description:
        "Rechnen Sie ausländische KI-, Streaming- und Software-Abos in eine vertraute Währung um. Die Referenzkurse werden für monatliche Kostenschätzungen in der Regel alle 12 Stunden aktualisiert.",
      amountLabel: "Betrag und Ausgangswährung",
      amountAria: "Umzurechnender Betrag",
      fromAria: "Ausgangswährung auswählen",
      toLabel: "Umrechnen in",
      toAria: "Zielwährung auswählen",
      swap: "Währungen tauschen",
      swapAria: "Ausgangs- und Zielwährung tauschen",
      approximately: "entspricht ungefähr",
      invalidAmount: "Geben Sie einen gültigen Betrag ein",
      unavailable: "Kurs derzeit nicht verfügbar",
      quickTitle: "Typische Abo-Preise",
      quickDescription: "Rechnen Sie typische monatliche Dollarpreise schnell um.",
      comparisonTitle: "Schneller Währungsvergleich",
      unavailableShort: "Nicht verfügbar",
      stale: "Der zuletzt verfügbare Kurs wird verwendet. Der aktuelle Kurs kann abweichen; die Schätzung wird nach der nächsten Synchronisierung aktualisiert.",
      rateBasis: "Kursdatum",
      pending: "Synchronisierung ausstehend",
      resultNote: "Nur eine Schätzung. Der Zahlungsanbieter bestimmt den endgültigen Betrag.",
      questions: [
        { question: "Wie oft werden die Wechselkurse aktualisiert?", answer: "GeoSub synchronisiert die Referenzkurse normalerweise alle 12 Stunden und zeigt das verwendete Kursdatum unter dem Rechner an." },
        { question: "Warum kann die endgültige Abbuchung abweichen?", answer: "Kartenkurs, Umrechnung der Zahlungsplattform, Steuern und Abrechnungszeitpunkt können den Endbetrag leicht verändern." },
        { question: "Wofür eignet sich dieser Rechner?", answer: "Er dient zur schnellen Schätzung von Abo-Kosten. Prüfen Sie vor dem Abschluss auch regionale Preise, Steuern und Daten auf der Produktseite." },
      ],
    },
    pt: {
      metadataTitle: "Conversor de moedas para assinaturas",
      metadataDescription:
        "Converta preços de assinaturas de IA, streaming e software com as taxas de referência atualizadas regularmente pelo GeoSub.",
      eyebrow: "Ferramenta para assinaturas",
      title: "Conversor de moedas para assinaturas",
      description:
        "Converta assinaturas estrangeiras de IA, streaming e software para uma moeda conhecida. As taxas de referência são normalmente atualizadas a cada 12 horas.",
      amountLabel: "Valor e moeda de origem",
      amountAria: "Valor a converter",
      fromAria: "Selecionar moeda de origem",
      toLabel: "Converter para",
      toAria: "Selecionar moeda de destino",
      swap: "Trocar moedas",
      swapAria: "Trocar as moedas de origem e destino",
      approximately: "equivale aproximadamente a",
      invalidAmount: "Introduza um valor válido",
      unavailable: "Taxa atualmente indisponível",
      quickTitle: "Valores de assinatura comuns",
      quickDescription: "Calcule rapidamente mensalidades comuns em dólares.",
      comparisonTitle: "Comparação rápida de moedas",
      unavailableShort: "Indisponível",
      stale: "Está sendo usada a última taxa disponível. A taxa atual pode variar e a estimativa será atualizada na próxima sincronização.",
      rateBasis: "Data da taxa",
      pending: "A aguardar sincronização",
      resultNote: "É apenas uma estimativa; o fornecedor de pagamento define o valor final.",
      questions: [
        { question: "Com que frequência são atualizadas as taxas?", answer: "O GeoSub sincroniza normalmente as taxas de referência a cada 12 horas e mostra abaixo a data aplicada." },
        { question: "Porque pode variar o débito final?", answer: "A taxa do cartão, a conversão da plataforma, os impostos e o momento da liquidação podem alterar ligeiramente o valor final." },
        { question: "Para que serve melhor este conversor?", answer: "Serve para estimar rapidamente uma mensalidade. Antes de subscrever, consulte também os preços regionais, impostos e datas na página do produto." },
      ],
    },
  };

export function getCurrencyConverterCopy(locale: SiteLocale) {
  return currencyConverterCopy[locale];
}

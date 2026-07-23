import { getPublicPricingCopy } from "./public-pricing-copy";
import {
  type PreparedSiteLocale,
} from "./site-locale";
import { toTraditionalChinese } from "./traditional-chinese";

type WidenCopy<T> =
  T extends string
    ? string
    : T extends (...args: infer Args) => string
      ? (...args: Args) => string
      : T extends object
        ? { [Key in keyof T]: WidenCopy<T[Key]> }
        : T;

export type PricingListCopy = WidenCopy<
  ReturnType<typeof getPublicPricingCopy>["listing"]
>;

const preparedPricingListCopy = {
  ja: {
    pages: {
      ai: {
        eyebrow: "GeoSub AI 料金データ",
        title: "AI サブスクリプション料金比較",
        description:
          "ChatGPT、Claude、Gemini などのAIサービス料金を国・地域別に比較し、最安地域、税情報、地域間の価格差を確認できます。",
        metaTitle: "AI サブスクリプション料金比較 - ChatGPT、Claude、Gemini",
        metaDescription:
          "ChatGPT、Claude、Gemini などのApp Store料金、米ドル換算、税情報、地域別の価格差を比較できます。",
      },
      streaming: {
        eyebrow: "GeoSub ストリーミング料金データ",
        title: "ストリーミング料金比較",
        description:
          "Netflix、YouTube Premium、Spotify、Disney+ などの料金を国・地域別に比較できます。",
        metaTitle: "ストリーミング料金比較 - Netflix、YouTube Premium、Spotify",
        metaDescription:
          "Netflix、YouTube Premium、Spotify、Disney+ などの地域別料金と税情報を比較できます。",
      },
    },
    categoryAria: "デジタルサービスのカテゴリー",
    aiLabel: "AI サブスクリプション",
    aiDescription: "ChatGPT、Claude、Gemini、Grok などの地域別料金を比較します。",
    streamingLabel: "ストリーミング",
    streamingDescription: "Netflix、YouTube Premium、Spotify、Disney+ などの料金を比較します。",
    productCount: (count) => `${count} サービスを掲載中`,
    empty: "このカテゴリーには、公開済みの料金データがまだありません。",
    defaultPlanHint: "主要な月額プランを表示",
    card: {
      titleSuffix: "地域別料金",
      region: "地域",
      price: "料金",
      tax: "税情報",
      base: "基準",
      updated: "更新日",
      spread: "価格差",
      regions: "地域",
      detail: "詳細を見る",
      highest: "最高値",
      lowest: "最安値",
      monthlySuffix: "/月",
      yearlySuffix: "/年",
      weeklySuffix: "/週",
      taxInferred: "プラットフォーム推定",
      taxVerified: "確認済み",
      taxMedium: "中程度の信頼度",
      taxNeedsReview: "要確認",
      taxUnverified: "未確認",
      checkoutApplies: "決済画面を優先",
    },
  },
  ko: {
    pages: {
      ai: {
        eyebrow: "GeoSub AI 가격 데이터",
        title: "AI 구독 가격 비교",
        description:
          "ChatGPT, Claude, Gemini 등 AI 서비스의 국가·지역별 구독 가격과 최저가 지역, 세금 정보, 가격 차이를 비교하세요.",
        metaTitle: "AI 구독 가격 비교 - ChatGPT, Claude, Gemini",
        metaDescription:
          "ChatGPT, Claude, Gemini 등의 App Store 가격, 달러 환산가, 세금 정보와 지역별 가격 차이를 비교하세요.",
      },
      streaming: {
        eyebrow: "GeoSub 스트리밍 가격 데이터",
        title: "스트리밍 구독 가격 비교",
        description:
          "Netflix, YouTube Premium, Spotify, Disney+ 등의 구독 가격을 국가·지역별로 비교하세요.",
        metaTitle: "스트리밍 가격 비교 - Netflix, YouTube Premium, Spotify",
        metaDescription:
          "Netflix, YouTube Premium, Spotify, Disney+ 등의 지역별 가격과 세금 정보를 비교하세요.",
      },
    },
    categoryAria: "디지털 서비스 카테고리",
    aiLabel: "AI 구독",
    aiDescription: "ChatGPT, Claude, Gemini, Grok 등의 국가별 가격을 비교합니다.",
    streamingLabel: "스트리밍",
    streamingDescription: "Netflix, YouTube Premium, Spotify, Disney+ 등의 가격을 비교합니다.",
    productCount: (count) => `현재 ${count}개 서비스 제공`,
    empty: "이 카테고리에는 아직 공개된 가격 데이터가 없습니다.",
    defaultPlanHint: "대표 월간 요금제 표시",
    card: {
      titleSuffix: "지역별 가격",
      region: "지역",
      price: "가격",
      tax: "세금 정보",
      base: "기준",
      updated: "업데이트",
      spread: "가격 차이",
      regions: "개 지역",
      detail: "상세 보기",
      highest: "최고가",
      lowest: "최저가",
      monthlySuffix: "/월",
      yearlySuffix: "/년",
      weeklySuffix: "/주",
      taxInferred: "플랫폼 추정",
      taxVerified: "확인됨",
      taxMedium: "중간 신뢰도",
      taxNeedsReview: "확인 필요",
      taxUnverified: "미확인",
      checkoutApplies: "결제 화면 기준",
    },
  },
  es: {
    pages: {
      ai: {
        eyebrow: "Datos de precios de IA de GeoSub",
        title: "Comparador de precios de suscripciones de IA",
        description:
          "Compara las suscripciones de ChatGPT, Claude, Gemini y otros servicios de IA por país y región, con mínimos, impuestos y diferencias de precio.",
        metaTitle: "Precios de suscripciones de IA - ChatGPT, Claude y Gemini",
        metaDescription:
          "Compara los precios de App Store, equivalencias en USD, impuestos y diferencias regionales de ChatGPT, Claude, Gemini y otros servicios de IA.",
      },
      streaming: {
        eyebrow: "Datos de precios de streaming de GeoSub",
        title: "Comparador de precios de streaming",
        description:
          "Compara los precios de Netflix, YouTube Premium, Spotify, Disney+ y otros servicios de streaming por país y región.",
        metaTitle: "Precios de streaming - Netflix, YouTube Premium y Spotify",
        metaDescription:
          "Compara los precios regionales y la información fiscal de Netflix, YouTube Premium, Spotify, Disney+ y otros servicios.",
      },
    },
    categoryAria: "Categoría de servicio digital",
    aiLabel: "Suscripciones de IA",
    aiDescription: "Compara los precios regionales de ChatGPT, Claude, Gemini, Grok y otros servicios.",
    streamingLabel: "Streaming",
    streamingDescription: "Compara los precios de Netflix, YouTube Premium, Spotify, Disney+ y otros servicios.",
    productCount: (count) => `${count} servicios disponibles`,
    empty: "Todavía no hay precios publicados en esta categoría.",
    defaultPlanHint: "Plan mensual principal",
    card: {
      titleSuffix: "Precios regionales",
      region: "Región",
      price: "Precio",
      tax: "Impuestos",
      base: "Referencia",
      updated: "Actualizado",
      spread: "Diferencia",
      regions: "regiones",
      detail: "Ver detalle",
      highest: "Más alto",
      lowest: "Más bajo",
      monthlySuffix: "/mes",
      yearlySuffix: "/año",
      weeklySuffix: "/semana",
      taxInferred: "Estimación de la plataforma",
      taxVerified: "Verificado",
      taxMedium: "Confianza media",
      taxNeedsReview: "Por revisar",
      taxUnverified: "Sin verificar",
      checkoutApplies: "Rige el pago final",
    },
  },
  tr: {
    pages: {
      ai: {
        eyebrow: "GeoSub Yapay Zekâ Fiyat Verileri",
        title: "Yapay Zekâ Abonelik Fiyatları",
        description:
          "ChatGPT, Claude, Gemini ve diğer yapay zekâ hizmetlerinin ülke ve bölgelere göre abonelik fiyatlarını, vergi bilgilerini ve fiyat farklarını karşılaştırın.",
        metaTitle: "Yapay Zekâ Abonelik Fiyatları - ChatGPT, Claude, Gemini",
        metaDescription:
          "ChatGPT, Claude, Gemini ve diğer hizmetlerin App Store fiyatlarını, USD karşılıklarını, vergi bilgilerini ve bölgesel fiyat farklarını karşılaştırın.",
      },
      streaming: {
        eyebrow: "GeoSub Dijital Yayın Fiyat Verileri",
        title: "Dijital Yayın Abonelik Fiyatları",
        description:
          "Netflix, YouTube Premium, Spotify, Disney+ ve diğer yayın hizmetlerinin fiyatlarını ülke ve bölgelere göre karşılaştırın.",
        metaTitle: "Dijital Yayın Fiyatları - Netflix, YouTube Premium, Spotify",
        metaDescription:
          "Netflix, YouTube Premium, Spotify, Disney+ ve diğer hizmetlerin bölgesel fiyatlarını ve vergi bilgilerini karşılaştırın.",
      },
    },
    categoryAria: "Dijital hizmet kategorisi",
    aiLabel: "Yapay Zekâ Abonelikleri",
    aiDescription: "ChatGPT, Claude, Gemini, Grok ve diğer hizmetlerin bölgesel fiyatlarını karşılaştırın.",
    streamingLabel: "Dijital Yayın",
    streamingDescription: "Netflix, YouTube Premium, Spotify, Disney+ ve diğer hizmetlerin fiyatlarını karşılaştırın.",
    productCount: (count) => `${count} hizmet listeleniyor`,
    empty: "Bu kategoride henüz yayımlanmış fiyat verisi yok.",
    defaultPlanHint: "Ana aylık paket gösteriliyor",
    card: {
      titleSuffix: "Bölgesel Fiyatlar",
      region: "Bölge",
      price: "Fiyat",
      tax: "Vergi bilgisi",
      base: "Referans",
      updated: "Güncelleme",
      spread: "Fiyat farkı",
      regions: "bölge",
      detail: "Ayrıntıları gör",
      highest: "En yüksek",
      lowest: "En düşük",
      monthlySuffix: "/ay",
      yearlySuffix: "/yıl",
      weeklySuffix: "/hafta",
      taxInferred: "Platform tahmini",
      taxVerified: "Doğrulandı",
      taxMedium: "Orta güven",
      taxNeedsReview: "İnceleme gerekli",
      taxUnverified: "Doğrulanmadı",
      checkoutApplies: "Ödeme ekranı geçerlidir",
    },
  },
  ar: {
    pages: {
      ai: {
        eyebrow: "بيانات GeoSub لأسعار الذكاء الاصطناعي",
        title: "مقارنة أسعار اشتراكات الذكاء الاصطناعي",
        description:
          "قارن أسعار اشتراكات ChatGPT وClaude وGemini وغيرها حسب البلد والمنطقة، مع أقل الأسعار والمعلومات الضريبية وفروق الأسعار.",
        metaTitle: "أسعار اشتراكات الذكاء الاصطناعي - ChatGPT وClaude وGemini",
        metaDescription:
          "قارن أسعار App Store وما يعادلها بالدولار والمعلومات الضريبية وفروق الأسعار الإقليمية لخدمات الذكاء الاصطناعي.",
      },
      streaming: {
        eyebrow: "بيانات GeoSub لأسعار البث",
        title: "مقارنة أسعار اشتراكات البث",
        description:
          "قارن أسعار Netflix وYouTube Premium وSpotify وDisney+ وغيرها من خدمات البث حسب البلد والمنطقة.",
        metaTitle: "أسعار اشتراكات البث - Netflix وYouTube Premium وSpotify",
        metaDescription:
          "قارن الأسعار الإقليمية والمعلومات الضريبية لخدمات Netflix وYouTube Premium وSpotify وDisney+ وغيرها.",
      },
    },
    categoryAria: "فئة الخدمة الرقمية",
    aiLabel: "اشتراكات الذكاء الاصطناعي",
    aiDescription: "قارن أسعار ChatGPT وClaude وGemini وGrok وغيرها حسب المنطقة.",
    streamingLabel: "خدمات البث",
    streamingDescription: "قارن أسعار Netflix وYouTube Premium وSpotify وDisney+ وغيرها.",
    productCount: (count) => `نعرض حاليًا ${count} خدمات`,
    empty: "لا تتوفر بعد بيانات أسعار منشورة في هذه الفئة.",
    defaultPlanHint: "عرض الباقة الشهرية الرئيسية",
    card: {
      titleSuffix: "الأسعار حسب المنطقة",
      region: "المنطقة",
      price: "السعر",
      tax: "الضرائب",
      base: "المرجع",
      updated: "آخر تحديث",
      spread: "فرق السعر",
      regions: "منطقة",
      detail: "عرض التفاصيل",
      highest: "الأعلى",
      lowest: "الأدنى",
      monthlySuffix: "/شهر",
      yearlySuffix: "/سنة",
      weeklySuffix: "/أسبوع",
      taxInferred: "تقدير المنصة",
      taxVerified: "موثّق",
      taxMedium: "ثقة متوسطة",
      taxNeedsReview: "تحتاج مراجعة",
      taxUnverified: "غير موثّق",
      checkoutApplies: "السعر عند الدفع هو المعتمد",
    },
  },
  fr: {
    pages: {
      ai: {
        eyebrow: "Données GeoSub sur les prix de l’IA",
        title: "Comparateur de prix des abonnements IA",
        description: "Comparez les abonnements ChatGPT, Claude, Gemini et d’autres services d’IA selon le pays, avec les prix les plus bas, les taxes et les écarts régionaux.",
        metaTitle: "Prix des abonnements IA - ChatGPT, Claude et Gemini",
        metaDescription: "Comparez les prix App Store, les équivalents en dollars, les taxes et les écarts régionaux des services d’IA.",
      },
      streaming: {
        eyebrow: "Données GeoSub sur les prix du streaming",
        title: "Comparateur de prix des services de streaming",
        description: "Comparez les prix de Netflix, YouTube Premium, Spotify, Disney+ et d’autres services selon le pays.",
        metaTitle: "Prix du streaming - Netflix, YouTube Premium et Spotify",
        metaDescription: "Comparez les prix régionaux et les informations fiscales de Netflix, YouTube Premium, Spotify, Disney+ et d’autres services.",
      },
    },
    categoryAria: "Catégorie de service numérique",
    aiLabel: "Abonnements IA",
    aiDescription: "Comparez les prix régionaux de ChatGPT, Claude, Gemini, Grok et d’autres services.",
    streamingLabel: "Streaming",
    streamingDescription: "Comparez les prix de Netflix, YouTube Premium, Spotify, Disney+ et d’autres services.",
    productCount: (count) => `${count} services disponibles`,
    empty: "Aucune donnée tarifaire publiée dans cette catégorie pour le moment.",
    defaultPlanHint: "Offre mensuelle principale affichée",
    card: {
      titleSuffix: "Prix par région", region: "Région", price: "Prix", tax: "Fiscalité", base: "Référence",
      updated: "Mise à jour", spread: "Écart de prix", regions: "régions", detail: "Voir les détails",
      highest: "Plus élevé", lowest: "Plus bas", monthlySuffix: "/mois", yearlySuffix: "/an", weeklySuffix: "/semaine",
      taxInferred: "Estimation de la plateforme", taxVerified: "Vérifié", taxMedium: "Confiance moyenne",
      taxNeedsReview: "À vérifier", taxUnverified: "Non vérifié", checkoutApplies: "Le montant au paiement prévaut",
    },
  },
  it: {
    pages: {
      ai: {
        eyebrow: "Dati GeoSub sui prezzi dell’IA",
        title: "Confronto dei prezzi degli abbonamenti IA",
        description: "Confronta gli abbonamenti ChatGPT, Claude, Gemini e altri servizi IA per paese, con prezzi minimi, imposte e differenze regionali.",
        metaTitle: "Prezzi degli abbonamenti IA - ChatGPT, Claude e Gemini",
        metaDescription: "Confronta i prezzi App Store, gli equivalenti in dollari, le imposte e le differenze regionali dei servizi IA.",
      },
      streaming: {
        eyebrow: "Dati GeoSub sui prezzi dello streaming",
        title: "Confronto dei prezzi dei servizi streaming",
        description: "Confronta i prezzi di Netflix, YouTube Premium, Spotify, Disney+ e altri servizi per paese.",
        metaTitle: "Prezzi streaming - Netflix, YouTube Premium e Spotify",
        metaDescription: "Confronta i prezzi regionali e le informazioni fiscali di Netflix, YouTube Premium, Spotify, Disney+ e altri servizi.",
      },
    },
    categoryAria: "Categoria del servizio digitale",
    aiLabel: "Abbonamenti IA",
    aiDescription: "Confronta i prezzi regionali di ChatGPT, Claude, Gemini, Grok e altri servizi.",
    streamingLabel: "Streaming",
    streamingDescription: "Confronta i prezzi di Netflix, YouTube Premium, Spotify, Disney+ e altri servizi.",
    productCount: (count) => `${count} servizi disponibili`,
    empty: "Non sono ancora disponibili dati tariffari pubblicati in questa categoria.",
    defaultPlanHint: "Piano mensile principale visualizzato",
    card: {
      titleSuffix: "Prezzi per regione", region: "Regione", price: "Prezzo", tax: "Imposte", base: "Riferimento",
      updated: "Aggiornamento", spread: "Differenza di prezzo", regions: "regioni", detail: "Vedi dettagli",
      highest: "Più alto", lowest: "Più basso", monthlySuffix: "/mese", yearlySuffix: "/anno", weeklySuffix: "/settimana",
      taxInferred: "Stima della piattaforma", taxVerified: "Verificato", taxMedium: "Affidabilità media",
      taxNeedsReview: "Da verificare", taxUnverified: "Non verificato", checkoutApplies: "Fa fede il prezzo al pagamento",
    },
  },
  de: {
    pages: {
      ai: {
        eyebrow: "GeoSub-Preisdaten für KI-Dienste",
        title: "Preisvergleich für KI-Abonnements",
        description: "Vergleichen Sie ChatGPT, Claude, Gemini und weitere KI-Abonnements nach Land, einschließlich Tiefstpreisen, Steuern und regionalen Unterschieden.",
        metaTitle: "Preise für KI-Abonnements - ChatGPT, Claude und Gemini",
        metaDescription: "Vergleichen Sie App-Store-Preise, Dollarwerte, Steuern und regionale Preisunterschiede von KI-Diensten.",
      },
      streaming: {
        eyebrow: "GeoSub-Preisdaten für Streaming",
        title: "Preisvergleich für Streaming-Abonnements",
        description: "Vergleichen Sie die Preise von Netflix, YouTube Premium, Spotify, Disney+ und weiteren Diensten nach Land.",
        metaTitle: "Streaming-Preise - Netflix, YouTube Premium und Spotify",
        metaDescription: "Vergleichen Sie regionale Preise und Steuerinformationen von Netflix, YouTube Premium, Spotify, Disney+ und weiteren Diensten.",
      },
    },
    categoryAria: "Kategorie des digitalen Dienstes",
    aiLabel: "KI-Abonnements",
    aiDescription: "Vergleichen Sie regionale Preise von ChatGPT, Claude, Gemini, Grok und weiteren Diensten.",
    streamingLabel: "Streaming",
    streamingDescription: "Vergleichen Sie Preise von Netflix, YouTube Premium, Spotify, Disney+ und weiteren Diensten.",
    productCount: (count) => `${count} Dienste verfügbar`,
    empty: "In dieser Kategorie sind noch keine veröffentlichten Preisdaten verfügbar.",
    defaultPlanHint: "Wichtigster Monatstarif wird angezeigt",
    card: {
      titleSuffix: "Regionale Preise", region: "Region", price: "Preis", tax: "Steuern", base: "Referenz",
      updated: "Aktualisiert", spread: "Preisunterschied", regions: "Regionen", detail: "Details ansehen",
      highest: "Höchster", lowest: "Niedrigster", monthlySuffix: "/Monat", yearlySuffix: "/Jahr", weeklySuffix: "/Woche",
      taxInferred: "Plattformschätzung", taxVerified: "Geprüft", taxMedium: "Mittlere Verlässlichkeit",
      taxNeedsReview: "Prüfung nötig", taxUnverified: "Ungeprüft", checkoutApplies: "Es gilt der Betrag beim Bezahlen",
    },
  },
  pt: {
    pages: {
      ai: {
        eyebrow: "Dados GeoSub sobre preços de IA",
        title: "Comparação de preços de assinaturas de IA",
        description: "Compare assinaturas do ChatGPT, Claude, Gemini e outros serviços de IA por país, incluindo preços mínimos, impostos e diferenças regionais.",
        metaTitle: "Preços de assinaturas de IA - ChatGPT, Claude e Gemini",
        metaDescription: "Compare preços da App Store, equivalentes em dólares, impostos e diferenças regionais dos serviços de IA.",
      },
      streaming: {
        eyebrow: "Dados GeoSub sobre preços de streaming",
        title: "Comparação de preços de serviços de streaming",
        description: "Compare os preços da Netflix, YouTube Premium, Spotify, Disney+ e outros serviços por país.",
        metaTitle: "Preços de streaming - Netflix, YouTube Premium e Spotify",
        metaDescription: "Compare preços regionais e informações fiscais da Netflix, YouTube Premium, Spotify, Disney+ e outros serviços.",
      },
    },
    categoryAria: "Categoria do serviço digital",
    aiLabel: "Assinaturas de IA",
    aiDescription: "Compare os preços regionais do ChatGPT, Claude, Gemini, Grok e outros serviços.",
    streamingLabel: "Streaming",
    streamingDescription: "Compare os preços da Netflix, YouTube Premium, Spotify, Disney+ e outros serviços.",
    productCount: (count) => `${count} serviços disponíveis`,
    empty: "Ainda não existem dados de preços publicados nesta categoria.",
    defaultPlanHint: "Plano mensal principal apresentado",
    card: {
      titleSuffix: "Preços por região", region: "Região", price: "Preço", tax: "Impostos", base: "Referência",
      updated: "Atualização", spread: "Diferença de preço", regions: "regiões", detail: "Ver detalhes",
      highest: "Mais alto", lowest: "Mais baixo", monthlySuffix: "/mês", yearlySuffix: "/ano", weeklySuffix: "/semana",
      taxInferred: "Estimativa da plataforma", taxVerified: "Verificado", taxMedium: "Confiança média",
      taxNeedsReview: "A verificar", taxUnverified: "Não verificado", checkoutApplies: "Prevalece o valor no pagamento",
    },
  },
} satisfies Record<
  Exclude<PreparedSiteLocale, "zh" | "zh-tw" | "en">,
  PricingListCopy
>;

export function getPricingListCopy(locale: PreparedSiteLocale) {
  if (locale === "zh-tw") {
    return toTraditionalChinese(
      getPublicPricingCopy("zh").listing,
    ) as PricingListCopy;
  }

  if (locale === "zh" || locale === "en") {
    return getPublicPricingCopy(locale).listing as PricingListCopy;
  }

  return preparedPricingListCopy[locale];
}

import { canvasIntlLocale, isCanvasLocale, resolveCanvasLocale, type CanvasLocale } from "./canvas-ui-copy.ts";
import type { Edition, Platform } from "./game-offers.ts";

export type GameFaqItem = {
  question: string;
  answer: string;
};

export type GameEditionMeta = {
  label: string;
  summary: string;
  badge?: string;
};

export type UnannouncedPlatformMeta = {
  badge: string;
  title: string;
  description: string;
};

export type GameCatalogMeta = {
  slug: string;
  title: string;
  englishTitle: string | null;
  publisher: string;
  releaseDate: string | null;
  releaseLabel: string | null;
  coverSrc: string | null;
  coverAlt: string;
  officialUrl: string | null;
  searchAliases: string[];
  supportedPlatforms: Platform[];
  unannouncedPlatforms: Partial<Record<Platform, UnannouncedPlatformMeta>>;
  editions: Record<Edition, GameEditionMeta>;
  faqs: GameFaqItem[];
};

type GameProductInput = {
  slug: string;
  name: string;
  provider?: string | null;
  description?: string | null;
  officialUrl?: string | null;
};

const sharedConsoleFaqsByLocale: Record<CanvasLocale, GameFaqItem[]> = {
  zh: [
    {
      question: "应该看哪个商店地区的价格？",
      answer:
        "数字版主机游戏绑定购买时使用的账号区服。请按你持有支付方式或礼品卡的主机账号地区查看对应商店报价，结账前确认该区服支持你的付款渠道。",
    },
    {
      question: "页面上的折合价格与最终扣款金额会有差别吗？",
      answer:
        "折合价按站内最近一次有效美元基准汇率换算，便于横向对比各区服高低。实际扣款还取决于对应商店是否含税（如美服通常在结账时按州计税，港服标价一般即结算价）以及发卡机构的实时购汇汇率。",
    },
    {
      question: "PS5 和 Xbox 的数字版购买后可以跨平台互通吗？",
      answer:
        "不能互通。PlayStation Store 购买的数字版仅限 PlayStation 主机账号游玩，Xbox 商店购买的数字版适用于 Xbox Series X|S，下单前请先核对顶部选中的主机平台。",
    },
  ],
  "zh-tw": [
    {
      question: "應該看哪個商店地區的價格？",
      answer:
        "數位版主機遊戲會綁定購買時使用的帳號區服。請依你持有付款方式或點數卡的主機帳號地區查看對應商店報價，結帳前確認該區服支援你的付款管道。",
    },
    {
      question: "頁面上的換算價格與最終扣款金額會有差別嗎？",
      answer:
        "換算價依站內最近一次有效美元基準匯率計算，方便橫向比較各區服高低。實際扣款仍取決於對應商店是否含稅（如美服通常於結帳時依州計稅，港服標價一般即結算價）及發卡銀行的即時換匯匯率。",
    },
    {
      question: "PS5 與 Xbox 的數位版購買後可以跨平台互通嗎？",
      answer:
        "無法互通。於 PlayStation Store 購買的數位版僅限 PlayStation 主機帳號遊玩，Xbox 商店購買的數位版適用於 Xbox Series X|S，下單前請先確認頂部選取的主機平台。",
    },
  ],
  en: [
    {
      question: "Which regional store price should I check?",
      answer:
        "Digital console games are tied to the store region of the account used at checkout. Check the storefront matching the console account where you hold a valid local payment method or gift card.",
    },
    {
      question: "Will the converted price match my final card charge?",
      answer:
        "Converted figures use the latest verified USD reference exchange rate so you can compare storefronts side by side. Your final total depends on regional tax rules (for example, US Store adds state tax at checkout while HK Store list prices generally match checkout) and your card issuer's FX rate.",
    },
    {
      question: "Do PS5 and Xbox digital purchases carry across platforms?",
      answer:
        "No. Digital copies bought on PlayStation Store apply only to PlayStation accounts, and Xbox Store purchases apply to Xbox Series X|S. Verify the selected platform tab at the top before buying.",
    },
  ],
  ja: [
    {
      question: "どの地域ストアの価格を確認すればよいですか？",
      answer:
        "ダウンロード版のコンソールゲームは購入時に使用したアカウントの地域ストアに紐づきます。有効な支払い方法やギフトカードをお持ちのアカウント地域にあわせて各ストアの価格をご確認ください。",
    },
    {
      question: "表示されている換算価格と実際の請求額に差はありますか？",
      answer:
        "換算価格は地域間の比較をしやすくするため、直近の有効な米ドル基準レートで算出しています。実際の請求額は各ストアの税制（米国ストアは決済時に州税が加算、香港ストアは表示価格のまま決済されるのが一般的）やカード会社の為替レートにより異なります。",
    },
    {
      question: "PS5 版と Xbox 版のダウンロード購入はクロスバイに対応していますか？",
      answer:
        "対応していません。PlayStation Store で購入したダウンロード版は PlayStation アカウント専用、Xbox ストアでの購入は Xbox Series X|S 専用となります。購入前に上部のプラットフォーム選択をご確認ください。",
    },
  ],
  ko: [
    {
      question: "어느 지역 스토어 가격을 확인해야 하나요?",
      answer:
        "디지털 콘솔 게임은 결제 시 사용한 계정의 스토어 지역에 귀속됩니다. 사용 가능한 결제 수단이나 기프트 카드를 보유한 콘솔 계정 지역의 스토어 가격을 확인해 주세요.",
    },
    {
      question: "환산 가격과 실제 카드 청구 금액은 차이가 있나요?",
      answer:
        "환산 가격은 스토어 간 비교를 위해 최근 검증된 USD 기준 환율로 계산됩니다. 실제 결제 금액은 스토어별 세금 규정(예: 미국 스토어는 결제 시 주세 별도 부과, 홍콩 스토어는 표시 가격이 곧 결제 금액)과 카드사 환율에 따라 달라질 수 있습니다.",
    },
    {
      question: "PS5와 Xbox 디지털 버전은 플랫폼 간 교차 사용이 가능한가요?",
      answer:
        "불가능합니다. PlayStation Store에서 구매한 디지털 버전은 PlayStation 계정에서만 이용할 수 있으며, Xbox 스토어 구매본은 Xbox Series X|S 전용입니다. 구매 전 상단에서 선택한 플랫폼을 꼭 확인하세요.",
    },
  ],
  es: [
    {
      question: "¿Qué tienda regional debo consultar?",
      answer:
        "Los juegos digitales de consola quedan vinculados a la región de la cuenta con la que se realiza la compra. Consulta la tienda correspondiente a la cuenta donde tengas un método de pago válido o tarjeta regalo.",
    },
    {
      question: "¿El precio convertido coincide exactamente con el cargo final?",
      answer:
        "El importe convertido utiliza el último tipo de cambio de referencia en USD verificado para facilitar la comparación entre regiones. El cargo final depende de los impuestos de cada tienda (por ejemplo, la Tienda EE. UU. calcula impuestos estatales al pagar, mientras que la Tienda HK suele mostrar el importe final) y del tipo de cambio de tu banco.",
    },
    {
      question: "¿Las compras digitales de PS5 y Xbox sirven entre plataformas?",
      answer:
        "No. Las copias digitales adquiridas en PlayStation Store solo funcionan en cuentas PlayStation y las de Tienda Xbox en Xbox Series X|S. Comprueba la plataforma seleccionada arriba antes de comprar.",
    },
  ],
};

const gta6Aliases = [
  "GTA",
  "GTA6",
  "GTA 6",
  "GTA VI",
  "Grand Theft Auto VI",
  "Grand Theft Auto 6",
  "侠盗猎车手6",
  "侠盗猎车手VI",
  "俠盜獵車手6",
  "俠盜獵車手VI",
  "グランド・セフト・オートVI",
  "그랜드 테프트 오토 VI",
  "Rockstar",
];

const curatedGta6ByLocale: Record<CanvasLocale, Omit<GameCatalogMeta, "slug">> = {
  zh: {
    title: "GTA 6",
    englishTitle: "Grand Theft Auto VI",
    publisher: "Rockstar Games",
    releaseDate: "2026-11-19",
    releaseLabel: "2026.11.19 主机发售",
    coverSrc: "/games/gta-6/cover.webp",
    coverAlt: "《Grand Theft Auto VI》官方封面",
    officialUrl: "https://www.rockstargames.com/VI",
    searchAliases: gta6Aliases,
    supportedPlatforms: ["ps5", "xbox", "pc"],
    unannouncedPlatforms: {
      pc: {
        badge: "待官宣",
        title: "PC 版尚未官宣",
        description:
          "Rockstar Games 目前仅公布 PS5 与 Xbox Series X|S 主机版本，原生 PC 版的发售日期与各区售价待官方公布。",
      },
    },
    editions: {
      standard: {
        label: "标准版",
        summary: "数字标准版游戏本体，包含雷奥奈达州与罪恶都市完整单人故事模式。",
      },
      ultimate: {
        label: "终极版",
        badge: "含附加内容",
        summary: "包含完整游戏本体，另附专属载具、服饰外观与额外数字奖励内容。",
      },
    },
    faqs: [
      ...sharedConsoleFaqsByLocale.zh,
      {
        question: "PC 版什么时候公布售价与发售日？",
        answer:
          "Rockstar Games 目前尚未公布原生 PC 版本的发售时间与商店页面。待 Steam、Epic 或 Rockstar Launcher 公开上架后，GeoSub 会在核验后同步收录。",
      },
    ],
  },
  "zh-tw": {
    title: "GTA 6",
    englishTitle: "Grand Theft Auto VI",
    publisher: "Rockstar Games",
    releaseDate: "2026-11-19",
    releaseLabel: "2026.11.19 主機發售",
    coverSrc: "/games/gta-6/cover.webp",
    coverAlt: "《Grand Theft Auto VI》官方封面",
    officialUrl: "https://www.rockstargames.com/VI",
    searchAliases: gta6Aliases,
    supportedPlatforms: ["ps5", "xbox", "pc"],
    unannouncedPlatforms: {
      pc: {
        badge: "待官宣",
        title: "PC 版尚未官宣",
        description:
          "Rockstar Games 目前僅公布 PS5 與 Xbox Series X|S 主機版本，原生 PC 版的發售日期與各區售價待官方公布。",
      },
    },
    editions: {
      standard: {
        label: "標準版",
        summary: "數位標準版遊戲本體，包含雷奧奈達州與罪惡城市完整單人故事模式。",
      },
      ultimate: {
        label: "終極版",
        badge: "含附加內容",
        summary: "包含完整遊戲本體，另附專屬載具、服飾外觀與額外數位獎勵內容。",
      },
    },
    faqs: [
      ...sharedConsoleFaqsByLocale["zh-tw"],
      {
        question: "PC 版什麼時候公布售價與發售日？",
        answer:
          "Rockstar Games 目前尚未公布原生 PC 版本的發售時間與商店頁面。待 Steam、Epic 或 Rockstar Launcher 公開上架後，GeoSub 會在核驗後同步收錄。",
      },
    ],
  },
  en: {
    title: "GTA 6",
    englishTitle: "Grand Theft Auto VI",
    publisher: "Rockstar Games",
    releaseDate: "2026-11-19",
    releaseLabel: "2026.11.19 · Console release",
    coverSrc: "/games/gta-6/cover.webp",
    coverAlt: "Grand Theft Auto VI official cover art",
    officialUrl: "https://www.rockstargames.com/VI",
    searchAliases: gta6Aliases,
    supportedPlatforms: ["ps5", "xbox", "pc"],
    unannouncedPlatforms: {
      pc: {
        badge: "TBA",
        title: "PC version not yet announced",
        description:
          "Rockstar Games has only confirmed PS5 and Xbox Series X|S console releases so far. Native PC release timing and regional store pricing have not been announced yet.",
      },
    },
    editions: {
      standard: {
        label: "Standard Edition",
        summary: "Full digital base game featuring the complete single-player story across Leonida and Vice City.",
      },
      ultimate: {
        label: "Ultimate Edition",
        badge: "Bonus content",
        summary: "Includes the full base game plus exclusive vehicles, outfits, and bonus digital content.",
      },
    },
    faqs: [
      ...sharedConsoleFaqsByLocale.en,
      {
        question: "When will PC pricing and release date be announced?",
        answer:
          "Rockstar Games has not yet published a PC release date or store listing. Once official listings appear on Steam, Epic Games Store, or Rockstar Games Launcher, GeoSub will verify and add regional prices.",
      },
    ],
  },
  ja: {
    title: "GTA 6",
    englishTitle: "Grand Theft Auto VI",
    publisher: "Rockstar Games",
    releaseDate: "2026-11-19",
    releaseLabel: "2026.11.19 コンソール版発売",
    coverSrc: "/games/gta-6/cover.webp",
    coverAlt: "『Grand Theft Auto VI』公式カバーアート",
    officialUrl: "https://www.rockstargames.com/VI",
    searchAliases: gta6Aliases,
    supportedPlatforms: ["ps5", "xbox", "pc"],
    unannouncedPlatforms: {
      pc: {
        badge: "未発表",
        title: "PC 版はまだ発表されていません",
        description:
          "Rockstar Games は現在 PS5 および Xbox Series X|S 版のみを発表しており、PC 版の発売日や各地域の価格は未定です。",
      },
    },
    editions: {
      standard: {
        label: "通常版",
        summary: "レオナイダ州とバイスシティを舞台にしたシングルプレイ本編を収録するデジタル通常版。",
      },
      ultimate: {
        label: "アルティメット版",
        badge: "特典コンテンツ付",
        summary: "ゲーム本編に加え、限定乗り物・コスチューム・追加デジタル特典を収録。",
      },
    },
    faqs: [
      ...sharedConsoleFaqsByLocale.ja,
      {
        question: "PC 版の価格や発売日はいつ発表されますか？",
        answer:
          "Rockstar Games から PC 版の発売日およびストアページはまだ公開されていません。Steam、Epic Games Store、Rockstar Games Launcher 等で公開され次第、検証のうえ掲載します。",
      },
    ],
  },
  ko: {
    title: "GTA 6",
    englishTitle: "Grand Theft Auto VI",
    publisher: "Rockstar Games",
    releaseDate: "2026-11-19",
    releaseLabel: "2026.11.19 콘솔 출시",
    coverSrc: "/games/gta-6/cover.webp",
    coverAlt: "Grand Theft Auto VI 공식 커버 이미지",
    officialUrl: "https://www.rockstargames.com/VI",
    searchAliases: gta6Aliases,
    supportedPlatforms: ["ps5", "xbox", "pc"],
    unannouncedPlatforms: {
      pc: {
        badge: "미발표",
        title: "PC 버전 미발표",
        description:
          "Rockstar Games는 현재 PS5 및 Xbox Series X|S 콘솔 버전만 발표했으며, PC 버전 출시일과 지역별 스토어 가격은 아직 공개되지 않았습니다.",
      },
    },
    editions: {
      standard: {
        label: "스탠다드 에디션",
        summary: "레오니다 주와 바이스 시티 전체 싱글플레이 스토리를 포함한 디지털 본편입니다.",
      },
      ultimate: {
        label: "얼티밋 에디션",
        badge: "추가 콘텐츠 포함",
        summary: "게임 본편과 함께 전용 이동수단, 의상 외형 및 추가 디지털 보너스 콘텐츠가 포함됩니다.",
      },
    },
    faqs: [
      ...sharedConsoleFaqsByLocale.ko,
      {
        question: "PC 버전 가격과 출시일은 언제 공개되나요?",
        answer:
          "Rockstar Games에서 아직 PC 버전의 출시 일정과 스토어 페이지를 공개하지 않았습니다. 추후 Steam, Epic 또는 Rockstar Launcher에 공식 등록되면 검증 후 반영됩니다.",
      },
    ],
  },
  es: {
    title: "GTA 6",
    englishTitle: "Grand Theft Auto VI",
    publisher: "Rockstar Games",
    releaseDate: "2026-11-19",
    releaseLabel: "2026.11.19 · Lanzamiento en consolas",
    coverSrc: "/games/gta-6/cover.webp",
    coverAlt: "Portada oficial de Grand Theft Auto VI",
    officialUrl: "https://www.rockstargames.com/VI",
    searchAliases: gta6Aliases,
    supportedPlatforms: ["ps5", "xbox", "pc"],
    unannouncedPlatforms: {
      pc: {
        badge: "Por anunciar",
        title: "Versión de PC aún no anunciada",
        description:
          "Por ahora Rockstar Games solo ha confirmado las versiones de PS5 y Xbox Series X|S. La fecha de lanzamiento en PC y sus precios regionales siguen pendientes de anuncio oficial.",
      },
    },
    editions: {
      standard: {
        label: "Edición Estándar",
        summary: "Juego base digital completo con el modo historia individual en el estado de Leonida y Vice City.",
      },
      ultimate: {
        label: "Edición Definitiva",
        badge: "Contenido adicional",
        summary: "Incluye el juego base completo junto con vehículos exclusivos, atuendos y contenido digital adicional.",
      },
    },
    faqs: [
      ...sharedConsoleFaqsByLocale.es,
      {
        question: "¿Cuándo se anunciarán el precio y la fecha en PC?",
        answer:
          "Rockstar Games todavía no ha publicado la fecha ni las fichas de tienda para PC. Cuando esté disponible oficialmente en Steam, Epic Games Store o Rockstar Games Launcher, GeoSub verificará y añadirá sus precios.",
      },
    ],
  },
};

const fallbackMetaCopyByLocale: Record<
  CanvasLocale,
  {
    publisherFallback: string;
    coverAlt: (name: string) => string;
    standardLabel: string;
    standardSummary: string;
    ultimateLabel: string;
    ultimateBadge: string;
    ultimateSummary: string;
  }
> = {
  zh: {
    publisherFallback: "官方数字商店",
    coverAlt: (name) => `${name} 封面`,
    standardLabel: "标准版",
    standardSummary: "数字标准版游戏本体。",
    ultimateLabel: "终极版",
    ultimateBadge: "含附加内容",
    ultimateSummary: "包含游戏本体及终极版数字附加内容。",
  },
  "zh-tw": {
    publisherFallback: "官方數位商店",
    coverAlt: (name) => `${name} 封面`,
    standardLabel: "標準版",
    standardSummary: "數位標準版遊戲本體。",
    ultimateLabel: "終極版",
    ultimateBadge: "含附加內容",
    ultimateSummary: "包含遊戲本體及終極版數位附加內容。",
  },
  en: {
    publisherFallback: "Official Digital Store",
    coverAlt: (name) => `${name} cover art`,
    standardLabel: "Standard Edition",
    standardSummary: "Digital standard edition base game.",
    ultimateLabel: "Ultimate Edition",
    ultimateBadge: "Bonus content",
    ultimateSummary: "Includes the base game and Ultimate Edition bonus digital content.",
  },
  ja: {
    publisherFallback: "公式デジタルストア",
    coverAlt: (name) => `${name} カバー画像`,
    standardLabel: "通常版",
    standardSummary: "デジタル通常版ゲーム本編。",
    ultimateLabel: "アルティメット版",
    ultimateBadge: "特典コンテンツ付",
    ultimateSummary: "ゲーム本編およびアルティメット版デジタル特典を収録。",
  },
  ko: {
    publisherFallback: "공식 디지털 스토어",
    coverAlt: (name) => `${name} 커버`,
    standardLabel: "스탠다드 에디션",
    standardSummary: "디지털 스탠다드 에디션 본편입니다.",
    ultimateLabel: "얼티밋 에디션",
    ultimateBadge: "추가 콘텐츠 포함",
    ultimateSummary: "게임 본편과 얼티밋 에디션 디지털 보너스 콘텐츠가 포함됩니다.",
  },
  es: {
    publisherFallback: "Tienda digital oficial",
    coverAlt: (name) => `Portada de ${name}`,
    standardLabel: "Edición Estándar",
    standardSummary: "Juego base digital en Edición Estándar.",
    ultimateLabel: "Edición Definitiva",
    ultimateBadge: "Contenido adicional",
    ultimateSummary: "Incluye el juego base y el contenido digital adicional de la Edición Definitiva.",
  },
};

export function getGameCatalogMeta(
  product: GameProductInput,
  locale: CanvasLocale = "zh",
): GameCatalogMeta {
  const resolvedLocale = resolveCanvasLocale(locale);
  if (product.slug === "gta-6") {
    const curated = curatedGta6ByLocale[resolvedLocale];
    return {
      slug: product.slug,
      ...curated,
      publisher: product.provider?.trim() || curated.publisher,
      officialUrl: product.officialUrl?.trim() || curated.officialUrl,
    };
  }

  const fallback = fallbackMetaCopyByLocale[resolvedLocale];
  const cleanName = product.name.trim();
  return {
    slug: product.slug,
    title: cleanName,
    englishTitle: null,
    publisher: product.provider?.trim() || fallback.publisherFallback,
    releaseDate: null,
    releaseLabel: null,
    coverSrc: null,
    coverAlt: fallback.coverAlt(cleanName),
    officialUrl: product.officialUrl?.trim() || null,
    searchAliases: [cleanName, product.slug],
    supportedPlatforms: ["ps5", "xbox"],
    unannouncedPlatforms: {},
    editions: {
      standard: {
        label: fallback.standardLabel,
        summary:
          resolvedLocale === "zh" && product.description?.trim()
            ? product.description.trim()
            : fallback.standardSummary,
      },
      ultimate: {
        label: fallback.ultimateLabel,
        badge: fallback.ultimateBadge,
        summary: fallback.ultimateSummary,
      },
    },
    faqs: sharedConsoleFaqsByLocale[resolvedLocale],
  };
}

const regionDisplayNamesByLocale = new Map<CanvasLocale, Intl.DisplayNames>();

function getRegionDisplayNames(locale: CanvasLocale): Intl.DisplayNames {
  let instance = regionDisplayNamesByLocale.get(locale);
  if (!instance) {
    instance = new Intl.DisplayNames([canvasIntlLocale(locale)], { type: "region" });
    regionDisplayNamesByLocale.set(locale, instance);
  }
  return instance;
}

const explicitMarketNamesByLocale: Record<CanvasLocale, Partial<Record<string, string>>> = {
  zh: { HK: "香港", US: "美国", TW: "中国台湾" },
  "zh-tw": { HK: "香港", US: "美國", TW: "台灣", KR: "韓國" },
  en: { HK: "Hong Kong", US: "United States", TW: "Taiwan", GB: "United Kingdom" },
  ja: { HK: "香港", US: "米国", TW: "台湾", GB: "英国", KR: "韓国" },
  ko: { HK: "홍콩", US: "미국", TW: "대만", GB: "영국", KR: "한국" },
  es: { HK: "Hong Kong", US: "Estados Unidos", TW: "Taiwán", GB: "Reino Unido" },
};

const storeRegionLabelsByLocale: Record<CanvasLocale, Record<string, string>> = {
  zh: {
    HK: "港服",
    US: "美服",
    JP: "日服",
    TR: "土服",
    BR: "巴服",
    GB: "英服",
    SG: "新服",
    TW: "台服",
    KR: "韩服",
    AR: "阿服",
    IN: "印服",
  },
  "zh-tw": {
    HK: "港服",
    US: "美服",
    JP: "日服",
    TR: "土服",
    BR: "巴服",
    GB: "英服",
    SG: "新服",
    TW: "台服",
    KR: "韓服",
    AR: "阿服",
    IN: "印服",
  },
  en: {
    HK: "HK Store",
    US: "US Store",
    JP: "JP Store",
    TR: "TR Store",
    BR: "BR Store",
    GB: "UK Store",
    SG: "SG Store",
    TW: "TW Store",
    KR: "KR Store",
    AR: "AR Store",
    IN: "IN Store",
  },
  ja: {
    HK: "香港ストア",
    US: "米国ストア",
    JP: "日本ストア",
    TR: "トルコストア",
    BR: "ブラジルストア",
    GB: "英国ストア",
    SG: "シンガポールストア",
    TW: "台湾ストア",
    KR: "韓国ストア",
    AR: "アルゼンチンストア",
    IN: "インドストア",
  },
  ko: {
    HK: "홍콩 스토어",
    US: "미국 스토어",
    JP: "일본 스토어",
    TR: "튀르키예 스토어",
    BR: "브라질 스토어",
    GB: "영국 스토어",
    SG: "싱가포르 스토어",
    TW: "대만 스토어",
    KR: "한국 스토어",
    AR: "아르헨티나 스토어",
    IN: "인도 스토어",
  },
  es: {
    HK: "Tienda HK",
    US: "Tienda EE. UU.",
    JP: "Tienda JP",
    TR: "Tienda TR",
    BR: "Tienda BR",
    GB: "Tienda UK",
    SG: "Tienda SG",
    TW: "Tienda TW",
    KR: "Tienda KR",
    AR: "Tienda AR",
    IN: "Tienda IN",
  },
};

const marketSearchWords: Record<string, string> = {
  HK: "香港 港服 HK hong kong hkd 香港ストア 홍콩 스토어 tienda hk",
  US: "美国 美國 美服 US usa united states usd 米国 米国ストア 미국 스토어 estados unidos tienda ee. uu.",
  JP: "日本 日服 JP japan jpy 日本ストア 일본 스토어 japón",
  TR: "土耳其 土服 TR turkey try トルコ 튀르키예 turquía",
  BR: "巴西 巴服 BR brazil brl ブラジル 브라질 brasil",
  GB: "英国 英國 英服 GB uk united kingdom gbp 영국 reino unido",
  TW: "台湾 台灣 台服 TW taiwan twd 대만 taiwán",
  KR: "韩国 韓國 韩服 韓服 KR korea krw 韓国 한국 corea",
  SG: "新加坡 新服 SG singapore sgd シンガポール 싱가포르 singapur",
};

export function getGameMarketName(code: string, locale: CanvasLocale = "zh"): string {
  const resolvedLocale = resolveCanvasLocale(locale);
  const upper = code.toUpperCase();
  const explicit = explicitMarketNamesByLocale[resolvedLocale][upper];
  if (explicit) return explicit;
  try {
    return getRegionDisplayNames(resolvedLocale).of(upper) || upper;
  } catch {
    return upper;
  }
}

export function getGameMarketStoreTag(code: string, locale: CanvasLocale = "zh"): string {
  const resolvedLocale = resolveCanvasLocale(locale);
  const upper = code.toUpperCase();
  const mapped = storeRegionLabelsByLocale[resolvedLocale][upper];
  if (mapped) return mapped;
  switch (resolvedLocale) {
    case "zh":
      return `${getGameMarketName(upper, "zh")}区`;
    case "zh-tw":
      return `${getGameMarketName(upper, "zh-tw")}區`;
    case "ja":
      return `${getGameMarketName(upper, "ja")}ストア`;
    case "ko":
      return `${getGameMarketName(upper, "ko")} 스토어`;
    case "es":
      return `Tienda ${upper}`;
    case "en":
    default:
      return `${upper} Store`;
  }
}

export function getGameMarketSearchTerms(code: string, locale: CanvasLocale = "zh"): string {
  const resolvedLocale = resolveCanvasLocale(locale);
  const upper = code.toUpperCase();
  const base = marketSearchWords[upper] ?? "";
  return `${base} ${getGameMarketName(upper, resolvedLocale)} ${getGameMarketStoreTag(upper, resolvedLocale)} ${upper}`.trim();
}

const xboxStoreByLocale: Record<CanvasLocale, string> = {
  zh: "Xbox 商店",
  "zh-tw": "Xbox 商店",
  en: "Xbox Store",
  ja: "Xbox ストア",
  ko: "Xbox 스토어",
  es: "Tienda Xbox",
};

const pcStoreByLocale: Record<CanvasLocale, string> = {
  zh: "PC 商店",
  "zh-tw": "PC 商店",
  en: "PC Store",
  ja: "PC ストア",
  ko: "PC 스토어",
  es: "Tienda PC",
};

export function getGameStoreName(
  platform: Platform,
  compactOrStoreName: boolean | string | null = false,
  locale: CanvasLocale = "zh",
): string {
  let compact = false;
  let customStoreName: string | null = null;
  let resolvedLocale = resolveCanvasLocale(locale);

  if (typeof compactOrStoreName === "boolean") {
    compact = compactOrStoreName;
  } else if (typeof compactOrStoreName === "string") {
    if (isCanvasLocale(compactOrStoreName) && arguments.length === 2) {
      resolvedLocale = compactOrStoreName;
    } else if (compactOrStoreName.trim()) {
      customStoreName = compactOrStoreName.trim();
    }
  }

  if (customStoreName && resolvedLocale === "en") {
    return customStoreName;
  }
  if (platform === "ps5") return compact ? "PS Store" : "PlayStation Store";
  if (platform === "xbox") return xboxStoreByLocale[resolvedLocale];
  return pcStoreByLocale[resolvedLocale];
}

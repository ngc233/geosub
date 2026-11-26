import type { ReactNode } from "react";
import { resolveCanvasLocale, type CanvasLocale } from "../../lib/canvas-ui-copy";
import type { GameCatalogMeta } from "../../lib/game-catalog-meta";

export type GameDirectoryUiCopy = {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  heading: string;
  intro: string;
  platformFilterLabel: string;
  allPlatforms: string;
  sectionHeading: string;
  sectionDesc: string;
  countSummary: (gamesCount: number, marketsCount: number) => string;
  coverLinkAria: (title: string) => string;
  pcPendingBadge: string;
  calloutLowestLabel: (storeTag: string, platformLabel: string, editionLabel: string) => string;
  calloutMaxSaving: (pct: number) => string;
  localPricePrefix: string;
  verifyingFallback: string;
  viewAllRegionsCta: string;
  savingShort: (pct: number) => string;
  sameAsUsStore: string;
  baselineShort: string;
  pendingVerify: string;
  usStorePrice: (formattedUsd: string) => string;
  usStorePending: string;
  matrixAriaLabel: (title: string) => string;
  matrixCols: readonly [string, string, string, string, string];
  gridFootNote: string;
  gridViewDetails: string;
};

export type GameDetailUiCopy = {
  fallbackMetaTitle: string;
  metaTitle: (title: string) => string;
  metaDescription: (title: string, englishTitle: string | null) => string;
  breadcrumbAria: string;
  breadcrumbGames: string;
  platformTabsAria: string;
  editionTabsAria: string;
  statusUnavailable: string;
  statusExpired: string;
  statusPending: string;
  taxIncluded: string;
  taxAtCheckout: string;
  taxSeeCheckout: string;
  unannouncedFallbackBadge: string;
  unannouncedFallbackTitle: (platformName: string) => string;
  unannouncedFallbackDesc: string;
  viewPlatformOffersBtn: (platformName: string) => string;
  viewOfficialSiteLink: (publisher: string) => string;
  lowestCardAria: string;
  lowestGlobalLabel: string;
  currentValidQuoteLabel: string;
  cheaperThanUsStore: (pct: number) => string;
  localListPrice: (money: string) => string;
  originalPrice: (money: string) => string;
  usStoreSameEdition: string;
  saveVsUsStore: string;
  comparisonStatusLabel: string;
  verifiedCountStatus: (priced: number, total: number) => string;
  emptyHeroNote: string;
  verifiedPrefix: string;
  fxPrefix: string;
  goToStoreBtn: (storeTag: string, compactStore: string) => string;
  editionsHeading: string;
  editionsCompareSub: (platformName: string, storeTag: string) => string;
  editionsSamePrice: string;
  editionsPriceDiff: (diffMoney: string) => string;
  activeEditionBadge: string;
  upgradeQuestion: string;
  upgradeIncludedInSub: string;
  upgradeBundleLabel: (storeTag: string, money: string) => string;
  viewUpgradeLink: string;
  regionsHeading: string;
  regionsDesc: (platformName: string, editionName: string) => string;
  regionFilterAria: string;
  allRegionsOption: string;
  searchRegionAria: string;
  searchRegionPlaceholder: string;
  tableAria: string;
  tableCols: readonly [string, string, string, string, string, string];
  usStoreBaseline: string;
  diffLower: (pct: number) => string;
  diffHigher: (pct: number) => string;
  diffPendingCompare: string;
  disclosureAria: (marketName: string) => string;
  shopLinkAria: (marketName: string, platformName: string, editionName: string) => string;
  evidenceSourcePrefix: string;
  evidenceLastVerified: string;
  evidenceVerified: string;
  evidenceFxPrefix: string;
  evidenceTaxPrefix: string;
  evidenceMemberFallback: string;
  evidenceMemberPrice: (tier: string, money: string) => string;
  openOfficialStoreLink: string;
  noMatchingRegions: string;
  clearFilterBtn: string;
  tableFooterSummary: (count: number) => string;
  sourcesTriggerBtn: string;
  faqHeading: string;
  sourcesDialogTitle: string;
  sourcesIntro: string;
  sourcesUnavailable: (storeName: string) => string;
  sourcesLoading: (storeName: string) => string;
  sourcesFxDate: (date: string) => string;
  sourcesFxFallback: string;
  insightError: string;
  insightLoading: string;
  insightNoMatch: string;
  insightSingleMarket: (args: {
    marketName: string;
    editionName: string;
    localPrice: string;
    convertedPrice: string | null;
    missingMarketName: string | null;
  }) => string;
  insightMissingFx: (count: number) => string;
  insightEqualPrices: (count: number) => string;
  insightUsLowest: (count: number) => string;
  insightLowestWithSaving: (args: {
    count: number;
    marketName: string;
    savedNode: ReactNode | null;
  }) => ReactNode;
};

export const gameDirectoryCopyByLocale: Record<CanvasLocale, GameDirectoryUiCopy> = {
  zh: {
    metaTitle: "游戏比价",
    metaDescription:
      "对比主机数字版游戏在港服、美服等官方商店的公开买断价格，同平台、同版本按实时汇率折算到手差价。",
    eyebrow: "官方数字商店买断比价",
    heading: "游戏比价",
    intro:
      "对比 PS5 与 Xbox 数字版游戏在各区官方商店的公开买断价格，同平台、同版本按实时汇率折算。",
    platformFilterLabel: "游戏平台筛选",
    allPlatforms: "全部平台",
    sectionHeading: "已收录游戏",
    sectionDesc: "点击任意平台版本行或详情入口，可查看各区服完整标价、税费说明与核价记录。",
    countSummary: (gamesCount, marketsCount) =>
      `${gamesCount} 款游戏 · ${marketsCount} 个官方商店区服`,
    coverLinkAria: (title) => `查看 ${title} 地区比价`,
    pcPendingBadge: "PC 待官宣",
    calloutLowestLabel: (storeTag, platformLabel, editionLabel) =>
      `${storeTag}最低 · ${platformLabel} ${editionLabel}`,
    calloutMaxSaving: (pct) => `比美服最多低 ${pct}%`,
    localPricePrefix: "当地标价 ",
    verifyingFallback: "官方商店报价核验中，点击查看各区商品页。",
    viewAllRegionsCta: "查看全部区服与版本对照",
    savingShort: (pct) => `低 ${pct}%`,
    sameAsUsStore: "与美服同价",
    baselineShort: "基准",
    pendingVerify: "待核验",
    usStorePrice: (formattedUsd) => `美服 ${formattedUsd}`,
    usStorePending: "美服待核验",
    matrixAriaLabel: (title) => `${title} 各版本价格`,
    matrixCols: ["平台 / 版本", "最低区服", "折合价", "当地标价 / 美服", "相比美服"],
    gridFootNote: "同平台、同版本按汇率折算",
    gridViewDetails: "查看各区详情",
  },
  "zh-tw": {
    metaTitle: "遊戲比價",
    metaDescription:
      "比較主機數位版遊戲在港服、美服等官方商店的公開買斷價格，同平台、同版本依即時匯率換算價差。",
    eyebrow: "官方數位商店買斷比價",
    heading: "遊戲比價",
    intro:
      "比較 PS5 與 Xbox 數位版遊戲在各區官方商店的公開買斷價格，同平台、同版本依即時匯率換算。",
    platformFilterLabel: "遊戲平台篩選",
    allPlatforms: "全部平台",
    sectionHeading: "已收錄遊戲",
    sectionDesc: "點擊任一平台版本列或詳情入口，可查看各區服完整標價、稅費說明與核價紀錄。",
    countSummary: (gamesCount, marketsCount) =>
      `${gamesCount} 款遊戲 · ${marketsCount} 個官方商店區服`,
    coverLinkAria: (title) => `查看 ${title} 地區比價`,
    pcPendingBadge: "PC 待官宣",
    calloutLowestLabel: (storeTag, platformLabel, editionLabel) =>
      `${storeTag}最低 · ${platformLabel} ${editionLabel}`,
    calloutMaxSaving: (pct) => `比美服最多低 ${pct}%`,
    localPricePrefix: "當地標價 ",
    verifyingFallback: "官方商店報價核驗中，點擊查看各區商品頁。",
    viewAllRegionsCta: "查看全部區服與版本對照",
    savingShort: (pct) => `低 ${pct}%`,
    sameAsUsStore: "與美服同價",
    baselineShort: "基準",
    pendingVerify: "待核驗",
    usStorePrice: (formattedUsd) => `美服 ${formattedUsd}`,
    usStorePending: "美服待核驗",
    matrixAriaLabel: (title) => `${title} 各版本價格`,
    matrixCols: ["平台 / 版本", "最低區服", "換算價", "當地標價 / 美服", "相比美服"],
    gridFootNote: "同平台、同版本依匯率換算",
    gridViewDetails: "查看各區詳情",
  },
  en: {
    metaTitle: "Game Store Price Comparison",
    metaDescription:
      "Compare official digital console game list prices across regional PlayStation and Xbox stores with live currency conversion.",
    eyebrow: "Official Digital Storefront Pricing",
    heading: "Game Price Comparison",
    intro:
      "Compare public one-time digital game prices across regional PS5 and Xbox storefronts, converted side by side for the same platform and edition.",
    platformFilterLabel: "Filter by gaming platform",
    allPlatforms: "All platforms",
    sectionHeading: "Tracked Games",
    sectionDesc:
      "Select any platform edition row or detail link for full regional list prices, checkout tax rules, and verification timestamps.",
    countSummary: (gamesCount, marketsCount) =>
      `${gamesCount} ${gamesCount === 1 ? "game" : "games"} · ${marketsCount} official store regions`,
    coverLinkAria: (title) => `Compare regional prices for ${title}`,
    pcPendingBadge: "PC TBA",
    calloutLowestLabel: (storeTag, platformLabel, editionLabel) =>
      `Lowest on ${storeTag} · ${platformLabel} ${editionLabel}`,
    calloutMaxSaving: (pct) => `Up to ${pct}% off US Store`,
    localPricePrefix: "Local price ",
    verifyingFallback: "Verifying official store listings—open to view regional store pages.",
    viewAllRegionsCta: "Compare all store regions & editions",
    savingShort: (pct) => `-${pct}%`,
    sameAsUsStore: "Same as US",
    baselineShort: "Base",
    pendingVerify: "Pending",
    usStorePrice: (formattedUsd) => `US Store ${formattedUsd}`,
    usStorePending: "US Store pending",
    matrixAriaLabel: (title) => `${title} edition prices`,
    matrixCols: ["Platform / Edition", "Lowest Store", "Converted", "Local / US Store", "vs US Store"],
    gridFootNote: "Converted for matching platform & edition",
    gridViewDetails: "Regional details",
  },
  ja: {
    metaTitle: "ゲーム価格比較",
    metaDescription:
      "PS5・Xbox デジタル版ゲームの各国公式ストア販売価格を比較。同一プラットフォーム・同一エディションを最新レートで換算します。",
    eyebrow: "公式デジタルストア買い切り価格比較",
    heading: "ゲーム価格比較",
    intro:
      "PS5 と Xbox のダウンロード版ゲームの各国公式ストア価格を、同一プラットフォーム・同一エディションで為替換算して比較できます。",
    platformFilterLabel: "プラットフォーム絞り込み",
    allPlatforms: "すべて",
    sectionHeading: "掲載タイトル",
    sectionDesc:
      "各エディションの行や詳細リンクから、地域別の税込・税抜条件や価格検証日時を確認できます。",
    countSummary: (gamesCount, marketsCount) =>
      `${gamesCount} タイトル · ${marketsCount} 公式ストア地域`,
    coverLinkAria: (title) => `${title} の地域別価格を見る`,
    pcPendingBadge: "PC 未発表",
    calloutLowestLabel: (storeTag, platformLabel, editionLabel) =>
      `${storeTag}が最安 · ${platformLabel} ${editionLabel}`,
    calloutMaxSaving: (pct) => `米国ストア比 最大 ${pct}% 安い`,
    localPricePrefix: "現地価格 ",
    verifyingFallback: "公式ストア価格を確認中です。詳細ページから各ストアへ移動できます。",
    viewAllRegionsCta: "全ストア地域・エディション比較を見る",
    savingShort: (pct) => `-${pct}%`,
    sameAsUsStore: "米国と同額",
    baselineShort: "基準",
    pendingVerify: "確認中",
    usStorePrice: (formattedUsd) => `米国 ${formattedUsd}`,
    usStorePending: "米国ストア確認中",
    matrixAriaLabel: (title) => `${title} エディション別価格`,
    matrixCols: ["対応機種 / 版", "最安ストア", "換算価格", "現地価格 / 米国", "米国ストア比"],
    gridFootNote: "同一機種・同一エディションで為替換算",
    gridViewDetails: "地域別の詳細",
  },
  ko: {
    metaTitle: "게임 가격 비교",
    metaDescription:
      "PS5 및 Xbox 디지털 게임의 홍콩·미국 등 공식 스토어 판매가를 동일 플랫폼·에디션 기준으로 실시간 환율 비교합니다.",
    eyebrow: "공식 디지털 스토어 단품 가격 비교",
    heading: "게임 가격 비교",
    intro:
      "PS5와 Xbox 디지털 게임의 지역별 공식 스토어 판매 가격을 동일 플랫폼·동일 에디션 기준으로 환산해 비교합니다.",
    platformFilterLabel: "플랫폼 필터",
    allPlatforms: "전체 플랫폼",
    sectionHeading: "수록 게임",
    sectionDesc:
      "플랫폼·에디션 행이나 상세 링크를 선택하면 스토어별 표시가, 세금 안내 및 검증 시각을 확인할 수 있습니다.",
    countSummary: (gamesCount, marketsCount) =>
      `게임 ${gamesCount}종 · 공식 스토어 ${marketsCount}개 지역`,
    coverLinkAria: (title) => `${title} 지역별 가격 비교 보기`,
    pcPendingBadge: "PC 미발표",
    calloutLowestLabel: (storeTag, platformLabel, editionLabel) =>
      `${storeTag} 최저 · ${platformLabel} ${editionLabel}`,
    calloutMaxSaving: (pct) => `미국 스토어 대비 최대 ${pct}% 저렴`,
    localPricePrefix: "현지 표시가 ",
    verifyingFallback: "공식 스토어 가격 검증 중입니다. 클릭하여 스토어 정보를 확인하세요.",
    viewAllRegionsCta: "전체 스토어 지역 및 에디션 비교",
    savingShort: (pct) => `${pct}% 저렴`,
    sameAsUsStore: "미국과 동일",
    baselineShort: "기준",
    pendingVerify: "확인 중",
    usStorePrice: (formattedUsd) => `미국 ${formattedUsd}`,
    usStorePending: "미국 스토어 확인 중",
    matrixAriaLabel: (title) => `${title} 에디션별 가격`,
    matrixCols: ["플랫폼 / 에디션", "최저 스토어", "환산가", "현지 표시가 / 미국", "미국 스토어 대비"],
    gridFootNote: "동일 플랫폼·에디션 기준 환율 환산",
    gridViewDetails: "지역별 상세 보기",
  },
  es: {
    metaTitle: "Comparador de precios de videojuegos",
    metaDescription:
      "Compara precios digitales oficiales de juegos de PS5 y Xbox entre tiendas regionales con conversión de divisas.",
    eyebrow: "Tiendas digitales oficiales · Compra única",
    heading: "Precios de videojuegos",
    intro:
      "Compara los precios públicos digitales de PS5 y Xbox en las tiendas oficiales de cada región para la misma plataforma y edición.",
    platformFilterLabel: "Filtrar por plataforma",
    allPlatforms: "Todas",
    sectionHeading: "Juegos incluidos",
    sectionDesc:
      "Pulsa en cualquier edición o enlace de detalle para ver precios locales, impuestos al pagar y fechas de verificación.",
    countSummary: (gamesCount, marketsCount) =>
      `${gamesCount} ${gamesCount === 1 ? "juego" : "juegos"} · ${marketsCount} tiendas oficiales`,
    coverLinkAria: (title) => `Ver precios regionales de ${title}`,
    pcPendingBadge: "PC por anunciar",
    calloutLowestLabel: (storeTag, platformLabel, editionLabel) =>
      `Mínimo en ${storeTag} · ${platformLabel} ${editionLabel}`,
    calloutMaxSaving: (pct) => `Hasta ${pct}% menos que EE. UU.`,
    localPricePrefix: "Precio local ",
    verifyingFallback: "Verificando precios en tiendas oficiales; entra para consultar las fichas regionales.",
    viewAllRegionsCta: "Ver todas las regiones y ediciones",
    savingShort: (pct) => `-${pct}%`,
    sameAsUsStore: "Igual que EE. UU.",
    baselineShort: "Base",
    pendingVerify: "Pendiente",
    usStorePrice: (formattedUsd) => `EE. UU. ${formattedUsd}`,
    usStorePending: "EE. UU. pendiente",
    matrixAriaLabel: (title) => `Precios por edición de ${title}`,
    matrixCols: ["Plataforma / Edición", "Tienda más barata", "Convertido", "Local / EE. UU.", "vs EE. UU."],
    gridFootNote: "Convertido a igual plataforma y edición",
    gridViewDetails: "Ver detalles por región",
  },
};

export const gameDetailCopyByLocale: Record<CanvasLocale, GameDetailUiCopy> = {
  zh: {
    fallbackMetaTitle: "游戏比价",
    metaTitle: (title) => `${title} 各区价格对比`,
    metaDescription: (title, englishTitle) =>
      `对比《${englishTitle ?? title}》在 PS5 与 Xbox 各地区官方数字商店的公开买断价格、版本差价与汇率折算。`,
    breadcrumbAria: "面包屑",
    breadcrumbGames: "游戏比价",
    platformTabsAria: "游戏平台",
    editionTabsAria: "游戏版本",
    statusUnavailable: "当前网页无法购买",
    statusExpired: "暂未获取到最新报价",
    statusPending: "待核验",
    taxIncluded: "已含税",
    taxAtCheckout: "结算页计税",
    taxSeeCheckout: "以结算页为准",
    unannouncedFallbackBadge: "待公布",
    unannouncedFallbackTitle: (platformName) => `${platformName} 版暂未公布`,
    unannouncedFallbackDesc:
      "官方目前尚未开放该平台的商店预购或公开售价，你可先查看已上架主机平台的各区价格。",
    viewPlatformOffersBtn: (platformName) => `查看 ${platformName} 各区报价`,
    viewOfficialSiteLink: (publisher) => `查看 ${publisher} 官网`,
    lowestCardAria: "最低价总览",
    lowestGlobalLabel: "全区最低",
    currentValidQuoteLabel: "当前有效报价",
    cheaperThanUsStore: (pct) => `比美服低 ${pct}%`,
    localListPrice: (money) => `当地标价 ${money}`,
    originalPrice: (money) => `原价 ${money}`,
    usStoreSameEdition: "美服同版本",
    saveVsUsStore: "相比美服少付",
    comparisonStatusLabel: "当前比价状态",
    verifiedCountStatus: (priced, total) => `已核验 ${priced} / ${total} 区服`,
    emptyHeroNote: "当前版本官方商店报价待核验，你可点击下方商店入口直接查看商品页。",
    verifiedPrefix: "核价 ",
    fxPrefix: "汇率 ",
    goToStoreBtn: (storeTag, compactStore) => `前往${storeTag} ${compactStore}`,
    editionsHeading: "版本区别与差价",
    editionsCompareSub: (platformName, storeTag) => `${platformName} · 按${storeTag}对照`,
    editionsSamePrice: " · 两版同价",
    editionsPriceDiff: (diffMoney) => ` · 差价 +${diffMoney}`,
    activeEditionBadge: "当前查看",
    upgradeQuestion: "已有标准版本体？",
    upgradeIncludedInSub: "已包含于平台订阅服务",
    upgradeBundleLabel: (storeTag, money) => `${storeTag}终极版升级包 ${money}`,
    viewUpgradeLink: "查看升级包",
    regionsHeading: "各区官方商店价格",
    regionsDesc: (platformName, editionName) =>
      `${platformName} · ${editionName}公开买断价，点击地区名称可展开核价时间与汇率基准。`,
    regionFilterAria: "地区价格筛选",
    allRegionsOption: "全部地区",
    searchRegionAria: "找地区",
    searchRegionPlaceholder: "找地区，例如 香港",
    tableAria: "各地区官方商店数字版售价",
    tableCols: ["#", "商店地区", "折合价", "当地标价", "和美服比", "税费与渠道"],
    usStoreBaseline: "美服基准",
    diffLower: (pct) => `低 ${pct}%`,
    diffHigher: (pct) => `高 ${pct}%`,
    diffPendingCompare: "待对照",
    disclosureAria: (marketName) => `查看${marketName}报价依据`,
    shopLinkAria: (marketName, platformName, editionName) =>
      `前往${marketName}${platformName}${editionName}官方商店`,
    evidenceSourcePrefix: "来源：",
    evidenceLastVerified: "上次核价：",
    evidenceVerified: "核价：",
    evidenceFxPrefix: "汇率：",
    evidenceTaxPrefix: "税费：",
    evidenceMemberFallback: "会员",
    evidenceMemberPrice: (tier, money) => `${tier}优惠价：${money}`,
    openOfficialStoreLink: "打开官方商店页",
    noMatchingRegions: "没有匹配的商店地区。",
    clearFilterBtn: "清除筛选",
    tableFooterSummary: (count) =>
      `显示 ${count} 个官方商店地区 · 公开买断标价，最终金额以商店结算页为准`,
    sourcesTriggerBtn: "报价来源",
    faqHeading: "购买前须知",
    sourcesDialogTitle: "官方商店报价来源",
    sourcesIntro: "全部价格均采集自各主机平台官方数字商店的公开买断页面，核价时间见各区明细。",
    sourcesUnavailable: (storeName) => `${storeName}来源暂未获取。`,
    sourcesLoading: (storeName) => `正在读取 ${storeName} 来源…`,
    sourcesFxDate: (date) => `汇率基准日期：${date}`,
    sourcesFxFallback: "汇率基准：按最近可用美元汇率换算",
    insightError: "暂未获取到最新报价。",
    insightLoading: "正在读取官方报价…",
    insightNoMatch: "没有匹配的商店地区。",
    insightSingleMarket: ({ marketName, editionName, localPrice, convertedPrice, missingMarketName }) =>
      `${marketName}商店的${editionName}售价为 ${localPrice}` +
      (convertedPrice !== null ? `，折合 ${convertedPrice}` : "") +
      (missingMarketName ? `；${missingMarketName}商店暂缺有效报价。` : "。"),
    insightMissingFx: (count) => `已核验 ${count} 个地区，汇率暂缺。`,
    insightEqualPrices: (count) => `已核验 ${count} 个地区，各区折合价格相同。`,
    insightUsLowest: (count) => `已核验 ${count} 个地区，美国最低。`,
    insightLowestWithSaving: ({ count, marketName, savedNode }) => (
      <>
        已核验 {count} 个地区，{marketName}最低
        {savedNode && <>，比美国约省 {savedNode}</>}
        。
      </>
    ),
  },
  "zh-tw": {
    fallbackMetaTitle: "遊戲比價",
    metaTitle: (title) => `${title} 各區價格對比`,
    metaDescription: (title, englishTitle) =>
      `比較《${englishTitle ?? title}》在 PS5 與 Xbox 各地區官方數位商店的公開買斷價格、版本價差與匯率換算。`,
    breadcrumbAria: "麵包屑導覽",
    breadcrumbGames: "遊戲比價",
    platformTabsAria: "遊戲平台",
    editionTabsAria: "遊戲版本",
    statusUnavailable: "目前網頁無法購買",
    statusExpired: "暫未取得最新報價",
    statusPending: "待核驗",
    taxIncluded: "已含稅",
    taxAtCheckout: "結帳頁計稅",
    taxSeeCheckout: "以結帳頁為準",
    unannouncedFallbackBadge: "待公布",
    unannouncedFallbackTitle: (platformName) => `${platformName} 版暫未公布`,
    unannouncedFallbackDesc:
      "官方目前尚未開放該平台的商店預購或公開售價，你可先查看已上架主機平台的各區價格。",
    viewPlatformOffersBtn: (platformName) => `查看 ${platformName} 各區報價`,
    viewOfficialSiteLink: (publisher) => `查看 ${publisher} 官網`,
    lowestCardAria: "最低價總覽",
    lowestGlobalLabel: "全區最低",
    currentValidQuoteLabel: "目前有效報價",
    cheaperThanUsStore: (pct) => `比美服低 ${pct}%`,
    localListPrice: (money) => `當地標價 ${money}`,
    originalPrice: (money) => `原價 ${money}`,
    usStoreSameEdition: "美服同版本",
    saveVsUsStore: "相比美服少付",
    comparisonStatusLabel: "目前比價狀態",
    verifiedCountStatus: (priced, total) => `已核驗 ${priced} / ${total} 區服`,
    emptyHeroNote: "目前版本官方商店報價待核驗，你可點擊下方商店入口直接查看商品頁。",
    verifiedPrefix: "核價 ",
    fxPrefix: "匯率 ",
    goToStoreBtn: (storeTag, compactStore) => `前往${storeTag} ${compactStore}`,
    editionsHeading: "版本差異與價差",
    editionsCompareSub: (platformName, storeTag) => `${platformName} · 按${storeTag}對照`,
    editionsSamePrice: " · 兩版同價",
    editionsPriceDiff: (diffMoney) => ` · 價差 +${diffMoney}`,
    activeEditionBadge: "目前檢視",
    upgradeQuestion: "已有標準版本體？",
    upgradeIncludedInSub: "已包含於平台訂閱服務",
    upgradeBundleLabel: (storeTag, money) => `${storeTag}終極版升級包 ${money}`,
    viewUpgradeLink: "查看升級包",
    regionsHeading: "各區官方商店價格",
    regionsDesc: (platformName, editionName) =>
      `${platformName} · ${editionName}公開買斷價，點擊地區名稱可展開核價時間與匯率基準。`,
    regionFilterAria: "地區價格篩選",
    allRegionsOption: "全部地區",
    searchRegionAria: "找地區",
    searchRegionPlaceholder: "搜尋地區，例如 香港",
    tableAria: "各地區官方商店數位版售價",
    tableCols: ["#", "商店地區", "換算價", "當地標價", "和美服比", "稅費與通路"],
    usStoreBaseline: "美服基準",
    diffLower: (pct) => `低 ${pct}%`,
    diffHigher: (pct) => `高 ${pct}%`,
    diffPendingCompare: "待對照",
    disclosureAria: (marketName) => `查看${marketName}報價依據`,
    shopLinkAria: (marketName, platformName, editionName) =>
      `前往${marketName}${platformName}${editionName}官方商店`,
    evidenceSourcePrefix: "來源：",
    evidenceLastVerified: "上次核價：",
    evidenceVerified: "核價：",
    evidenceFxPrefix: "匯率：",
    evidenceTaxPrefix: "稅費：",
    evidenceMemberFallback: "會員",
    evidenceMemberPrice: (tier, money) => `${tier}優惠價：${money}`,
    openOfficialStoreLink: "開啟官方商店頁",
    noMatchingRegions: "沒有符合的商店地區。",
    clearFilterBtn: "清除篩選",
    tableFooterSummary: (count) =>
      `顯示 ${count} 個官方商店地區 · 公開買斷標價，最終金額以商店結帳頁為準`,
    sourcesTriggerBtn: "報價來源",
    faqHeading: "購買前須知",
    sourcesDialogTitle: "官方商店報價來源",
    sourcesIntro: "全部價格均來自各主機平台官方數位商店的公開買斷頁面，核價時間見各區明細。",
    sourcesUnavailable: (storeName) => `${storeName}來源暫未取得。`,
    sourcesLoading: (storeName) => `正在讀取 ${storeName} 來源…`,
    sourcesFxDate: (date) => `匯率基準日期：${date}`,
    sourcesFxFallback: "匯率基準：依最近可用美元匯率換算",
    insightError: "暫未取得最新報價。",
    insightLoading: "正在讀取官方報價…",
    insightNoMatch: "沒有符合的商店地區。",
    insightSingleMarket: ({ marketName, editionName, localPrice, convertedPrice, missingMarketName }) =>
      `${marketName}商店的${editionName}售價為 ${localPrice}` +
      (convertedPrice !== null ? `，換算 ${convertedPrice}` : "") +
      (missingMarketName ? `；${missingMarketName}商店暫缺有效報價。` : "。"),
    insightMissingFx: (count) => `已核驗 ${count} 個地區，匯率暫缺。`,
    insightEqualPrices: (count) => `已核驗 ${count} 個地區，各區換算價格相同。`,
    insightUsLowest: (count) => `已核驗 ${count} 個地區，美國最低。`,
    insightLowestWithSaving: ({ count, marketName, savedNode }) => (
      <>
        已核驗 {count} 個地區，{marketName}最低
        {savedNode && <>，比美國約省 {savedNode}</>}
        。
      </>
    ),
  },
  en: {
    fallbackMetaTitle: "Game Price Comparison",
    metaTitle: (title) => `${title} Regional Store Prices`,
    metaDescription: (title, englishTitle) =>
      `Compare official digital ${englishTitle ?? title} prices across PS5 and Xbox regional stores with edition diffs and currency conversion.`,
    breadcrumbAria: "Breadcrumb",
    breadcrumbGames: "Games",
    platformTabsAria: "Gaming platform",
    editionTabsAria: "Game edition",
    statusUnavailable: "Unavailable on web store",
    statusExpired: "Latest quote unavailable",
    statusPending: "Pending verification",
    taxIncluded: "Tax included",
    taxAtCheckout: "Tax at checkout",
    taxSeeCheckout: "See checkout",
    unannouncedFallbackBadge: "TBA",
    unannouncedFallbackTitle: (platformName) => `${platformName} release not yet announced`,
    unannouncedFallbackDesc:
      "Official store pre-orders and public pricing are not live for this platform yet. Compare available console store prices instead.",
    viewPlatformOffersBtn: (platformName) => `View ${platformName} regional prices`,
    viewOfficialSiteLink: (publisher) => `Visit ${publisher} official site`,
    lowestCardAria: "Lowest price summary",
    lowestGlobalLabel: "Lowest overall",
    currentValidQuoteLabel: "Active store quote",
    cheaperThanUsStore: (pct) => `${pct}% cheaper than US Store`,
    localListPrice: (money) => `Local price ${money}`,
    originalPrice: (money) => `List ${money}`,
    usStoreSameEdition: "US Store same edition",
    saveVsUsStore: "Savings vs US Store",
    comparisonStatusLabel: "Comparison status",
    verifiedCountStatus: (priced, total) => `${priced} / ${total} stores verified`,
    emptyHeroNote:
      "Official store pricing for this edition is awaiting verification. Use the store links below to check the listing directly.",
    verifiedPrefix: "Verified ",
    fxPrefix: "FX ",
    goToStoreBtn: (storeTag, compactStore) => `Open ${storeTag} · ${compactStore}`,
    editionsHeading: "Editions & Price Difference",
    editionsCompareSub: (platformName, storeTag) => `${platformName} · Based on ${storeTag}`,
    editionsSamePrice: " · Same price",
    editionsPriceDiff: (diffMoney) => ` · Diff +${diffMoney}`,
    activeEditionBadge: "Viewing",
    upgradeQuestion: "Already own the Standard Edition?",
    upgradeIncludedInSub: "Included with platform subscription",
    upgradeBundleLabel: (storeTag, money) => `${storeTag} Ultimate upgrade ${money}`,
    viewUpgradeLink: "View upgrade",
    regionsHeading: "Official Regional Store Prices",
    regionsDesc: (platformName, editionName) =>
      `Public digital list prices for ${platformName} · ${editionName}. Click a store region to inspect verification and FX dates.`,
    regionFilterAria: "Filter store regions",
    allRegionsOption: "All regions",
    searchRegionAria: "Find store region",
    searchRegionPlaceholder: "Search region, e.g. Hong Kong",
    tableAria: "Official regional digital store prices",
    tableCols: ["#", "Store Region", "Converted", "Local Price", "vs US Store", "Tax & Store"],
    usStoreBaseline: "US baseline",
    diffLower: (pct) => `-${pct}%`,
    diffHigher: (pct) => `+${pct}%`,
    diffPendingCompare: "Uncompared",
    disclosureAria: (marketName) => `View ${marketName} quote details`,
    shopLinkAria: (marketName, platformName, editionName) =>
      `Open ${marketName} ${platformName} ${editionName} official store`,
    evidenceSourcePrefix: "Source: ",
    evidenceLastVerified: "Last verified: ",
    evidenceVerified: "Verified: ",
    evidenceFxPrefix: "FX date: ",
    evidenceTaxPrefix: "Tax: ",
    evidenceMemberFallback: "Member",
    evidenceMemberPrice: (tier, money) => `${tier} price: ${money}`,
    openOfficialStoreLink: "Open official store page",
    noMatchingRegions: "No matching store regions.",
    clearFilterBtn: "Reset filter",
    tableFooterSummary: (count) =>
      `Showing ${count} official store ${count === 1 ? "region" : "regions"} · Public list prices; final total confirmed at checkout`,
    sourcesTriggerBtn: "Price sources",
    faqHeading: "Before You Buy",
    sourcesDialogTitle: "Official Store Price Sources",
    sourcesIntro:
      "All prices come directly from public digital purchase pages on each console platform's official storefront.",
    sourcesUnavailable: (storeName) => `${storeName} sources are temporarily unavailable.`,
    sourcesLoading: (storeName) => `Loading ${storeName} sources…`,
    sourcesFxDate: (date) => `FX reference date: ${date}`,
    sourcesFxFallback: "FX reference: latest verified USD exchange rate",
    insightError: "Latest official store quotes are temporarily unavailable.",
    insightLoading: "Loading official store quotes…",
    insightNoMatch: "No matching store regions.",
    insightSingleMarket: ({ marketName, editionName, localPrice, convertedPrice, missingMarketName }) =>
      `${marketName} store lists ${editionName} at ${localPrice}` +
      (convertedPrice !== null ? ` (~${convertedPrice})` : "") +
      (missingMarketName ? `; ${missingMarketName} store has no active quote right now.` : "."),
    insightMissingFx: (count) => `${count} regions verified; exchange rate unavailable.`,
    insightEqualPrices: (count) => `${count} regions verified; converted prices are equal.`,
    insightUsLowest: (count) => `${count} regions verified; United States is lowest.`,
    insightLowestWithSaving: ({ count, marketName, savedNode }) => (
      <>
        {count} regions verified · {marketName} is lowest
        {savedNode && <>, saving about {savedNode} vs US</>}
        .
      </>
    ),
  },
  ja: {
    fallbackMetaTitle: "ゲーム価格比較",
    metaTitle: (title) => `${title} 地域別ストア価格比較`,
    metaDescription: (title, englishTitle) =>
      `『${englishTitle ?? title}』の PS5・Xbox 各国公式ストア価格、エディション差額、為替換算を比較します。`,
    breadcrumbAria: "パンくずリスト",
    breadcrumbGames: "ゲーム価格比較",
    platformTabsAria: "対応プラットフォーム",
    editionTabsAria: "エディション",
    statusUnavailable: "現在ウェブ購入不可",
    statusExpired: "最新価格を再取得中",
    statusPending: "確認中",
    taxIncluded: "税込",
    taxAtCheckout: "決済時に税計算",
    taxSeeCheckout: "決済画面に準拠",
    unannouncedFallbackBadge: "未発表",
    unannouncedFallbackTitle: (platformName) => `${platformName} 版は未発表です`,
    unannouncedFallbackDesc:
      "このプラットフォームでは公式ストアでの予約・価格公開がまだ行われていません。販売中のコンソール版の地域別価格をご確認ください。",
    viewPlatformOffersBtn: (platformName) => `${platformName} の地域別価格を見る`,
    viewOfficialSiteLink: (publisher) => `${publisher} 公式サイトへ`,
    lowestCardAria: "最安価格サマリー",
    lowestGlobalLabel: "全地域で最安",
    currentValidQuoteLabel: "現在の有効価格",
    cheaperThanUsStore: (pct) => `米国ストアより ${pct}% 安い`,
    localListPrice: (money) => `現地価格 ${money}`,
    originalPrice: (money) => `通常価格 ${money}`,
    usStoreSameEdition: "米国ストア同一版",
    saveVsUsStore: "米国ストアとの差額",
    comparisonStatusLabel: "比較ステータス",
    verifiedCountStatus: (priced, total) => `${priced} / ${total} ストア確認済み`,
    emptyHeroNote:
      "このエディションの公式ストア価格は現在確認中です。下部のストアリンクから商品ページを直接ご確認いただけます。",
    verifiedPrefix: "確認 ",
    fxPrefix: "為替 ",
    goToStoreBtn: (storeTag, compactStore) => `${storeTag}の ${compactStore} へ`,
    editionsHeading: "エディション比較と価格差",
    editionsCompareSub: (platformName, storeTag) => `${platformName} · ${storeTag}基準`,
    editionsSamePrice: " · 同額",
    editionsPriceDiff: (diffMoney) => ` · 差額 +${diffMoney}`,
    activeEditionBadge: "表示中",
    upgradeQuestion: "通常版をお持ちですか？",
    upgradeIncludedInSub: "プラットフォームのサブスク対象",
    upgradeBundleLabel: (storeTag, money) => `${storeTag} アルティメットアップグレード ${money}`,
    viewUpgradeLink: "アップグレードを見る",
    regionsHeading: "地域別 公式ストア価格",
    regionsDesc: (platformName, editionName) =>
      `${platformName} · ${editionName}の公開販売価格。地域名をクリックすると確認日時と為替基準日を表示します。`,
    regionFilterAria: "ストア地域で絞り込み",
    allRegionsOption: "すべての地域",
    searchRegionAria: "地域を検索",
    searchRegionPlaceholder: "地域を検索（例：香港）",
    tableAria: "各国公式デジタルストア販売価格",
    tableCols: ["#", "ストア地域", "換算価格", "現地価格", "米国ストア比", "税・ストア"],
    usStoreBaseline: "米国基準",
    diffLower: (pct) => `${pct}% 安い`,
    diffHigher: (pct) => `${pct}% 高い`,
    diffPendingCompare: "比較待ち",
    disclosureAria: (marketName) => `${marketName}の価格根拠を表示`,
    shopLinkAria: (marketName, platformName, editionName) =>
      `${marketName}の ${platformName} ${editionName} 公式ストアを開く`,
    evidenceSourcePrefix: "出典：",
    evidenceLastVerified: "前回確認：",
    evidenceVerified: "確認日：",
    evidenceFxPrefix: "為替基準：",
    evidenceTaxPrefix: "税：",
    evidenceMemberFallback: "会員",
    evidenceMemberPrice: (tier, money) => `${tier}価格：${money}`,
    openOfficialStoreLink: "公式ストアページを開く",
    noMatchingRegions: "一致するストア地域がありません。",
    clearFilterBtn: "絞り込みを解除",
    tableFooterSummary: (count) =>
      `${count} 件の公式ストア地域を表示 · 公開表示価格（最終請求額は決済画面をご確認ください）`,
    sourcesTriggerBtn: "価格の出典",
    faqHeading: "購入前の確認事項",
    sourcesDialogTitle: "公式ストア価格の出典",
    sourcesIntro:
      "すべての価格は各コンソール公式デジタルストアの公開商品ページから取得しています。確認日時は各地域の詳細欄をご覧ください。",
    sourcesUnavailable: (storeName) => `${storeName} の出典情報を取得できませんでした。`,
    sourcesLoading: (storeName) => `${storeName} の出典を読み込み中…`,
    sourcesFxDate: (date) => `為替基準日：${date}`,
    sourcesFxFallback: "為替基準：直近の有効な米ドル為替レートで換算",
    insightError: "最新の価格情報を取得できませんでした。",
    insightLoading: "公式ストア価格を読み込み中…",
    insightNoMatch: "一致するストア地域がありません。",
    insightSingleMarket: ({ marketName, editionName, localPrice, convertedPrice, missingMarketName }) =>
      `${marketName}ストアの${editionName}は ${localPrice}` +
      (convertedPrice !== null ? `（換算 ${convertedPrice}）` : "") +
      (missingMarketName ? `。${missingMarketName}ストアは現在有効な価格がありません。` : "。"),
    insightMissingFx: (count) => `${count} 地域を確認済み（為替レート未取得）。`,
    insightEqualPrices: (count) => `${count} 地域を確認済み、各地域の換算価格は同額です。`,
    insightUsLowest: (count) => `${count} 地域を確認済み、米国が最安です。`,
    insightLowestWithSaving: ({ count, marketName, savedNode }) => (
      <>
        {count} 地域を確認済み、{marketName}が最安
        {savedNode && <>（米国より約 {savedNode} お得）</>}
        。
      </>
    ),
  },
  ko: {
    fallbackMetaTitle: "게임 가격 비교",
    metaTitle: (title) => `${title} 지역별 스토어 가격 비교`,
    metaDescription: (title, englishTitle) =>
      `${englishTitle ?? title}의 PS5 및 Xbox 지역별 공식 디지털 스토어 가격, 에디션 차액 및 환율 환산가를 비교합니다.`,
    breadcrumbAria: "경로 탐색",
    breadcrumbGames: "게임 가격 비교",
    platformTabsAria: "게임 플랫폼",
    editionTabsAria: "게임 에디션",
    statusUnavailable: "웹 스토어 구매 불가",
    statusExpired: "최신 가격 확인 필요",
    statusPending: "검증 대기",
    taxIncluded: "세금 포함",
    taxAtCheckout: "결제 시 세금 부과",
    taxSeeCheckout: "결제 페이지 기준",
    unannouncedFallbackBadge: "미발표",
    unannouncedFallbackTitle: (platformName) => `${platformName} 버전 미발표`,
    unannouncedFallbackDesc:
      "아직 해당 플랫폼의 공식 스토어 예약 구매나 판매 가격이 공개되지 않았습니다. 출시된 콘솔 플랫폼의 지역별 가격을 먼저 확인해 보세요.",
    viewPlatformOffersBtn: (platformName) => `${platformName} 지역별 가격 보기`,
    viewOfficialSiteLink: (publisher) => `${publisher} 공식 사이트`,
    lowestCardAria: "최저가 요약",
    lowestGlobalLabel: "전 지역 최저가",
    currentValidQuoteLabel: "현재 유효 가격",
    cheaperThanUsStore: (pct) => `미국 스토어보다 ${pct}% 저렴`,
    localListPrice: (money) => `현지 표시가 ${money}`,
    originalPrice: (money) => `정가 ${money}`,
    usStoreSameEdition: "미국 스토어 동일 에디션",
    saveVsUsStore: "미국 스토어 대비 절약",
    comparisonStatusLabel: "비교 상태",
    verifiedCountStatus: (priced, total) => `${priced} / ${total} 스토어 검증됨`,
    emptyHeroNote:
      "현재 에디션의 공식 스토어 가격을 확인 중입니다. 아래 스토어 링크에서 상품 페이지를 직접 확인하실 수 있습니다.",
    verifiedPrefix: "검증 ",
    fxPrefix: "환율 ",
    goToStoreBtn: (storeTag, compactStore) => `${storeTag} ${compactStore} 이동`,
    editionsHeading: "에디션 구성 및 가격 차이",
    editionsCompareSub: (platformName, storeTag) => `${platformName} · ${storeTag} 기준`,
    editionsSamePrice: " · 동일 가격",
    editionsPriceDiff: (diffMoney) => ` · 차액 +${diffMoney}`,
    activeEditionBadge: "선택됨",
    upgradeQuestion: "스탠다드 에디션 본편이 있으신가요?",
    upgradeIncludedInSub: "플랫폼 구독 서비스 포함",
    upgradeBundleLabel: (storeTag, money) => `${storeTag} 얼티밋 업그레이드 팩 ${money}`,
    viewUpgradeLink: "업그레이드 보기",
    regionsHeading: "지역별 공식 스토어 가격",
    regionsDesc: (platformName, editionName) =>
      `${platformName} · ${editionName} 공개 단품 가격입니다. 지역명을 누르면 검증 시각과 환율 기준일을 확인할 수 있습니다.`,
    regionFilterAria: "스토어 지역 필터",
    allRegionsOption: "전체 지역",
    searchRegionAria: "지역 찾기",
    searchRegionPlaceholder: "지역 검색 (예: 홍콩)",
    tableAria: "지역별 공식 디지털 스토어 판매가",
    tableCols: ["#", "스토어 지역", "환산가", "현지 표시가", "미국 스토어 대비", "세금 및 스토어"],
    usStoreBaseline: "미국 기준",
    diffLower: (pct) => `${pct}% 저렴`,
    diffHigher: (pct) => `${pct}% 비쌈`,
    diffPendingCompare: "비교 대기",
    disclosureAria: (marketName) => `${marketName} 가격 근거 보기`,
    shopLinkAria: (marketName, platformName, editionName) =>
      `${marketName} ${platformName} ${editionName} 공식 스토어 이동`,
    evidenceSourcePrefix: "출처: ",
    evidenceLastVerified: "이전 검증: ",
    evidenceVerified: "검증: ",
    evidenceFxPrefix: "환율 기준: ",
    evidenceTaxPrefix: "세금: ",
    evidenceMemberFallback: "멤버십",
    evidenceMemberPrice: (tier, money) => `${tier} 할인가: ${money}`,
    openOfficialStoreLink: "공식 스토어 페이지 열기",
    noMatchingRegions: "일치하는 스토어 지역이 없습니다.",
    clearFilterBtn: "필터 초기화",
    tableFooterSummary: (count) =>
      `공식 스토어 ${count}개 지역 표시 · 공개 단품 표시가 기준이며 최종 결제액은 결제 페이지에서 확정됩니다`,
    sourcesTriggerBtn: "가격 출처",
    faqHeading: "구매 전 안내",
    sourcesDialogTitle: "공식 스토어 가격 출처",
    sourcesIntro:
      "모든 가격은 각 콘솔 플랫폼 공식 디지털 스토어의 공개 상품 페이지에서 확인했으며, 검증 시각은 지역별 상세 행에 표시됩니다.",
    sourcesUnavailable: (storeName) => `${storeName} 출처 정보를 불러오지 못했습니다.`,
    sourcesLoading: (storeName) => `${storeName} 출처 불러오는 중…`,
    sourcesFxDate: (date) => `환율 기준일: ${date}`,
    sourcesFxFallback: "환율 기준: 최근 유효 USD 기준 환율 적용",
    insightError: "최신 가격 정보를 불러오지 못했습니다.",
    insightLoading: "공식 스토어 가격 불러오는 중…",
    insightNoMatch: "일치하는 스토어 지역이 없습니다.",
    insightSingleMarket: ({ marketName, editionName, localPrice, convertedPrice, missingMarketName }) =>
      `${marketName} 스토어의 ${editionName} 가격은 ${localPrice}` +
      (convertedPrice !== null ? ` (환산 ${convertedPrice})` : "") +
      (missingMarketName ? `이며, ${missingMarketName} 스토어는 현재 유효한 가격 정보가 없습니다.` : "입니다."),
    insightMissingFx: (count) => `${count}개 지역 검증 완료, 환율 정보 대기 중입니다.`,
    insightEqualPrices: (count) => `${count}개 지역 검증 완료, 지역별 환산 가격이 동일합니다.`,
    insightUsLowest: (count) => `${count}개 지역 검증 완료, 미국이 가장 저렴합니다.`,
    insightLowestWithSaving: ({ count, marketName, savedNode }) => (
      <>
        {count}개 지역 검증 · {marketName} 최저가
        {savedNode && <>, 미국 대비 약 {savedNode} 절약</>}
        .
      </>
    ),
  },
  es: {
    fallbackMetaTitle: "Precios de videojuegos",
    metaTitle: (title) => `Precios de ${title} por región`,
    metaDescription: (title, englishTitle) =>
      `Compara los precios digitales oficiales de ${englishTitle ?? title} en PS5 y Xbox por tienda regional, diferencias de edición y cambio de divisa.`,
    breadcrumbAria: "Ruta de navegación",
    breadcrumbGames: "Videojuegos",
    platformTabsAria: "Plataforma de juego",
    editionTabsAria: "Edición del juego",
    statusUnavailable: "No disponible en web",
    statusExpired: "Cotización reciente no disponible",
    statusPending: "Pendiente",
    taxIncluded: "Impuestos incl.",
    taxAtCheckout: "Impuestos al pagar",
    taxSeeCheckout: "Según pago final",
    unannouncedFallbackBadge: "Por anunciar",
    unannouncedFallbackTitle: (platformName) => `Versión de ${platformName} aún no anunciada`,
    unannouncedFallbackDesc:
      "La reserva y el precio oficial para esta plataforma aún no están publicados. Puedes consultar los precios regionales en las consolas disponibles.",
    viewPlatformOffersBtn: (platformName) => `Ver precios en ${platformName}`,
    viewOfficialSiteLink: (publisher) => `Web oficial de ${publisher}`,
    lowestCardAria: "Resumen del precio más bajo",
    lowestGlobalLabel: "Mínimo global",
    currentValidQuoteLabel: "Precio verificado",
    cheaperThanUsStore: (pct) => `${pct}% más barato que Tienda EE. UU.`,
    localListPrice: (money) => `Precio local ${money}`,
    originalPrice: (money) => `Antes ${money}`,
    usStoreSameEdition: "Misma edición en EE. UU.",
    saveVsUsStore: "Ahorro frente a EE. UU.",
    comparisonStatusLabel: "Estado de comparación",
    verifiedCountStatus: (priced, total) => `${priced} / ${total} tiendas verificadas`,
    emptyHeroNote:
      "El precio oficial de esta edición está pendiente de verificación. Usa los enlaces inferiores para abrir cada tienda directamente.",
    verifiedPrefix: "Verificado ",
    fxPrefix: "Cambio ",
    goToStoreBtn: (storeTag, compactStore) => `Ir a ${storeTag} · ${compactStore}`,
    editionsHeading: "Ediciones y diferencia de precio",
    editionsCompareSub: (platformName, storeTag) => `${platformName} · Referencia ${storeTag}`,
    editionsSamePrice: " · Mismo precio",
    editionsPriceDiff: (diffMoney) => ` · Dif. +${diffMoney}`,
    activeEditionBadge: "Viendo",
    upgradeQuestion: "¿Ya tienes la Edición Estándar?",
    upgradeIncludedInSub: "Incluido en la suscripción de la plataforma",
    upgradeBundleLabel: (storeTag, money) => `Mejora Definitiva en ${storeTag}: ${money}`,
    viewUpgradeLink: "Ver mejora",
    regionsHeading: "Precios oficiales por tienda regional",
    regionsDesc: (platformName, editionName) =>
      `Precios públicos digitales de ${platformName} · ${editionName}. Pulsa en una región para ver la fecha de verificación y el tipo de cambio.`,
    regionFilterAria: "Filtrar regiones de tienda",
    allRegionsOption: "Todas las regiones",
    searchRegionAria: "Buscar región",
    searchRegionPlaceholder: "Buscar región, p. ej. Hong Kong",
    tableAria: "Precios digitales en tiendas oficiales regionales",
    tableCols: ["#", "Tienda regional", "Convertido", "Precio local", "vs EE. UU.", "Impuestos y tienda"],
    usStoreBaseline: "Base EE. UU.",
    diffLower: (pct) => `-${pct}%`,
    diffHigher: (pct) => `+${pct}%`,
    diffPendingCompare: "Sin referencia",
    disclosureAria: (marketName) => `Ver detalles del precio en ${marketName}`,
    shopLinkAria: (marketName, platformName, editionName) =>
      `Abrir tienda oficial de ${marketName} para ${platformName} ${editionName}`,
    evidenceSourcePrefix: "Fuente: ",
    evidenceLastVerified: "Última verificación: ",
    evidenceVerified: "Verificado: ",
    evidenceFxPrefix: "Fecha FX: ",
    evidenceTaxPrefix: "Impuestos: ",
    evidenceMemberFallback: "Suscriptor",
    evidenceMemberPrice: (tier, money) => `Precio ${tier}: ${money}`,
    openOfficialStoreLink: "Abrir ficha en tienda oficial",
    noMatchingRegions: "No hay regiones que coincidan con el filtro.",
    clearFilterBtn: "Limpiar filtro",
    tableFooterSummary: (count) =>
      `Mostrando ${count} ${count === 1 ? "tienda oficial" : "tiendas oficiales"} · Precios públicos; el importe definitivo se confirma al pagar`,
    sourcesTriggerBtn: "Fuentes de precios",
    faqHeading: "Antes de comprar",
    sourcesDialogTitle: "Fuentes oficiales de precios",
    sourcesIntro:
      "Todos los precios proceden de las fichas públicas de compra digital en las tiendas oficiales de cada consola.",
    sourcesUnavailable: (storeName) => `Las fuentes de ${storeName} no están disponibles temporalmente.`,
    sourcesLoading: (storeName) => `Cargando fuentes de ${storeName}…`,
    sourcesFxDate: (date) => `Fecha del tipo de cambio: ${date}`,
    sourcesFxFallback: "Tipo de cambio: última tasa de referencia en USD disponible",
    insightError: "No se han podido obtener las cotizaciones más recientes.",
    insightLoading: "Cargando precios oficiales…",
    insightNoMatch: "No hay regiones que coincidan con el filtro.",
    insightSingleMarket: ({ marketName, editionName, localPrice, convertedPrice, missingMarketName }) =>
      `La tienda de ${marketName} publica ${editionName} por ${localPrice}` +
      (convertedPrice !== null ? ` (~${convertedPrice})` : "") +
      (missingMarketName ? `; la tienda de ${missingMarketName} no tiene cotización activa.` : "."),
    insightMissingFx: (count) => `${count} regiones verificadas; tipo de cambio no disponible.`,
    insightEqualPrices: (count) => `${count} regiones verificadas; el precio convertido coincide.`,
    insightUsLowest: (count) => `${count} regiones verificadas; Estados Unidos tiene el precio más bajo.`,
    insightLowestWithSaving: ({ count, marketName, savedNode }) => (
      <>
        {count} regiones verificadas · {marketName} es la más barata
        {savedNode && <>, con un ahorro aproximado de {savedNode} frente a EE. UU.</>}
        .
      </>
    ),
  },
};

export function getGameDirectoryCopy(locale: CanvasLocale = "zh"): GameDirectoryUiCopy {
  return gameDirectoryCopyByLocale[resolveCanvasLocale(locale)];
}

export function getGameDetailCopy(locale: CanvasLocale = "zh"): GameDetailUiCopy {
  return gameDetailCopyByLocale[resolveCanvasLocale(locale)];
}

export function getGamesDirectoryMetadataCopy(locale: CanvasLocale = "zh") {
  const copy = getGameDirectoryCopy(locale);
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
  };
}

export function getGameDetailMetadataCopy(
  locale: CanvasLocale = "zh",
  meta?: GameCatalogMeta | null,
) {
  const copy = getGameDetailCopy(locale);
  if (!meta) {
    return { title: copy.fallbackMetaTitle };
  }
  return {
    title: copy.metaTitle(meta.title),
    description: copy.metaDescription(meta.title, meta.englishTitle),
  };
}

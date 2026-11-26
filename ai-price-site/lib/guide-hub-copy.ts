import { getCoreGuideDefinition, type CoreGuideSlug } from "./core-guide-content.ts";
import type { CanvasLocale } from "./canvas-ui-copy.ts";
import type { GuideCard, GuideLink } from "./guide-presentation.ts";

export type FoundationalGuideKey = "price-guide" | "payment-account" | "tool-review" | "methodology";

export type GuideHubCopy = {
  hubEyebrow: string;
  hubTitle: string;
  hubDescription: string;
  heroHighlights: string[];
  dynamicArticlesCount: (count: number) => string;
  backToGuides: string;
  startKicker: string;
  startTitle: string;
  startMeta: string;
  stepReadCta: string;
  minutesLabel: (minutes: number) => string;
  checkpointsLabel: (count: number) => string;
  editorialTitle: string;
  collectionTitle: string;
  articlesCountLabel: (count: number) => string;
  allFilter: string;
  filterGroupLabel: string;
  searchPlaceholder: string;
  clearSearchLabel: string;
  noFilterMatch: string;
  readArticleCta: string;
  taxonomyCategoriesLabel: string;
  taxonomyTagsLabel: string;
  bridgesKicker: string;
  bridgesTitle: string;
  bridgesSubtitle: string;
  bridges: GuideLink[];
  contactTitle: string;
  contactBody: string;
  contactPrimaryLabel: string;
  contactPrimaryHref: string;
  contactSecondaryLabel: string;
  contactSecondaryHref: string;
  toolReview: {
    eyebrow: string;
    title: string;
    cardDescription: string;
    articleDescription: string;
  };
  articleQuickToolsTitle: string;
  articleContinueTitle: string;
  coreArticleMeta: (checkpoints: number, minutes: number) => string;
};

const COPY = {
  zh: {
    hubEyebrow: "跨区订阅决策与核验手册",
    hubTitle: "GeoSub 订阅指南",
    hubDescription:
      "用公开核验数据拆解全球数字订阅价差，帮你理清本地标价、汇率换算、税费规则、账号归属与长期订阅总成本。",
    heroHighlights: [
      "4 步跨区核对路径",
      "原始标价与汇率口径",
      "账号归属与付款边界",
      "直连实时比价工具",
    ],
    dynamicArticlesCount: (count) => `${count} 篇专题文章`,
    backToGuides: "返回指南中心",
    startKicker: "新手必读基石",
    startTitle: "第一次买外区订阅？按这 4 步依次核对",
    startMeta: "全流程读完约 10 分钟 · 避开常见汇率与风控误区",
    stepReadCta: "查看核对要点",
    minutesLabel: (minutes) => `约 ${minutes} 分钟`,
    checkpointsLabel: (count) => `${count} 个核对项`,
    editorialTitle: "专题文章与实战测评",
    collectionTitle: "收录文章",
    articlesCountLabel: (count) => `共 ${count} 篇`,
    allFilter: "全部",
    filterGroupLabel: "按主题筛选指南",
    searchPlaceholder: "搜索指南标题或关键词…",
    clearSearchLabel: "清空搜索",
    noFilterMatch: "当前筛选条件下没有匹配的指南，试试切换分类或清空关键词。",
    readArticleCta: "阅读全文",
    taxonomyCategoriesLabel: "分类专栏",
    taxonomyTagsLabel: "热门话题标签",
    bridgesKicker: "边看边查 · 实时价格库",
    bridgesTitle: "看完规则，直接核对各区实时价格",
    bridgesSubtitle: "每条记录均保留平台本地原币标价、汇率基准日期与美区差额，不混用估算值。",
    bridges: [
      {
        href: "/zh/ai-pricing",
        title: "AI 订阅各区比价",
        description: "对比 ChatGPT、Claude、Gemini 等主流 AI 套餐的全球月付/年付标价与最低地区。",
        badge: "核心比价",
        icon: "ai",
      },
      {
        href: "/zh/streaming-pricing",
        title: "流媒体与内容订阅",
        description: "查看 Netflix、Spotify、YouTube Premium 等个人与家庭方案的跨区价差。",
        badge: "热门品类",
        icon: "streaming",
      },
      {
        href: "/zh/countries",
        title: "国家与地区低价榜",
        description: "按国家切入，快速检索哪些数字服务在土耳其、尼日利亚、印度或日区更划算。",
        badge: "按地区查",
        icon: "country",
      },
      {
        href: "/zh/tools/currency-converter",
        title: "订阅汇率换算器",
        description: "把里拉、日元、卢比等平台原币标价实时折算为人民币或美元，估算真实账单。",
        badge: "实用工具",
        icon: "converter",
      },
    ],
    contactTitle: "没找到你遇到的具体订阅问题？",
    contactBody: "查看完整数据采集与核验标准，或直接告诉我们你卡在哪一步。",
    contactPrimaryLabel: "联系我们",
    contactPrimaryHref: "/zh/contact",
    contactSecondaryLabel: "数据来源与口径",
    contactSecondaryHref: "/zh/data-sources",
    toolReview: {
      eyebrow: "工具测评",
      title: "怎样判断一个数字工具是否值得订阅",
      cardDescription:
        "不要只看功能清单或单次跑分。从高频任务、能力边界、持续总成本与证据日期判断工具是否值得长期付费。",
      articleDescription: "不要只看功能清单或单次跑分。先明确使用场景，再比较能力、限制和持续成本。",
    },
    articleQuickToolsTitle: "顺手查实时数据",
    articleContinueTitle: "继续阅读 · 核心必读路径",
    coreArticleMeta: (checkpoints, minutes) => `核心必读 · ${checkpoints} 个核对项 · 约 ${minutes} 分钟读完`,
  },
  en: {
    hubEyebrow: "Cross-Region Subscription Playbook",
    hubTitle: "Subscription & Pricing Guides",
    hubDescription:
      "Break down global digital subscription price gaps with verified data—covering local list prices, exchange-rate dates, tax rules, account eligibility, and ongoing cost.",
    heroHighlights: [
      "4-step starter playbook",
      "Local price & FX rules",
      "Account & payment checks",
      "Direct live-price tools",
    ],
    dynamicArticlesCount: (count) => `${count} editorial ${count === 1 ? "guide" : "guides"}`,
    backToGuides: "Back to guides",
    startKicker: "Starter Playbook",
    startTitle: "New to regional pricing? Check these 4 essentials first",
    startMeta: "~10 min end-to-end · Avoid FX, tax, and checkout surprises",
    stepReadCta: "Read checklist",
    minutesLabel: (minutes) => `${minutes} min read`,
    checkpointsLabel: (count) => `${count} checkpoints`,
    editorialTitle: "Editorial Guides & Reviews",
    collectionTitle: "Published Guides",
    articlesCountLabel: (count) => `${count} ${count === 1 ? "guide" : "guides"}`,
    allFilter: "All",
    filterGroupLabel: "Filter guides by category",
    searchPlaceholder: "Search guides by title or keyword…",
    clearSearchLabel: "Clear search",
    noFilterMatch: "No guides match the current filter. Try another topic or clear your search.",
    readArticleCta: "Read guide",
    taxonomyCategoriesLabel: "Categories",
    taxonomyTagsLabel: "Popular tags",
    bridgesKicker: "Live Data & Utilities",
    bridgesTitle: "Put the Playbook to Work: Check Live Prices",
    bridgesSubtitle:
      "Every comparison preserves local checkout currency, FX snapshot date, and US baseline spread.",
    bridges: [
      {
        href: "/en/ai-pricing",
        title: "AI Subscription Pricing",
        description: "Compare ChatGPT, Claude, Gemini, and leading AI plans across countries and billing cycles.",
        badge: "Core Index",
        icon: "ai",
      },
      {
        href: "/en/streaming-pricing",
        title: "Streaming Pricing",
        description: "Track regional monthly and family plan gaps across Netflix, Spotify, and YouTube Premium.",
        badge: "Streaming",
        icon: "streaming",
      },
      {
        href: "/en/countries",
        title: "Country Savings Index",
        description: "Browse by country to see which digital subscriptions cost significantly less locally.",
        badge: "By Country",
        icon: "country",
      },
      {
        href: "/en/tools/currency-converter",
        title: "Subscription Currency Converter",
        description: "Convert TRY, JPY, INR, and local store list prices into USD, EUR, GBP, or CNY.",
        badge: "Utility",
        icon: "converter",
      },
    ],
    contactTitle: "Want to inspect how every regional price is verified?",
    contactBody: "Review our collection sources, FX snapshot rules, and recent regional price changes.",
    contactPrimaryLabel: "Data sources & rules",
    contactPrimaryHref: "/en/data-sources",
    contactSecondaryLabel: "Price change history",
    contactSecondaryHref: "/en/price-history",
    toolReview: {
      eyebrow: "Tool Review",
      title: "How to decide whether a digital tool is worth subscribing to",
      cardDescription:
        "Go beyond feature checklists and one-off benchmarks—evaluate real tasks, capability limits, total ongoing cost, and dated evidence.",
      articleDescription:
        "Do not rely on a feature list or one benchmark. Define the use case, then compare capability, limits and ongoing cost.",
    },
    articleQuickToolsTitle: "Check Live Pricing",
    articleContinueTitle: "Continue with the Starter Playbook",
    coreArticleMeta: (checkpoints, minutes) =>
      `Core playbook · ${checkpoints} checkpoints · ~${minutes} min read`,
  },
  "zh-tw": {
    hubEyebrow: "跨區訂閱決策與核驗手冊",
    hubTitle: "GeoSub 訂閱指南",
    hubDescription:
      "以公開核驗資料拆解全球數位訂閱價差，協助你釐清當地標價、匯率換算、稅費規則、帳號歸屬與長期訂閱總成本。",
    heroHighlights: [
      "4 步跨區核對流程",
      "原始標價與匯率基準",
      "帳號歸屬與付款邊界",
      "直連即時比價工具",
    ],
    dynamicArticlesCount: (count) => `${count} 篇專題指南`,
    backToGuides: "返回指南中心",
    startKicker: "新手必讀基石",
    startTitle: "第一次研究跨區訂閱？先依序核對這 4 個重點",
    startMeta: "全流程讀完約 10 分鐘 · 避開常見匯率與付款誤區",
    stepReadCta: "查看核對重點",
    minutesLabel: (minutes) => `約 ${minutes} 分鐘`,
    checkpointsLabel: (count) => `${count} 個核對項`,
    editorialTitle: "專題文章與實戰評測",
    collectionTitle: "收錄文章",
    articlesCountLabel: (count) => `共 ${count} 篇`,
    allFilter: "全部",
    filterGroupLabel: "依主題篩選指南",
    searchPlaceholder: "搜尋指南標題或關鍵字…",
    clearSearchLabel: "清除搜尋",
    noFilterMatch: "目前篩選條件下沒有符合的指南，試試切換分類或清除關鍵字。",
    readArticleCta: "閱讀全文",
    taxonomyCategoriesLabel: "分類專欄",
    taxonomyTagsLabel: "熱門標籤",
    bridgesKicker: "邊看邊查 · 即時價格資料",
    bridgesTitle: "讀完規則，直接核對各區即時價格",
    bridgesSubtitle: "每筆紀錄皆保留平台當地原幣標價、匯率基準日期與美區差額，不混用未核驗估算值。",
    bridges: [
      {
        href: "/zh-tw/ai-pricing",
        title: "AI 訂閱各區比價",
        description: "比較 ChatGPT、Claude、Gemini 等主流 AI 方案的全球月付／年付標價與最低價地區。",
        badge: "核心比價",
        icon: "ai",
      },
      {
        href: "/zh-tw/streaming-pricing",
        title: "串流媒體與內容訂閱",
        description: "查看 Netflix、Spotify、YouTube Premium 等個人與家庭方案的跨區價差。",
        badge: "熱門品類",
        icon: "streaming",
      },
      {
        href: "/zh-tw/countries",
        title: "國家與地區低價榜",
        description: "從國家切入，快速檢索哪些數位服務在土耳其、奈及利亞、印度或日本更划算。",
        badge: "依地區查",
        icon: "country",
      },
      {
        href: "/zh-tw/tools/currency-converter",
        title: "訂閱匯率換算器",
        description: "將里拉、日圓、盧比等平台原幣標價即時換算為新台幣或美元，估算真實帳單。",
        badge: "實用工具",
        icon: "converter",
      },
    ],
    contactTitle: "沒找到你遇到的訂閱問題？",
    contactBody: "查看完整資料來源與核驗標準，或直接告訴我們你想確認的產品與地區。",
    contactPrimaryLabel: "聯絡我們",
    contactPrimaryHref: "/zh-tw/contact",
    contactSecondaryLabel: "資料來源與基準",
    contactSecondaryHref: "/zh-tw/data-sources",
    toolReview: {
      eyebrow: "工具評測",
      title: "如何判斷一款數位工具是否值得長期訂閱",
      cardDescription:
        "別只看功能清單或單次跑分。從高頻任務、能力邊界、持續總成本與證據日期評估是否值得付費。",
      articleDescription:
        "不要只依賴功能列表或單一跑分。先釐清實際使用情境，再比較能力上限、限制條件與長期成本。",
    },
    articleQuickToolsTitle: "順手查即時價格",
    articleContinueTitle: "繼續閱讀 · 核心必讀路徑",
    coreArticleMeta: (checkpoints, minutes) =>
      `核心必讀 · ${checkpoints} 個核對項 · 約 ${minutes} 分鐘讀完`,
  },
  ja: {
    hubEyebrow: "地域別サブスク比較・検証プレイブック",
    hubTitle: "サブスクリプション料金・契約ガイド",
    hubDescription:
      "検証済みの公開データをもとに、現地通貨価格・為替基準日・税制・アカウント条件・継続コストの読み解き方をまとめました。",
    heroHighlights: [
      "4ステップ基本チェック",
      "現地価格と為替ルール",
      "決済・アカウント条件",
      "最新価格ツールへ直結",
    ],
    dynamicArticlesCount: (count) => `特集ガイド ${count} 本`,
    backToGuides: "ガイド一覧に戻る",
    startKicker: "最初に読む基本ガイド",
    startTitle: "地域別価格を比較する前に押さえたい 4 つの基本",
    startMeta: "全体で約 10 分 · 為替や決済条件の見落としを防止",
    stepReadCta: "チェック項目を見る",
    minutesLabel: (minutes) => `約 ${minutes} 分`,
    checkpointsLabel: (count) => `${count} つの確認項目`,
    editorialTitle: "特集記事・ツール評価",
    collectionTitle: "公開中のガイド",
    articlesCountLabel: (count) => `全 ${count} 本`,
    allFilter: "すべて",
    filterGroupLabel: "カテゴリーで絞り込む",
    searchPlaceholder: "タイトルやキーワードで検索…",
    clearSearchLabel: "検索をクリア",
    noFilterMatch: "条件に一致するガイドが見つかりませんでした。別のカテゴリーを選ぶか検索語をクリアしてください。",
    readArticleCta: "記事を読む",
    taxonomyCategoriesLabel: "カテゴリー",
    taxonomyTagsLabel: "注目タグ",
    bridgesKicker: "ライブ価格データ & ツール",
    bridgesTitle: "基本を押さえたら、各国の最新価格をチェック",
    bridgesSubtitle:
      "すべての比較ページで現地通貨建ての公式価格、為替基準日、米国基準との差額を併記しています。",
    bridges: [
      {
        href: "/ja/ai-pricing",
        title: "AI サブスク料金比較",
        description: "ChatGPT・Claude・Gemini など主要 AI プランの国別料金と請求周期を比較。",
        badge: "AI 比較",
        icon: "ai",
      },
      {
        href: "/ja/streaming-pricing",
        title: "動画・音楽配信の料金比較",
        description: "Netflix・Spotify・YouTube Premium の個人・ファミリープランの地域差を確認。",
        badge: "配信サービス",
        icon: "streaming",
      },
      {
        href: "/ja/countries",
        title: "国・地域別の節約ランキング",
        description: "国ごとにどのデジタルサブスクが米国基準より割安かを一覧で把握。",
        badge: "国別データ",
        icon: "country",
      },
      {
        href: "/ja/tools/currency-converter",
        title: "サブスク為替換算ツール",
        description: "USD・EUR・TRY・INR などの月額料金を日本円や主要通貨にすばやく換算。",
        badge: "便利ツール",
        icon: "converter",
      },
    ],
    contactTitle: "お探しの情報や価格データの疑問がありますか？",
    contactBody: "データ検証基準をご確認いただくか、お問い合わせフォームからご連絡ください。",
    contactPrimaryLabel: "お問い合わせ",
    contactPrimaryHref: "/ja/contact",
    contactSecondaryLabel: "データソースと基準",
    contactSecondaryHref: "/ja/data-sources",
    toolReview: {
      eyebrow: "ツール評価",
      title: "デジタルツールを継続契約する価値があるか見極める方法",
      cardDescription:
        "機能一覧や単発のベンチマークだけでなく、実務タスク・制約・総額コスト・検証日から判断する基準を整理。",
      articleDescription:
        "機能表や一度きりのスコアだけに頼らず、自分の用途を定義したうえで性能・制約・継続コストを比較しましょう。",
    },
    articleQuickToolsTitle: "最新価格データを調べる",
    articleContinueTitle: "あわせて読みたい基本ガイド",
    coreArticleMeta: (checkpoints, minutes) =>
      `基本ガイド · ${checkpoints} つの確認項目 · 約 ${minutes} 分`,
  },
  ko: {
    hubEyebrow: "글로벌 구독 비교 및 검증 매뉴얼",
    hubTitle: "구독 및 지역별 가격 가이드",
    hubDescription:
      "검증된 공개 데이터를 바탕으로 현지 표시 가격, 환율 기준일, 세금 규정, 계정 조건과 장기 구독 비용을 정확히 파악하는 방법을 안내합니다.",
    heroHighlights: [
      "4단계 필수 체크리스트",
      "현지 정가 및 환율 기준",
      "계정·결제 조건 점검",
      "실시간 가격 비교 연동",
    ],
    dynamicArticlesCount: (count) => `심층 가이드 ${count}편`,
    backToGuides: "가이드 홈으로 돌아가기",
    startKicker: "시작하기 전 필독",
    startTitle: "지역별 구독료를 비교할 때 먼저 확인할 4가지 핵심",
    startMeta: "전체 약 10분 소요 · 환율·세금·결제 오류 예방",
    stepReadCta: "체크리스트 보기",
    minutesLabel: (minutes) => `약 ${minutes}분`,
    checkpointsLabel: (count) => `점검 항목 ${count}개`,
    editorialTitle: "심층 가이드 및 리뷰",
    collectionTitle: "게시된 가이드",
    articlesCountLabel: (count) => `총 ${count}편`,
    allFilter: "전체",
    filterGroupLabel: "주제별 가이드 필터",
    searchPlaceholder: "가이드 제목이나 키워드 검색…",
    clearSearchLabel: "검색 지우기",
    noFilterMatch: "현재 필터와 일치하는 가이드가 없습니다. 다른 주제를 선택하거나 검색어를 지워 보세요.",
    readArticleCta: "가이드 읽기",
    taxonomyCategoriesLabel: "카테고리",
    taxonomyTagsLabel: "인기 태그",
    bridgesKicker: "실시간 데이터 및 도구",
    bridgesTitle: "원칙을 확인했다면 실시간 지역별 가격을 비교해 보세요",
    bridgesSubtitle:
      "모든 가격 비교 표에는 현지 결제 통화, 환율 기준일, 미국 기준가 대비 차이가 함께 표시됩니다.",
    bridges: [
      {
        href: "/ko/ai-pricing",
        title: "AI 구독 글로벌 가격 비교",
        description: "ChatGPT, Claude, Gemini 등 주요 AI 요금제의 국가별 월간·연간 가격을 비교합니다.",
        badge: "핵심 비교",
        icon: "ai",
      },
      {
        href: "/ko/streaming-pricing",
        title: "스트리밍 구독 가격 비교",
        description: "Netflix, Spotify, YouTube Premium 개인·패밀리 요금제의 국가별 차이를 확인합니다.",
        badge: "스트리밍",
        icon: "streaming",
      },
      {
        href: "/ko/countries",
        title: "국가별 절약 순위",
        description: "국가별로 어떤 디지털 구독 서비스가 상대적으로 저렴한지 한눈에 살펴봅니다.",
        badge: "국가별 보기",
        icon: "country",
      },
      {
        href: "/ko/tools/currency-converter",
        title: "구독 환율 계산기",
        description: "달러, 엔화, 리라, 루피 등 해외 스토어 정가를 원화나 주요 통화로 즉시 환산합니다.",
        badge: "유틸리티",
        icon: "converter",
      },
    ],
    contactTitle: "찾으시는 구독 정보나 데이터 문의가 있으신가요?",
    contactBody: "데이터 출처와 검증 원칙을 살펴보거나 문의 페이지에서 직접 의견을 남겨 주세요.",
    contactPrimaryLabel: "문의하기",
    contactPrimaryHref: "/ko/contact",
    contactSecondaryLabel: "데이터 출처 및 기준",
    contactSecondaryHref: "/ko/data-sources",
    toolReview: {
      eyebrow: "도구 리뷰",
      title: "디지털 도구가 유료 구독할 가치가 있는지 판단하는 기준",
      cardDescription:
        "단순한 기능 목록이나 일회성 벤치마크를 넘어 실제 작업 빈도, 한계, 총 구독 비용과 근거 날짜를 함께 점검하세요.",
      articleDescription:
        "기능 표나 단편적인 점수에만 의존하지 마세요. 실제 사용 목적을 먼저 정의한 뒤 성능, 제약 조건, 지속 비용을 비교해야 합니다.",
    },
    articleQuickToolsTitle: "실시간 가격 바로 확인",
    articleContinueTitle: "핵심 가이드 이어서 읽기",
    coreArticleMeta: (checkpoints, minutes) =>
      `핵심 가이드 · 점검 항목 ${checkpoints}개 · 약 ${minutes}분 소요`,
  },
  es: {
    hubEyebrow: "Manual de suscripciones y precios regionales",
    hubTitle: "Guías de suscripciones y precios",
    hubDescription:
      "Analiza las diferencias internacionales en suscripciones digitales con datos verificados: precios locales, fechas de cambio, impuestos, requisitos de cuenta y coste continuo.",
    heroHighlights: [
      "Ruta inicial en 4 pasos",
      "Precio local y divisas",
      "Cuenta y medios de pago",
      "Acceso directo a precios",
    ],
    dynamicArticlesCount: (count) => `${count} ${count === 1 ? "guía editorial" : "guías editoriales"}`,
    backToGuides: "Volver a guías",
    startKicker: "Guía esencial",
    startTitle: "¿Primera vez comparando precios regionales? Revisa estos 4 puntos",
    startMeta: "~10 min en total · Evita sorpresas de cambio, impuestos y cobro",
    stepReadCta: "Ver puntos clave",
    minutesLabel: (minutes) => `${minutes} min de lectura`,
    checkpointsLabel: (count) => `${count} puntos clave`,
    editorialTitle: "Guías editoriales y análisis",
    collectionTitle: "Guías publicadas",
    articlesCountLabel: (count) => `${count} ${count === 1 ? "guía" : "guías"}`,
    allFilter: "Todas",
    filterGroupLabel: "Filtrar guías por categoría",
    searchPlaceholder: "Buscar guías por título o palabra clave…",
    clearSearchLabel: "Borrar búsqueda",
    noFilterMatch: "Ninguna guía coincide con el filtro actual. Prueba otra categoría o borra la búsqueda.",
    readArticleCta: "Leer guía",
    taxonomyCategoriesLabel: "Categorías",
    taxonomyTagsLabel: "Etiquetas populares",
    bridgesKicker: "Datos en vivo y utilidades",
    bridgesTitle: "Lleva la guía a la práctica: consulta precios verificados",
    bridgesSubtitle:
      "Cada comparativa conserva la moneda local de la tienda, la fecha del tipo de cambio y la diferencia frente a EE. UU.",
    bridges: [
      {
        href: "/es/ai-pricing",
        title: "Precios de suscripciones de IA",
        description: "Compara planes mensuales y anuales de ChatGPT, Claude, Gemini y más herramientas de IA.",
        badge: "Índice IA",
        icon: "ai",
      },
      {
        href: "/es/streaming-pricing",
        title: "Precios de streaming",
        description: "Revisa diferencias regionales en planes individuales y familiares de Netflix, Spotify y YouTube Premium.",
        badge: "Streaming",
        icon: "streaming",
      },
      {
        href: "/es/countries",
        title: "Índice de ahorro por país",
        description: "Explora por país qué suscripciones digitales resultan más económicas en moneda local.",
        badge: "Por país",
        icon: "country",
      },
      {
        href: "/es/tools/currency-converter",
        title: "Conversor de divisas",
        description: "Convierte tarifas en USD, TRY, JPY o INR a EUR, MXN u otras divisas habituales.",
        badge: "Herramienta",
        icon: "converter",
      },
    ],
    contactTitle: "¿Tienes dudas sobre un precio o quieres enviar una corrección?",
    contactBody: "Consulta nuestras fuentes y criterios de verificación o escríbenos directamente.",
    contactPrimaryLabel: "Contactar",
    contactPrimaryHref: "/es/contact",
    contactSecondaryLabel: "Fuentes de datos",
    contactSecondaryHref: "/es/data-sources",
    toolReview: {
      eyebrow: "Análisis de herramientas",
      title: "Cómo decidir si merece la pena pagar una herramienta digital",
      cardDescription:
        "Más allá de listas de funciones o pruebas aisladas: evalúa tareas reales, límites, coste acumulado y fecha de las pruebas.",
      articleDescription:
        "No te quedes solo con una lista de funciones o una comparativa puntual. Define tu caso de uso y compara capacidad, límites y coste recurrente.",
    },
    articleQuickToolsTitle: "Consultar precios actuales",
    articleContinueTitle: "Continuar con las guías esenciales",
    coreArticleMeta: (checkpoints, minutes) =>
      `Guía esencial · ${checkpoints} puntos clave · ~${minutes} min de lectura`,
  },
} satisfies Record<CanvasLocale, GuideHubCopy>;

export function getGuideHubCopy(locale: CanvasLocale): GuideHubCopy {
  return COPY[locale];
}

export function buildFoundationalGuideSteps(
  locale: CanvasLocale,
  isCoreSlugPublished: (slug: CoreGuideSlug) => boolean = () => true,
): GuideCard[] {
  const copy = COPY[locale];
  const items: GuideCard[] = [];

  if (isCoreSlugPublished("price-guide")) {
    const def = getCoreGuideDefinition(locale, "price-guide");
    items.push({
      href: `/${locale}/guides/price-guide`,
      title: def.title,
      description: def.description,
      category: def.eyebrow,
      minutes: 3,
      sectionsCount: def.sections.length,
      icon: "price",
    });
  }

  if (isCoreSlugPublished("payment-account")) {
    const def = getCoreGuideDefinition(locale, "payment-account");
    items.push({
      href: `/${locale}/guides/payment-account`,
      title: def.title,
      description: def.description,
      category: def.eyebrow,
      minutes: 3,
      sectionsCount: def.sections.length,
      icon: "payment",
    });
  }

  items.push({
    href: `/${locale}/guides/tool-review`,
    title: copy.toolReview.title,
    description: copy.toolReview.cardDescription,
    category: copy.toolReview.eyebrow,
    minutes: 3,
    sectionsCount: 3,
    icon: "review",
  });

  if (isCoreSlugPublished("methodology")) {
    const def = getCoreGuideDefinition(locale, "methodology");
    items.push({
      href: `/${locale}/guides/methodology`,
      title: def.title,
      description: def.description,
      category: def.eyebrow,
      minutes: 3,
      sectionsCount: def.sections.length,
      icon: "methodology",
    });
  }

  return items;
}

export function getDefaultArticleQuickTools(
  locale: CanvasLocale,
  focus: FoundationalGuideKey | "general" = "general",
): GuideLink[] {
  const toolsByLocale: Record<
    CanvasLocale,
    Record<
      "ai" | "streaming" | "countries" | "converter" | "priceHistory" | "dataSources",
      GuideLink
    >
  > = {
    zh: {
      ai: {
        href: "/zh/ai-pricing",
        title: "AI 订阅各区比价",
        description: "ChatGPT · Claude · Gemini",
        icon: "ai",
      },
      streaming: {
        href: "/zh/streaming-pricing",
        title: "流媒体与内容订阅",
        description: "Netflix · Spotify · YouTube",
        icon: "streaming",
      },
      countries: {
        href: "/zh/countries",
        title: "国家与地区低价榜",
        description: "覆盖 40+ 国家与地区排行",
        icon: "country",
      },
      converter: {
        href: "/zh/tools/currency-converter",
        title: "订阅汇率换算器",
        description: "里拉 / 日元 / 卢比实时折算",
        icon: "converter",
      },
      priceHistory: {
        href: "/zh/price-history",
        title: "全球订阅调价雷达",
        description: "近期已核验涨价与降价记录",
        icon: "price",
      },
      dataSources: {
        href: "/zh/data-sources",
        title: "数据来源与核验口径",
        description: "四种日期与异常样本过滤",
        icon: "methodology",
      },
    },
    en: {
      ai: {
        href: "/en/ai-pricing",
        title: "AI Subscription Prices",
        description: "ChatGPT, Claude & Gemini",
        icon: "ai",
      },
      streaming: {
        href: "/en/streaming-pricing",
        title: "Streaming Prices",
        description: "Netflix, Spotify & YouTube",
        icon: "streaming",
      },
      countries: {
        href: "/en/countries",
        title: "Country Savings Index",
        description: "40+ regional price rankings",
        icon: "country",
      },
      converter: {
        href: "/en/tools/currency-converter",
        title: "Currency Converter",
        description: "Live local store FX rates",
        icon: "converter",
      },
      priceHistory: {
        href: "/en/price-history",
        title: "Price Change Radar",
        description: "Verified hikes and drops",
        icon: "price",
      },
      dataSources: {
        href: "/en/data-sources",
        title: "Data Sources & Rules",
        description: "FX dates & verification",
        icon: "methodology",
      },
    },
    "zh-tw": {
      ai: {
        href: "/zh-tw/ai-pricing",
        title: "AI 訂閱各區比價",
        description: "ChatGPT · Claude · Gemini",
        icon: "ai",
      },
      streaming: {
        href: "/zh-tw/streaming-pricing",
        title: "串流媒體與內容訂閱",
        description: "Netflix · Spotify · YouTube",
        icon: "streaming",
      },
      countries: {
        href: "/zh-tw/countries",
        title: "國家與地區低價榜",
        description: "涵蓋 40+ 國家與地區排行",
        icon: "country",
      },
      converter: {
        href: "/zh-tw/tools/currency-converter",
        title: "訂閱匯率換算器",
        description: "里拉 / 日圓 / 盧比即時換算",
        icon: "converter",
      },
      priceHistory: {
        href: "/zh-tw/price-history",
        title: "全球訂閱調價紀錄",
        description: "近期已核驗漲價與降價變動",
        icon: "price",
      },
      dataSources: {
        href: "/zh-tw/data-sources",
        title: "資料來源與核驗標準",
        description: "日期標記與異常樣本過濾",
        icon: "methodology",
      },
    },
    ja: {
      ai: {
        href: "/ja/ai-pricing",
        title: "AI サブスク地域別価格",
        description: "ChatGPT · Claude · Gemini",
        icon: "ai",
      },
      streaming: {
        href: "/ja/streaming-pricing",
        title: "動画・音楽配信の価格",
        description: "Netflix · Spotify · YouTube",
        icon: "streaming",
      },
      countries: {
        href: "/ja/countries",
        title: "国・地域別の節約ランキング",
        description: "40 以上の国と地域を比較",
        icon: "country",
      },
      converter: {
        href: "/ja/tools/currency-converter",
        title: "サブスク為替換算",
        description: "現地通貨を日本円・米ドルへ換算",
        icon: "converter",
      },
      priceHistory: {
        href: "/ja/price-history",
        title: "価格改定履歴",
        description: "検証済みの値上げ・値下げ記録",
        icon: "price",
      },
      dataSources: {
        href: "/ja/data-sources",
        title: "データソースと検証基準",
        description: "為替基準日と整合性チェック",
        icon: "methodology",
      },
    },
    ko: {
      ai: {
        href: "/ko/ai-pricing",
        title: "AI 구독 지역별 가격",
        description: "ChatGPT · Claude · Gemini",
        icon: "ai",
      },
      streaming: {
        href: "/ko/streaming-pricing",
        title: "스트리밍 구독 가격",
        description: "Netflix · Spotify · YouTube",
        icon: "streaming",
      },
      countries: {
        href: "/ko/countries",
        title: "국가별 절약 순위",
        description: "40개 이상 국가·지역 비교",
        icon: "country",
      },
      converter: {
        href: "/ko/tools/currency-converter",
        title: "구독 환율 계산기",
        description: "해외 정가를 원화·달러로 환산",
        icon: "converter",
      },
      priceHistory: {
        href: "/ko/price-history",
        title: "가격 변동 내역",
        description: "검증된 인상 및 인하 기록",
        icon: "price",
      },
      dataSources: {
        href: "/ko/data-sources",
        title: "데이터 출처 및 검증 기준",
        description: "환율 기준일 및 이상치 필터링",
        icon: "methodology",
      },
    },
    es: {
      ai: {
        href: "/es/ai-pricing",
        title: "Precios de IA por región",
        description: "ChatGPT · Claude · Gemini",
        icon: "ai",
      },
      streaming: {
        href: "/es/streaming-pricing",
        title: "Precios de streaming",
        description: "Netflix · Spotify · YouTube",
        icon: "streaming",
      },
      countries: {
        href: "/es/countries",
        title: "Índice de ahorro por país",
        description: "Más de 40 países comparados",
        icon: "country",
      },
      converter: {
        href: "/es/tools/currency-converter",
        title: "Conversor de divisas",
        description: "Tipos de referencia actualizados",
        icon: "converter",
      },
      priceHistory: {
        href: "/es/price-history",
        title: "Historial de cambios de precio",
        description: "Subidas y bajadas verificadas",
        icon: "price",
      },
      dataSources: {
        href: "/es/data-sources",
        title: "Fuentes de datos y reglas",
        description: "Fechas de cambio y validación",
        icon: "methodology",
      },
    },
  };

  const tools = toolsByLocale[locale];

  switch (focus) {
    case "price-guide":
      return [tools.countries, tools.converter, tools.ai];
    case "payment-account":
      return [tools.ai, tools.streaming, tools.countries];
    case "tool-review":
      return [tools.ai, tools.streaming, tools.converter];
    case "methodology":
      return [tools.dataSources, tools.priceHistory, tools.countries];
    default:
      return [tools.ai, tools.countries, tools.converter];
  }
}

export type GuideArticleUiCopy = {
  relatedReading: string;
  summaryLabel: string;
  editorialAuthor: string;
  tocLabel: string;
  tableAria: string;
  scrollHint: string;
  copyLinkIdle: string;
  copyLinkCopied: string;
  copyLinkError: string;
  relatedPricesHeading: string;
  lowestPrefix: string;
  relatedPricesNote: string;
  fxFallbackUsd: string;
};

const GUIDE_ARTICLE_UI_COPY: Record<CanvasLocale, GuideArticleUiCopy> = {
  zh: {
    relatedReading: "相关阅读",
    summaryLabel: "先说结论",
    editorialAuthor: "GeoSub 编辑部",
    tocLabel: "本文目录",
    tableAria: "可横向滚动的表格",
    scrollHint: "向下阅读完整正文。",
    copyLinkIdle: "复制文章链接",
    copyLinkCopied: "已复制文章链接",
    copyLinkError: "复制失败，请从地址栏复制链接",
    relatedPricesHeading: "用得上这篇的价格",
    lowestPrefix: "最低 · ",
    relatedPricesNote: "价格口径与对应产品或套餐页一致",
    fxFallbackUsd: "汇率暂不可用，显示美元",
  },
  en: {
    relatedReading: "Related reading",
    summaryLabel: "Key takeaway",
    editorialAuthor: "GeoSub Editorial",
    tocLabel: "On this page",
    tableAria: "Horizontally scrollable table",
    scrollHint: "Scroll down to read the full article.",
    copyLinkIdle: "Copy article link",
    copyLinkCopied: "Link copied",
    copyLinkError: "Copy failed; please copy from the address bar",
    relatedPricesHeading: "Related Live Prices",
    lowestPrefix: "Lowest · ",
    relatedPricesNote: "Same verified pricing scope as the linked plan pages",
    fxFallbackUsd: "FX unavailable, showing USD",
  },
  "zh-tw": {
    relatedReading: "相關閱讀",
    summaryLabel: "重點結論",
    editorialAuthor: "GeoSub 編輯部",
    tocLabel: "本文目錄",
    tableAria: "可橫向捲動的表格",
    scrollHint: "向下捲動閱讀完整內文。",
    copyLinkIdle: "複製文章連結",
    copyLinkCopied: "已複製文章連結",
    copyLinkError: "複製失敗，請直接從網址列複製連結",
    relatedPricesHeading: "相關即時價格",
    lowestPrefix: "最低 · ",
    relatedPricesNote: "價格基準與對應產品或方案頁一致",
    fxFallbackUsd: "匯率暫不可用，顯示美元",
  },
  ja: {
    relatedReading: "関連ガイド",
    summaryLabel: "結論のポイント",
    editorialAuthor: "GeoSub 編集部",
    tocLabel: "目次",
    tableAria: "横スクロール可能な表",
    scrollHint: "下にスクロールして本文をお読みください。",
    copyLinkIdle: "記事リンクをコピー",
    copyLinkCopied: "リンクをコピーしました",
    copyLinkError: "コピーできませんでした。アドレスバーからコピーしてください",
    relatedPricesHeading: "関連サービスの最新価格",
    lowestPrefix: "最安 · ",
    relatedPricesNote: "リンク先のプランページと同じ検証基準の価格です",
    fxFallbackUsd: "為替レート未取得のため USD 表示",
  },
  ko: {
    relatedReading: "관련 가이드",
    summaryLabel: "핵심 요약",
    editorialAuthor: "GeoSub 편집팀",
    tocLabel: "목차",
    tableAria: "가로로 스크롤 가능한 표",
    scrollHint: "아래로 스크롤하여 전체 본문을 읽어 보세요.",
    copyLinkIdle: "글 링크 복사",
    copyLinkCopied: "링크가 복사되었습니다",
    copyLinkError: "복사에 실패했습니다. 주소창에서 직접 복사해 주세요",
    relatedPricesHeading: "관련 실시간 구독 가격",
    lowestPrefix: "최저 · ",
    relatedPricesNote: "연결된 요금제 페이지와 동일한 검증 기준이 적용됩니다",
    fxFallbackUsd: "환율 미지원으로 USD 표시 중",
  },
  es: {
    relatedReading: "Lecturas relacionadas",
    summaryLabel: "Idea clave",
    editorialAuthor: "Equipo editorial de GeoSub",
    tocLabel: "En esta página",
    tableAria: "Tabla con desplazamiento horizontal",
    scrollHint: "Desplázate hacia abajo para leer el artículo completo.",
    copyLinkIdle: "Copiar enlace del artículo",
    copyLinkCopied: "Enlace copiado",
    copyLinkError: "No se pudo copiar; cópialo desde la barra de direcciones",
    relatedPricesHeading: "Precios verificados relacionados",
    lowestPrefix: "Mínimo · ",
    relatedPricesNote: "Mismo criterio de verificación que las páginas de planes enlazadas",
    fxFallbackUsd: "Cambio no disponible, mostrando USD",
  },
};

export function getGuideArticleUiCopy(locale: CanvasLocale): GuideArticleUiCopy {
  return GUIDE_ARTICLE_UI_COPY[locale];
}

export function getSiblingCoreGuideLinks(
  locale: CanvasLocale,
  currentSlug: FoundationalGuideKey,
): GuideLink[] {
  const currentHref = `/${locale}/guides/${currentSlug}`;
  return buildFoundationalGuideSteps(locale)
    .filter((step) => step.href !== currentHref)
    .map((step) => ({
      href: step.href,
      title: step.title,
      description: step.description,
      badge: step.category,
      icon: step.icon,
    }));
}

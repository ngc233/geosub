import type { CanvasLocale } from "./canvas-ui-copy.ts";

export const coreGuideSlugs = [
  "price-guide",
  "gift-card-guide",
  "payment-account",
  "methodology",
] as const;

export type CoreGuideSlug = (typeof coreGuideSlugs)[number];
export type CoreGuideLocale = "zh" | "en";
export type CoreGuideCanvasLocale = CanvasLocale;

export type CoreGuideSection = {
  title: string;
  body: string;
};

export type CoreGuideDefinition<L extends CanvasLocale = CanvasLocale> = {
  slug: CoreGuideSlug;
  locale: L;
  eyebrow: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  previousSeoDescriptions?: readonly string[];
  articleType: "GUIDE" | "HOW_TO" | "METHODOLOGY";
  sections: CoreGuideSection[];
  note: string;
};

type CoreGuideMap = {
  [L in CanvasLocale]: Record<CoreGuideSlug, CoreGuideDefinition<L>>;
};

const definitions: CoreGuideMap = {
  zh: {
    "price-guide": {
      slug: "price-guide",
      locale: "zh",
      eyebrow: "价格指南",
      title: "如何阅读地区价格",
      description: "低价排名只是起点。把本地标价、换算日期、税费和订阅资格放在一起，才能判断真实成本。",
      seoTitle: "地区订阅价格阅读指南",
      seoDescription: "了解如何结合本地标价、汇率日期、税费、账号地区与付款限制阅读订阅价格，并判断最低价是否真正适合自己。",
      seoKeywords: "地区订阅价格, 订阅价格比较, 汇率日期, 订阅税费",
      previousSeoDescriptions: [
        "学习如何结合本地标价、显示币种、汇率日期、税费和账号限制阅读地区订阅价格。",
      ],
      articleType: "GUIDE",
      sections: [
        {
          title: "先看本地标价和采集日期",
          body: "本地标价是平台在该地区展示的原始价格。先确认套餐名称、月付或年付周期以及采集日期，避免比较不同套餐或不同时间的记录。",
        },
        {
          title: "再看显示币种和汇率日期",
          body: "换算价格用于横向比较，不等于信用卡最终扣款。汇率变化会改变换算结果，但不会改变平台的本地标价。",
        },
        {
          title: "最后核对税费和购买条件",
          body: "税费、账号地区、付款方式和账单地址都可能影响结算。价格较低不代表该地区一定可供你的账号购买。",
        },
      ],
      note: "GeoSub 用美国价格作为常见比较基准，但购买前仍应以对应地区的官方结算页为准。",
    },
    "gift-card-guide": {
      slug: "gift-card-guide",
      locale: "zh",
      eyebrow: "礼品卡教程",
      title: "数字礼品卡购买前检查",
      description: "礼品卡通常与地区和账号绑定。先核对兼容性，再比较面值和实际支付成本。",
      seoTitle: "数字礼品卡购买与兑换指南",
      seoDescription: "购买数字礼品卡前，先核对发行地区、账号归属、币种、面值、兑换与退款规则，并识别跨区限制、异常低价和不可追溯卖家的风险。",
      seoKeywords: "数字礼品卡, 礼品卡地区, 礼品卡兑换, 礼品卡退款",
      previousSeoDescriptions: [
        "购买数字礼品卡前应核对发行地区、账号归属、币种、面值、兑换条件和退款规则。",
      ],
      articleType: "HOW_TO",
      sections: [
        {
          title: "发行地区必须匹配账号",
          body: "不同国家或地区发行的 Apple、Google、Steam 等礼品卡通常不能跨区兑换。购买前确认账号地区与卡片发行地区一致。",
        },
        {
          title: "核对币种、面值和有效期",
          body: "相同数字面值可能代表不同币种。还应检查是否存在有效期、兑换上限、余额使用限制或订阅扣款限制。",
        },
        {
          title: "选择可追溯的销售渠道",
          body: "确认商家身份、交付方式、退款政策和客服渠道。对明显低于面值的报价保持谨慎，避免购买来源不明或已被使用的代码。",
        },
      ],
      note: "礼品卡政策由发行平台和销售商决定；兑换资格与退款结果以双方官方条款为准。",
    },
    "payment-account": {
      slug: "payment-account",
      locale: "zh",
      eyebrow: "支付与账号",
      title: "订阅前检查账号与付款条件",
      description: "地区价格可用于比较成本，但能否购买取决于服务覆盖、账号地区和平台接受的付款信息。",
      seoTitle: "订阅支付与账号地区指南",
      seoDescription: "订阅前检查服务覆盖、账号地区、付款方式、账单地址、税费与最终结算金额，避免因地区不匹配或平台规则导致付款失败。",
      seoKeywords: "订阅付款, 账号地区, 账单地址, 付款方式",
      previousSeoDescriptions: [
        "订阅前核对服务可用地区、账号归属、付款方式、账单信息和最终结算金额。",
      ],
      articleType: "GUIDE",
      sections: [
        {
          title: "确认服务和套餐在当地可用",
          body: "同一服务可能只在部分国家提供，套餐名称和权益也可能不同。先在官方应用或结算页确认你的地区确实提供该套餐。",
        },
        {
          title: "核对账号地区与付款方式",
          body: "Apple ID 或服务账号地区、发卡国家、账单地址和付款币种可能需要一致。不要为了低价提交虚假地区或账单信息。",
        },
        {
          title: "以结算页金额作为最终成本",
          body: "银行卡换汇费、平台汇率、税费和试用资格可能只在付款前显示。GeoSub 的换算价格用于比较，不是扣款承诺。",
        },
      ],
      note: "跨地区订阅可能触发平台风控或违反服务条款。请遵守账号、付款与地区规则。",
    },
    methodology: {
      slug: "methodology",
      locale: "zh",
      eyebrow: "方法论",
      title: "GeoSub 如何检查订阅价格",
      description: "每条地区价格都会先匹配套餐，再检查币种、计费周期和样本一致性；只有可直接比较的数据才会展示。",
      seoTitle: "GeoSub 订阅价格数据方法",
      seoDescription: "了解 GeoSub 如何采集、匹配、检查并标注 App Store 地区订阅价格，以及价格采集、汇率基准、套餐复核和页面更新时间分别代表什么。",
      seoKeywords: "订阅价格数据, App Store 价格, 价格核验, 汇率日期",
      previousSeoDescriptions: [
        "了解 GeoSub 如何采集、检查并标注 App Store 地区订阅价格，以及页面上不同日期的含义。",
      ],
      articleType: "METHODOLOGY",
      sections: [
        {
          title: "保留采集时的原始信息",
          body: "每条记录保留产品、套餐、国家或地区、本地币种、计费周期和采集时间。换算价格不会覆盖平台原始标价。",
        },
        {
          title: "检查套餐、稳定性和价格范围",
          body: "系统结合套餐匹配、重复样本和同类地区价格范围识别币种、小数点及计费周期异常。不一致的价格会暂缓展示，而不是强行进入排行。",
        },
        {
          title: "分别计算四种日期",
          body: "价格采集日期、汇率基准日期、套餐复核日期和页面更新时间含义不同，会分别计算和展示，避免把汇率更新误认为平台调价。",
        },
      ],
      note: "公开比较用于辅助理解地区价格。服务可用性、税费和最终结算金额仍可能在采集后发生变化。",
    },
  },
  en: {
    "price-guide": {
      slug: "price-guide",
      locale: "en",
      eyebrow: "Price Guide",
      title: "How to read regional subscription prices",
      description: "A low-price ranking is only the starting point. Combine local price, exchange-rate date, tax and eligibility to understand the real cost.",
      seoTitle: "How to Read Regional Subscription Prices",
      seoDescription: "Learn how to read local prices, display currencies, exchange-rate dates, taxes and account restrictions in regional subscription comparisons.",
      seoKeywords: "regional subscription prices, price comparison, exchange rates, subscription tax",
      articleType: "GUIDE",
      sections: [
        {
          title: "Start with the local price and collection date",
          body: "The local price is the amount displayed by the platform in that region. Check the plan name, monthly or annual billing cycle, and collection date before comparing records.",
        },
        {
          title: "Then check the display currency and rate date",
          body: "Converted prices support comparison; they are not a promise of the card charge. Exchange-rate movement can change the converted value without changing the local platform price.",
        },
        {
          title: "Confirm tax and purchase conditions",
          body: "Tax, account region, payment method and billing address may affect checkout. A lower regional price does not guarantee that your account can buy it.",
        },
      ],
      note: "GeoSub commonly uses the US price as a comparison baseline. Always confirm the final amount on the official regional checkout page.",
    },
    "gift-card-guide": {
      slug: "gift-card-guide",
      locale: "en",
      eyebrow: "Gift Card Guide",
      title: "Checks before buying a digital gift card",
      description: "Gift cards are usually tied to a region and account. Confirm compatibility before comparing face value and purchase cost.",
      seoTitle: "Digital Gift Card Purchase and Redemption Guide",
      seoDescription: "Check the issuing region, account compatibility, currency, value, redemption conditions and refund policy before buying a digital gift card.",
      seoKeywords: "digital gift cards, gift card region, gift card redemption, gift card refund",
      articleType: "GUIDE",
      sections: [
        {
          title: "Match the issuing region to the account",
          body: "Apple, Google, Steam and similar gift cards from one country usually cannot be redeemed in another. Confirm that the card region matches the account region.",
        },
        {
          title: "Check currency, value and expiry",
          body: "The same number can represent different currencies. Also review expiry, redemption limits, balance restrictions and whether the credit can fund subscriptions.",
        },
        {
          title: "Use a traceable seller",
          body: "Check the merchant, delivery method, refund policy and support channel. Be cautious with prices far below face value or codes of unclear origin.",
        },
      ],
      note: "Gift-card eligibility and refunds are controlled by the issuing platform and seller. Their official terms remain authoritative.",
    },
    "payment-account": {
      slug: "payment-account",
      locale: "en",
      eyebrow: "Payment & Account",
      title: "Check account and payment conditions",
      description: "Regional prices help compare cost, but purchase eligibility depends on local availability, account region and accepted payment details.",
      seoTitle: "Subscription Payment and Account Region Guide",
      seoDescription: "Check service availability, account region, payment method, billing details and the final checkout amount before subscribing.",
      seoKeywords: "subscription payment, account region, billing address, payment method",
      articleType: "GUIDE",
      sections: [
        {
          title: "Confirm the service and plan are locally available",
          body: "A service may operate in only some countries, and plan names or benefits can differ. Check the official app or checkout page for the exact plan in your region.",
        },
        {
          title: "Match account region and payment method",
          body: "Your Apple ID or service-account region, card country, billing address and payment currency may need to align. Do not submit false location or billing information.",
        },
        {
          title: "Treat checkout as the final cost",
          body: "Card conversion fees, platform exchange rates, tax and trial eligibility may appear only before payment. GeoSub conversions are comparisons, not charge guarantees.",
        },
      ],
      note: "Cross-region purchases may trigger platform controls or violate service terms. Follow the applicable account, payment and regional rules.",
    },
    methodology: {
      slug: "methodology",
      locale: "en",
      eyebrow: "Methodology",
      title: "How GeoSub checks subscription prices",
      description: "Regional observations are matched to a plan, checked for currency and billing cycle, and published only when the result is comparable.",
      seoTitle: "GeoSub Subscription Price Data Methodology",
      seoDescription: "Learn how GeoSub collects, checks and dates regional subscription prices before they appear in comparisons.",
      seoKeywords: "subscription price data, App Store prices, price verification, exchange rate date",
      articleType: "METHODOLOGY",
      sections: [
        {
          title: "Collect with the original context",
          body: "Each observation keeps the product, plan, country or region, original currency, billing cycle and collection time. The local platform price is never replaced by a converted estimate.",
        },
        {
          title: "Check identity, stability and range",
          body: "Plan matching, repeated observations and peer-region ranges help detect currency, decimal and billing-cycle errors. Inconsistent values are withheld rather than forced into a ranking.",
        },
        {
          title: "Publish dates with distinct meanings",
          body: "Collection date, exchange-rate date, plan-review date and page-update date are calculated separately. Readers can distinguish a platform price observation from a later currency conversion.",
        },
      ],
      note: "Published comparisons are informational. Platform availability, tax and the final checkout amount can still change after collection.",
    },
  },
  "zh-tw": {
    "price-guide": {
      slug: "price-guide",
      locale: "zh-tw",
      eyebrow: "價格指南",
      title: "如何閱讀地區訂閱價格",
      description:
        "低價排行只是起點。把當地標價、匯率基準日、稅費規則與帳號資格放在一起看，才能判斷真實訂閱成本。",
      seoTitle: "地區訂閱價格閱讀指南",
      seoDescription:
        "了解如何結合當地標價、匯率基準日、稅費、帳號地區與付款限制閱讀跨區訂閱價格，判斷最低價是否真正適合自己。",
      seoKeywords: "地區訂閱價格, 訂閱比價, 匯率基準日, 訂閱稅費",
      articleType: "GUIDE",
      sections: [
        {
          title: "先看當地標價與檢查日期",
          body: "當地標價是平台在該國家或地區公開展示的原始金額。比較前請先確認方案名稱、月付或年付週期以及檢查日期，避免把不同方案或不同時期的資料混在一起。",
        },
        {
          title: "再看顯示幣別與匯率基準日",
          body: "折算後的金額用於橫向比較，不等於信用卡最終扣款。匯率波動會改變換算結果，但不會改變平台原本的當地標價。",
        },
        {
          title: "最後核對稅費與購買資格",
          body: "當地營業稅或增值稅、帳號所屬地區、付款方式與帳單地址都可能影響結帳。價格較低不代表你的帳號一定能直接購買。",
        },
      ],
      note: "GeoSub 常用美國價格作為比較基準，實際扣款金額與購買資格仍請以對應地區的官方結帳頁為準。",
    },
    "gift-card-guide": {
      slug: "gift-card-guide",
      locale: "zh-tw",
      eyebrow: "禮品卡指南",
      title: "購買數位禮品卡前的核對事項",
      description: "禮品卡通常綁定發行地區與帳號。請先確認相容性，再比較面額與實際成本。",
      seoTitle: "數位禮品卡購買與兌換指南",
      seoDescription:
        "購買數位禮品卡前，先核對發行地區、帳號歸屬、幣別、面額、兌換與退款規則，避免跨區限制風險。",
      seoKeywords: "數位禮品卡, 禮品卡地區, 禮品卡兌換, 禮品卡退款",
      articleType: "HOW_TO",
      sections: [
        {
          title: "確認發行地區與帳號一致",
          body: "不同國家或地區發行的禮品卡通常無法跨區兌換，購買前請確認卡片地區與帳號設定相符。",
        },
        {
          title: "核對幣別、面額與有效期限",
          body: "相同數字可能代表不同幣別，也請留意有效期限、餘額上限以及是否可用於訂閱扣款。",
        },
        {
          title: "選擇可追溯的銷售管道",
          body: "確認商家身分、交付方式與退款政策，對明顯低於面額或來源不明的序號保持謹慎。",
        },
      ],
      note: "禮品卡兌換與退款規則由發行平台及銷售商決定，請以雙方官方條款為準。",
    },
    "payment-account": {
      slug: "payment-account",
      locale: "zh-tw",
      eyebrow: "付款與帳號",
      title: "訂閱前檢查帳號與付款條件",
      description:
        "地區價格可協助比較成本，但能否完成訂閱取決於當地服務範圍、帳號地區與平台接受的付款資訊。",
      seoTitle: "訂閱付款與帳號地區指南",
      seoDescription:
        "訂閱前核對服務涵蓋範圍、帳號地區、付款方式、帳單地址、稅費與最終結帳金額，避免因地區不符或平台規則導致付款失敗。",
      seoKeywords: "訂閱付款, 帳號地區, 帳單地址, 付款方式",
      articleType: "GUIDE",
      sections: [
        {
          title: "確認服務與方案在當地開放",
          body: "同一項服務可能僅在部分國家提供，方案名稱與內容也可能因市場而異。請先在官方應用程式或結帳頁確認該地區確實提供相同方案。",
        },
        {
          title: "核對帳號地區與付款方式",
          body: "Apple ID 或服務帳號地區、發卡國家、帳單地址與付款幣別可能需要一致。請勿為追求低價而填寫不實的地區或帳單資訊。",
        },
        {
          title: "以官方結帳頁金額為最終依據",
          body: "海外刷卡手續費、平台換匯匯率、稅費與試用資格往往在付款前才會完整顯示。GeoSub 的換算價格僅供比較參考，並非扣款保證。",
        },
      ],
      note: "跨地區訂閱可能觸發平台風險控管或違反服務條款，請遵守各平台的帳號、付款與地區規範。",
    },
    methodology: {
      slug: "methodology",
      locale: "zh-tw",
      eyebrow: "研究方法",
      title: "GeoSub 如何核驗訂閱價格",
      description:
        "每筆地區價格都會先對應方案，再檢查幣別、計費週期與樣本一致性；只有可直接比較的資料才會公開展示。",
      seoTitle: "GeoSub 訂閱價格核驗與資料方法",
      seoDescription:
        "了解 GeoSub 如何整理、比對、檢查並標註 App Store 地區訂閱價格，以及檢查日期、匯率基準日、方案覆核日與頁面更新時間的差異。",
      seoKeywords: "訂閱價格資料, App Store 價格, 價格核驗, 匯率基準日",
      articleType: "METHODOLOGY",
      sections: [
        {
          title: "保留原始公開標價與背景資訊",
          body: "每筆紀錄皆保留產品、方案、國家或地區、當地幣別、計費週期與檢查時間。換算價格絕不會覆蓋平台的原始當地標價。",
        },
        {
          title: "檢查方案對應、穩定度與合理區間",
          body: "系統會結合方案比對、重複樣本與同類地區價格區間，攔截幣別、小數點或計費週期異常。不一致的紀錄會暫緩公開，而不會強行納入排行。",
        },
        {
          title: "明確區分不同時間標記",
          body: "價格檢查日期、匯率基準日期、方案覆核日期與頁面更新時間各自獨立計算與標示，避免讀者把匯率變動誤認為平台調價。",
        },
      ],
      note: "公開比較僅供理解地區價差參考。服務可用性、當地稅費與最終結帳金額仍可能在檢查後有所變動。",
    },
  },
  ja: {
    "price-guide": {
      slug: "price-guide",
      locale: "ja",
      eyebrow: "料金ガイド",
      title: "地域別サブスクリプション価格の見方",
      description:
        "最安ランキングは出発点にすぎません。現地通貨の表示価格、為替基準日、税制、契約条件をあわせて確認することで実質コストが分かります。",
      seoTitle: "地域別サブスクリプション価格の正しい読み方",
      seoDescription:
        "現地表示価格、換算通貨、為替基準日、税金、アカウント地域の制限を踏まえて地域別サブスク料金を比較する方法を解説します。",
      seoKeywords: "地域別サブスク価格, 料金比較, 為替基準日, サブスクリプション税",
      articleType: "GUIDE",
      sections: [
        {
          title: "まず現地価格と取得日を確認する",
          body: "現地価格は各国のストアが表示している元の金額です。異なるプランや時期の記録を混同しないよう、プラン名、月額・年額の請求周期、取得日を最初に確認してください。",
        },
        {
          title: "次に表示通貨と為替基準日を見る",
          body: "換算価格は横断比較のための目安であり、カード請求額を保証するものではありません。為替レートが動くと換算値は変わりますが、ストアの現地価格は変わりません。",
        },
        {
          title: "最後に税金と購入条件を確かめる",
          body: "消費税・付加価値税、アカウントの国設定、支払い手段、請求先住所によって決済可否や総額が変わります。価格が安くても自分のアカウントで契約できるとは限りません。",
        },
      ],
      note: "GeoSub では比較基準として米国価格を併記しています。最終的な請求額と契約可否は必ず公式の決済画面でご確認ください。",
    },
    "gift-card-guide": {
      slug: "gift-card-guide",
      locale: "ja",
      eyebrow: "ギフトカード案内",
      title: "デジタルギフトカード購入前の確認事項",
      description: "ギフトカードは発行地域とアカウントに紐づきます。額面を比較する前に互換性を確認してください。",
      seoTitle: "デジタルギフトカードの購入・利用ガイド",
      seoDescription:
        "デジタルギフトカードを購入する前に、発行国、アカウント地域、通貨、有効期限、返金条件を確認するためのガイドです。",
      seoKeywords: "デジタルギフトカード, ギフトカード地域, 残高チャージ, 返金規定",
      articleType: "HOW_TO",
      sections: [
        {
          title: "発行国とアカウント地域を一致させる",
          body: "国ごとに発行されるギフトカードは他地域のアカウントでは利用できないのが一般的です。事前に地域設定を確認してください。",
        },
        {
          title: "通貨・額面・有効期限を確認する",
          body: "同じ数字でも通貨が異なる場合があります。有効期限やサブスク決済への充当可否もあわせて確認しましょう。",
        },
        {
          title: "正規・追跡可能な販売元を選ぶ",
          body: "販売事業者、納品方法、返金ポリシーを確認し、額面より極端に安いコードや出所不明の販売元は避けてください。",
        },
      ],
      note: "ギフトカードの利用条件や返金可否は発行元および販売元の公式規約に従います。",
    },
    "payment-account": {
      slug: "payment-account",
      locale: "ja",
      eyebrow: "支払いとアカウント",
      title: "契約前に確認したいアカウントと決済条件",
      description:
        "地域別価格はコスト比較に役立ちますが、実際に契約できるかは提供地域、アカウント設定、対応する支払い方法によって決まります。",
      seoTitle: "サブスクリプション決済とアカウント地域の確認ガイド",
      seoDescription:
        "契約前にサービスの提供国、アカウント地域、支払い方法、請求先情報、最終決済額を確認し、決済エラーや規約違反を防ぐポイントを整理します。",
      seoKeywords: "サブスク決済, アカウント地域, 請求先住所, 支払い方法",
      articleType: "GUIDE",
      sections: [
        {
          title: "対象国でサービスとプランが提供されているか確認する",
          body: "同じサービスでも提供国が限られていたり、プラン名や特典内容が異なったりする場合があります。公式アプリや購入画面で該当プランの有無を確認してください。",
        },
        {
          title: "アカウント地域と支払い手段の整合性を保つ",
          body: "Apple ID やサービスアカウントの国設定、カード発行国、請求先住所、決済通貨の一致が求められることがあります。虚偽の地域情報や請求先を入力しないでください。",
        },
        {
          title: "決済画面の表示額を最終コストとする",
          body: "カード会社の海外事務手数料、決済事業者の為替レート、税金、無料体験の適用条件は支払い直前に確定します。GeoSub の換算値は比較用の参考値です。",
        },
      ],
      note: "地域をまたぐ購入はプラットフォームの制限対象や規約違反となる場合があります。各サービスの公式規約と地域ルールを遵守してください。",
    },
    methodology: {
      slug: "methodology",
      locale: "ja",
      eyebrow: "調査方法",
      title: "GeoSub がサブスク価格を検証する仕組み",
      description:
        "各地域の価格データはプラン照合・通貨・請求周期・整合性チェックを通過したものだけを比較可能な記録として公開しています。",
      seoTitle: "GeoSub サブスクリプション価格データの検証方法",
      seoDescription:
        "GeoSub が App Store 各国のサブスク料金をどのように確認・照合し、取得日・為替基準日・プラン確認日を区別して表示しているかを説明します。",
      seoKeywords: "サブスク価格データ, App Store 価格, 価格検証, 為替基準日",
      articleType: "METHODOLOGY",
      sections: [
        {
          title: "取得時の現地情報をそのまま保持する",
          body: "すべての記録でサービス名、プラン、国・地域、現地通貨、請求周期、確認日時を保持します。換算金額で元のストア表示価格を上書きすることはありません。",
        },
        {
          title: "プラン照合・安定性・価格帯を検査する",
          body: "プランの対応関係、複数回の観測値、近隣地域の価格レンジを照らし合わせ、通貨コードや小数点、請求周期の誤りを検出します。不整合な値はランキングから除外し保留します。",
        },
        {
          title: "意味の異なる日付を分けて表示する",
          body: "価格確認日、為替基準日、プラン検証日、ページ更新日を別々に算出し、為替変動とストア側の価格改定を明確に区別できるようにしています。",
        },
      ],
      note: "公開データは情報比較を目的としています。提供状況、税額、最終請求額は確認後に変更される場合があります。",
    },
  },
  ko: {
    "price-guide": {
      slug: "price-guide",
      locale: "ko",
      eyebrow: "가격 가이드",
      title: "지역별 구독 가격 올바르게 읽는 법",
      description:
        "최저가 순위는 출발점일 뿐입니다. 현지 표시 가격, 환율 기준일, 세금 규정과 가입 자격을 함께 봐야 실제 구독 비용을 판단할 수 있습니다.",
      seoTitle: "지역별 구독 가격 비교 및 해석 가이드",
      seoDescription:
        "현지 통화 가격, 표시 통화, 환율 기준일, 세금 및 계정 국가 제한을 종합해 지역별 디지털 구독료를 정확히 읽는 방법을 안내합니다.",
      seoKeywords: "지역별 구독 가격, 구독료 비교, 환율 기준일, 구독 세금",
      articleType: "GUIDE",
      sections: [
        {
          title: "먼저 현지 표시 가격과 확인 날짜를 살펴보세요",
          body: "현지 가격은 해당 국가 스토어에 공개된 원래 금액입니다. 서로 다른 요금제나 시점의 기록을 섞어 비교하지 않도록 요금제 이름, 월간·연간 결제 주기, 확인 날짜를 먼저 점검하세요.",
        },
        {
          title: "표시 통화와 환율 기준일을 함께 확인하세요",
          body: "환산 금액은 국가 간 비교를 돕기 위한 참고치이며 실제 카드 청구액을 보장하지 않습니다. 환율이 변동하면 환산 금액은 달라지지만 스토어의 현지 정가는 그대로 유지됩니다.",
        },
        {
          title: "세금과 결제 가능 조건을 마지막으로 점검하세요",
          body: "부가가치세 등 현지 세금, 계정 국가 설정, 결제 수단과 청구지 주소에 따라 최종 결제 가능 여부가 달라집니다. 가격이 저렴하더라도 내 계정에서 바로 구매할 수 있다고 단정할 수 없습니다.",
        },
      ],
      note: "GeoSub는 주로 미국 가격을 비교 기준으로 사용합니다. 실제 청구 금액과 가입 가능 여부는 반드시 공식 결제 화면에서 확인하세요.",
    },
    "gift-card-guide": {
      slug: "gift-card-guide",
      locale: "ko",
      eyebrow: "기프트 카드 안내",
      title: "디지털 기프트 카드 구매 전 점검 사항",
      description: "기프트 카드는 보통 발행 국가 및 계정에 귀속됩니다. 금액 비교 전에 호환성을 먼저 확인하세요.",
      seoTitle: "디지털 기프트 카드 구매 및 등록 가이드",
      seoDescription:
        "디지털 기프트 카드를 구매하기 전 발행 국가, 계정 지역, 통화, 유효기간과 환불 규정을 확인하는 방법을 안내합니다.",
      seoKeywords: "디지털 기프트 카드, 기프트 카드 국가, 코드 등록, 환불 규정",
      articleType: "HOW_TO",
      sections: [
        {
          title: "발행 국가와 계정 지역이 일치하는지 확인하세요",
          body: "국가별로 발행된 기프트 카드는 다른 국가 계정에서 등록되지 않는 경우가 대부분이므로 구매 전 계정 국가를 확인해야 합니다.",
        },
        {
          title: "통화 단위, 권종, 유효기간을 점검하세요",
          body: "같은 숫자라도 통화가 다를 수 있으며 유효기간, 잔액 한도, 정기 구독 결제 사용 가능 여부도 확인해야 합니다.",
        },
        {
          title: "출처가 명확한 판매처를 이용하세요",
          body: "판매자 정보, 코드 전달 방식, 환불 정책을 확인하고 액면가보다 지나치게 저렴하거나 출처가 불분명한 코드는 피하세요.",
        },
      ],
      note: "기프트 카드 사용 자격과 환불 여부는 발행 플랫폼 및 판매처의 공식 약관을 따릅니다.",
    },
    "payment-account": {
      slug: "payment-account",
      locale: "ko",
      eyebrow: "결제 및 계정",
      title: "구독 전 확인해야 할 계정과 결제 조건",
      description:
        "지역별 가격은 비용 비교에 유용하지만 실제 가입 여부는 현지 서비스 제공 범위, 계정 국가, 허용되는 결제 수단에 달려 있습니다.",
      seoTitle: "구독 결제 수단 및 계정 국가 조건 가이드",
      seoDescription:
        "구독하기 전 서비스 제공 국가, 계정 지역, 결제 수단, 청구지 정보와 최종 결제 금액을 점검해 결제 실패를 예방하는 기준을 정리했습니다.",
      seoKeywords: "구독 결제, 계정 국가, 청구지 주소, 해외 결제 수단",
      articleType: "GUIDE",
      sections: [
        {
          title: "해당 국가에서 서비스와 요금제가 제공되는지 확인하세요",
          body: "동일한 서비스라도 일부 국가에서만 운영되거나 요금제 구성과 혜택이 다를 수 있습니다. 공식 앱이나 결제 화면에서 원하는 요금제가 제공되는지 먼저 확인하세요.",
        },
        {
          title: "계정 지역과 결제 수단 조건을 맞추세요",
          body: "Apple ID 또는 서비스 계정 국가, 카드 발급국, 청구지 주소, 결제 통화가 일치해야 할 수 있습니다. 낮은 가격을 위해 허위 지역이나 청구 정보를 입력하지 마세요.",
        },
        {
          title: "공식 결제 화면 금액을 최종 비용으로 삼으세요",
          body: "해외 결제 수수료, 플랫폼 적용 환율, 세금 및 무료 체험 자격은 결제 직전에 확정됩니다. GeoSub의 환산 가격은 비교 참고용이며 청구 금액 보증이 아닙니다.",
        },
      ],
      note: "타 지역 결제는 플랫폼 보안 제한이나 약관 위반으로 이어질 수 있습니다. 각 서비스의 계정·결제 및 지역 규정을 준수해 주세요.",
    },
    methodology: {
      slug: "methodology",
      locale: "ko",
      eyebrow: "조사 방법론",
      title: "GeoSub가 구독 가격을 검증하는 방식",
      description:
        "모든 지역 가격 기록은 요금제 매칭, 통화·결제 주기 및 일관성 검사를 거치며, 직접 비교 가능한 데이터만 공개 순위에 반영됩니다.",
      seoTitle: "GeoSub 구독 가격 데이터 검증 방법론",
      seoDescription:
        "GeoSub가 App Store 지역별 구독 가격을 확인·검증하고 확인일, 환율 기준일, 요금제 검토일을 구분해 표시하는 원칙을 설명합니다.",
      seoKeywords: "구독 가격 데이터, App Store 가격, 가격 검증, 환율 기준일",
      articleType: "METHODOLOGY",
      sections: [
        {
          title: "원본 스토어 가격과 맥락을 그대로 보존합니다",
          body: "각 기록은 서비스, 요금제, 국가·지역, 현지 통화, 결제 주기와 확인 시각을 함께 유지합니다. 환산 추정치가 플랫폼의 원래 현지 가격을 덮어쓰지 않습니다.",
        },
        {
          title: "요금제 일치성, 안정성, 가격 범위를 점검합니다",
          body: "요금제 매칭, 반복 관측치, 유사 권역 가격 범위를 대조해 통화 코드, 소수점, 결제 주기 오류를 걸러냅니다. 일관성이 부족한 값은 순위에 강제로 넣지 않고 보류합니다.",
        },
        {
          title: "서로 다른 의미의 날짜를 분리해 표시합니다",
          body: "가격 확인일, 환율 기준일, 요금제 검토일, 페이지 업데이트 날짜를 별도로 계산하여 독자가 환율 변동과 실제 스토어 가격 인상을 구분할 수 있게 합니다.",
        },
      ],
      note: "공개된 비교 정보는 참고용입니다. 서비스 제공 여부, 세금 및 최종 결제 금액은 확인 시점 이후 변동될 수 있습니다.",
    },
  },
  es: {
    "price-guide": {
      slug: "price-guide",
      locale: "es",
      eyebrow: "Guía de precios",
      title: "Cómo interpretar los precios regionales de suscripción",
      description:
        "El ranking de precios más bajos es solo el punto de partida. Combina precio local, fecha del tipo de cambio, impuestos y requisitos de cuenta para conocer el coste real.",
      seoTitle: "Cómo leer y comparar precios regionales de suscripciones",
      seoDescription:
        "Aprende a interpretar precios en moneda local, divisas de visualización, fechas de tipo de cambio, impuestos y restricciones de cuenta al comparar suscripciones.",
      seoKeywords: "precios regionales de suscripción, comparar suscripciones, tipo de cambio, impuestos digitales",
      articleType: "GUIDE",
      sections: [
        {
          title: "Empieza por el precio local y la fecha de verificación",
          body: "El precio local es el importe publicado por la tienda en ese país o región. Revisa el nombre exacto del plan, si la facturación es mensual o anual y la fecha del registro antes de comparar.",
        },
        {
          title: "Revisa la moneda mostrada y la fecha del cambio",
          body: "Los importes convertidos sirven para comparar mercados de un vistazo, pero no garantizan el cargo bancario. Las variaciones cambiarias mueven la conversión sin alterar la tarifa oficial local.",
        },
        {
          title: "Confirma impuestos y condiciones de compra",
          body: "El IVA u otros impuestos locales, el país de la cuenta, el medio de pago y la dirección de facturación influyen en el cobro. Un precio menor no implica que tu cuenta pueda contratarlo.",
        },
      ],
      note: "GeoSub utiliza habitualmente el precio de EE. UU. como referencia comparativa. Confirma siempre el importe definitivo en la pantalla oficial de pago.",
    },
    "gift-card-guide": {
      slug: "gift-card-guide",
      locale: "es",
      eyebrow: "Guía de tarjetas regalo",
      title: "Comprobaciones antes de comprar una tarjeta regalo digital",
      description: "Las tarjetas regalo suelen estar vinculadas a un país y una cuenta. Verifica la compatibilidad antes de comprar.",
      seoTitle: "Guía de compra y canje de tarjetas regalo digitales",
      seoDescription:
        "Revisa el país emisor, la compatibilidad de la cuenta, la moneda, la caducidad y las normas de reembolso antes de adquirir una tarjeta regalo digital.",
      seoKeywords: "tarjetas regalo digitales, región de tarjeta regalo, canje de saldo, reembolso",
      articleType: "HOW_TO",
      sections: [
        {
          title: "Asegura que el país de emisión coincida con tu cuenta",
          body: "Las tarjetas emitidas para un país normalmente no pueden canjearse en cuentas configuradas en otra región.",
        },
        {
          title: "Comprueba moneda, importe y validez",
          body: "Una misma cifra puede corresponder a divisas distintas; revisa también límites de saldo y si permite pagar suscripciones.",
        },
        {
          title: "Compra únicamente en canales verificables",
          body: "Revisa la identidad del comercio, la entrega y la política de devolución, y desconfía de descuentos extremos de origen incierto.",
        },
      ],
      note: "El canje y los reembolsos dependen exclusivamente de las condiciones oficiales de la plataforma emisora y del vendedor.",
    },
    "payment-account": {
      slug: "payment-account",
      locale: "es",
      eyebrow: "Pagos y cuenta",
      title: "Revisa las condiciones de cuenta y pago antes de suscribirte",
      description:
        "Los precios regionales ayudan a comparar costes, pero poder contratar depende de la disponibilidad local, la región de tu cuenta y los medios de pago admitidos.",
      seoTitle: "Guía de medios de pago y región de cuenta en suscripciones",
      seoDescription:
        "Comprueba la disponibilidad por país, la región de la cuenta, el método de pago, los datos de facturación y el importe final antes de contratar una suscripción.",
      seoKeywords: "pago de suscripciones, región de cuenta, dirección de facturación, método de pago",
      articleType: "GUIDE",
      sections: [
        {
          title: "Confirma que el servicio y el plan existen en ese país",
          body: "Un servicio puede operar solo en determinados mercados o cambiar nombres y ventajas según el país. Verifica en la aplicación oficial o en la página de pago que el plan esté activo allí.",
        },
        {
          title: "Alinea región de cuenta y método de pago",
          body: "El país de tu Apple ID o cuenta del servicio, el país emisor de la tarjeta, la dirección de facturación y la divisa pueden tener que coincidir. No introduzcas datos de ubicación o facturación falsos.",
        },
        {
          title: "Toma la pantalla de pago como coste definitivo",
          body: "Las comisiones por cambio de divisa de tu banco, el tipo aplicado por la pasarela, los impuestos y las pruebas gratuitas aparecen justo antes de pagar. Las conversiones de GeoSub son orientativas.",
        },
      ],
      note: "Las compras entre regiones pueden activar controles de la plataforma o infringir sus condiciones. Respeta siempre las normas aplicables a cuentas y pagos.",
    },
    methodology: {
      slug: "methodology",
      locale: "es",
      eyebrow: "Metodología",
      title: "Cómo verifica GeoSub los precios de suscripción",
      description:
        "Cada observación regional se vincula a un plan concreto y supera controles de moneda, periodicidad y coherencia antes de mostrarse en una comparativa.",
      seoTitle: "Metodología de verificación de precios de suscripción de GeoSub",
      seoDescription:
        "Descubre cómo comprueba, valida y fecha GeoSub los precios regionales de App Store antes de incluirlos en sus tablas comparativas.",
      seoKeywords: "datos de precios de suscripción, precios App Store, verificación de precios, fecha de cambio",
      articleType: "METHODOLOGY",
      sections: [
        {
          title: "Conservamos el contexto original de cada tarifa",
          body: "Cada registro guarda producto, plan, país o región, moneda original, ciclo de facturación y fecha de comprobación. El precio local de la tienda nunca se sustituye por una estimación convertida.",
        },
        {
          title: "Validamos identidad del plan, estabilidad y rango",
          body: "La correspondencia de planes, las observaciones repetidas y la comparación con mercados similares permiten detectar errores de divisa, decimales o ciclo de cobro. Los datos dudosos se retienen.",
        },
        {
          title: "Publicamos fechas con significados diferenciados",
          body: "La fecha de comprobación del precio, la fecha del tipo de cambio, la revisión del plan y la actualización de la página se calculan por separado para no confundir fluctuaciones cambiarias con subidas de tarifa.",
        },
      ],
      note: "Las comparativas publicadas tienen carácter informativo. La disponibilidad, los impuestos y el importe final en caja pueden variar tras la comprobación.",
    },
  },
};

export function getCoreGuideDefinition<L extends CanvasLocale>(
  locale: L,
  slug: CoreGuideSlug,
): CoreGuideDefinition<L> {
  return definitions[locale][slug];
}

export function getAllCoreGuideDefinitions(): CoreGuideDefinition<CoreGuideLocale>[] {
  return (["zh", "en"] as const).flatMap((locale) =>
    coreGuideSlugs.map((slug) => definitions[locale][slug]),
  );
}

export function coreGuideToMarkdown(definition: CoreGuideDefinition) {
  return [
    ...definition.sections.flatMap((section) => [
      `## ${section.title}`,
      "",
      section.body,
      "",
    ]),
    `> ${definition.note}`,
  ].join("\n");
}

export function parseCoreGuideMarkdown(
  markdown: string | null | undefined,
  fallback: Pick<CoreGuideDefinition, "sections" | "note">,
) {
  if (!markdown?.trim()) return fallback;

  const sections: CoreGuideSection[] = [];
  let title = "";
  let body: string[] = [];
  let note = "";

  const flush = () => {
    const content = body.join(" ").trim();
    if (title && content) sections.push({ title, body: content });
    title = "";
    body = [];
  };

  for (const rawLine of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();
    const heading = line.match(/^##\s+(.+)$/);

    if (heading) {
      flush();
      title = heading[1].trim();
      continue;
    }

    if (line.startsWith(">")) {
      note = `${note} ${line.replace(/^>\s?/, "")}`.trim();
      continue;
    }

    if (line) body.push(line);
  }

  flush();

  return {
    sections: sections.length > 0 ? sections : fallback.sections,
    note: note || fallback.note,
  };
}

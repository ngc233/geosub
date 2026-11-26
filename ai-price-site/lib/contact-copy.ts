import { resolveCanvasLocale, type CanvasLocale } from "./canvas-ui-copy.ts";

export const contactTicketCategoryValues = [
  "correction",
  "suggestion",
  "data",
  "advertising",
  "privacy",
  "other",
] as const;

export type ContactTicketCategory = (typeof contactTicketCategoryValues)[number];

export type ContactItemIconKey = "FileSearch" | "Lightbulb" | "BarChart3" | "Megaphone";

export type ContactPageCopy = {
  metaTitle: string;
  metaDescription: string;
  summaryTitle: string;
  eyebrow: string;
  heading: string;
  intro: string;
  directEmailEyebrow: string;
  mailtoSubject: string;
  directEmailChecklist: readonly [string, string];
  contactTypesKicker: string;
  contactTypesHeading: string;
  contactTypesDesc: string;
  contactItems: readonly {
    title: string;
    desc: string;
    action: string;
    icon: ContactItemIconKey;
  }[];
  ticketSectionKicker: string;
  ticketSectionHeading: string;
  ticketSectionDesc: string;
  partnershipKicker: string;
  partnershipHeading: string;
  partnershipDesc: string;
  advertisingOptions: readonly {
    number: string;
    title: string;
    desc: string;
  }[];
  principlesKicker: string;
  principlesHeading: string;
  principlesList: readonly [string, string, string, string];
  privacyKicker: string;
  privacyHeading: string;
  privacyDesc: string;
  privacyPrimaryBtn: string;
  privacySecondaryBtn: string;
  form: {
    categories: readonly (readonly [ContactTicketCategory, string])[];
    categoryLabel: string;
    nameLabel: string;
    nameHint: string;
    emailLabel: string;
    emailHint: string;
    orgLabel: string;
    orgHint: string;
    subjectLabel: string;
    subjectHint: string;
    pageUrlLabel: string;
    pageUrlHint: string;
    messageLabel: string;
    messageHint: string;
    honeypotLabel: string;
    consentNote: string;
    sendingLabel: string;
    submitLabel: string;
    successHeading: string;
    successFeedback: (ticketId: string) => string;
    submitAnotherLabel: string;
    fallbackError: string;
  };
  apiErrors: {
    invalidOrigin: string;
    payloadTooLarge: string;
    invalidFormat: string;
    missingRequired: string;
    invalidEmail: string;
    rateLimited: string;
  };
};

export const contactEmail = "yoshirinra@gmail.com";

export const contactCopyByLocale: Record<CanvasLocale, ContactPageCopy> = {
  zh: {
    metaTitle: "联系我们与合作",
    metaDescription: "联系 GeoSub 提交价格纠错、产品建议、隐私请求，或咨询数据、内容、品牌与广告合作。",
    summaryTitle: "联系邮箱",
    eyebrow: "纠错反馈与合作通道",
    heading: "让价格信息更准确，让合作更透明。",
    intro:
      "无论你要纠正一条价格、推荐新增产品，还是讨论数据、内容与品牌合作，都可以通过下方工单或直连邮箱与我们取得联系。",
    directEmailEyebrow: "直连联系邮箱",
    mailtoSubject: "联系 GeoSub",
    directEmailChecklist: [
      "请在邮件或工单主题中注明事项类型，便于快速分流处理。",
      "数据纠错请尽量附上页面链接、对应地区与官方结算截图或来源。",
    ],
    contactTypesKicker: "选择联系类型",
    contactTypesHeading: "告诉我们，你想解决什么问题",
    contactTypesDesc: "信息越具体，我们越容易复核并跟进处理。",
    contactItems: [
      {
        title: "价格与数据纠错",
        desc: "发现价格、税费、币种、地区或订阅条件有误？请附上产品、地区、页面链接和可信来源。",
        action: "填写纠错工单",
        icon: "FileSearch",
      },
      {
        title: "产品与功能建议",
        desc: "告诉我们你希望新增的订阅产品、对比维度、工具或使用场景，我们会纳入需求评估。",
        action: "提出产品建议",
        icon: "Lightbulb",
      },
      {
        title: "数据与内容合作",
        desc: "适合研究机构、媒体、开发者和数据服务商，可讨论数据引用、联合研究及内容合作。",
        action: "咨询数据合作",
        icon: "BarChart3",
      },
      {
        title: "广告与品牌合作",
        desc: "面向与数字订阅、支付、出海和效率工具相关的品牌，提供清晰标注、独立审核的合作机会。",
        action: "咨询品牌合作",
        icon: "Megaphone",
      },
    ],
    ticketSectionKicker: "私密联系工单",
    ticketSectionHeading: "直接在站内提交，我们负责跟进",
    ticketSectionDesc: "工单不会公开展示。提交后会生成回执编号，并进入私密审核处理队列。",
    partnershipKicker: "合作边界",
    partnershipHeading: "GeoSub 可以接商业合作吗？",
    partnershipDesc:
      "可以，但只接受与读者需求相关、合作关系清晰、不会干预价格数据和编辑结论的项目。",
    advertisingOptions: [
      {
        number: "01",
        title: "品牌展示",
        desc: "在相关内容或工具页面展示明确标注的品牌信息，绝不伪装成编辑推荐。",
      },
      {
        number: "02",
        title: "赞助内容",
        desc: "围绕订阅趋势、跨区定价或支付场景策划内容，并清楚披露合作关系。",
      },
      {
        number: "03",
        title: "联合数据项目",
        desc: "基于可验证的方法制作行业观察、数据报告或专题页面，结论保持独立。",
      },
    ],
    principlesKicker: "商业合作原则",
    principlesHeading: "合作可以发生，数据立场不能出售",
    principlesList: [
      "广告与赞助内容明确标注",
      "付费不改变价格排名",
      "不出售个人浏览数据",
      "保留事实核验与编辑独立性",
    ],
    privacyKicker: "隐私相关请求",
    privacyHeading: "查询、更正或删除浏览器标识相关记录",
    privacyDesc:
      "如需查询、更正或删除与浏览器标识符相关的数据，请在上方工单或邮件主题中注明“隐私请求”。",
    privacyPrimaryBtn: "前往工单填写",
    privacySecondaryBtn: "阅读隐私政策",
    form: {
      categories: [
        ["correction", "价格与数据纠错"],
        ["suggestion", "产品与功能建议"],
        ["data", "数据与内容合作"],
        ["advertising", "广告与品牌合作"],
        ["privacy", "隐私请求"],
        ["other", "其他问题"],
      ],
      categoryLabel: "联系类型",
      nameLabel: "称呼",
      nameHint: "你的姓名或称呼",
      emailLabel: "联系邮箱",
      emailHint: "用于接收回复",
      orgLabel: "组织 / 品牌（选填）",
      orgHint: "公司、机构或品牌名称",
      subjectLabel: "主题",
      subjectHint: "用一句话说明你的需求",
      pageUrlLabel: "相关页面（选填）",
      pageUrlHint: "https://geosub.org/...",
      messageLabel: "详细说明",
      messageHint: "请提供产品、地区、来源或合作目标等必要信息。",
      honeypotLabel: "网站",
      consentNote:
        "提交即表示你同意我们仅为处理本次联系而保存并使用所填信息。请勿提交密码、付款资料或其他敏感凭据。",
      sendingLabel: "正在提交",
      submitLabel: "提交工单",
      successHeading: "提交成功",
      successFeedback: (ticketId) => `工单 ${ticketId} 已提交，我们会通过你填写的邮箱回复。`,
      submitAnotherLabel: "再提交一条",
      fallbackError: "提交失败，请稍后重试或使用页面邮箱联系我们。",
    },
    apiErrors: {
      invalidOrigin: "请求来源无效。",
      payloadTooLarge: "提交内容过长。",
      invalidFormat: "提交格式无效。",
      missingRequired: "请完整填写必填内容。",
      invalidEmail: "请输入有效邮箱。",
      rateLimited: "提交过于频繁，请稍后再试。",
    },
  },
  "zh-tw": {
    metaTitle: "聯絡我們與合作",
    metaDescription: "聯絡 GeoSub 提交價格勘誤、產品建議、隱私請求，或洽談資料、內容、品牌與廣告合作。",
    summaryTitle: "聯絡信箱",
    eyebrow: "勘誤回饋與合作管道",
    heading: "讓價格資訊更準確，讓合作更透明。",
    intro:
      "無論你要更正一筆價格、推薦新增產品，或是洽談資料、內容與品牌合作，都可以透過下方工單或直連信箱與我們聯繫。",
    directEmailEyebrow: "直連聯絡信箱",
    mailtoSubject: "聯絡 GeoSub",
    directEmailChecklist: [
      "請在信件或工單主旨註明事項類型，方便快速分流處理。",
      "資料勘誤請盡量附上頁面連結、對應地區與官方結帳截圖或來源。",
    ],
    contactTypesKicker: "選擇聯絡類型",
    contactTypesHeading: "告訴我們，你想解決什麼問題",
    contactTypesDesc: "資訊越具體，我們越容易覆核並跟進處理。",
    contactItems: [
      {
        title: "價格與資料勘誤",
        desc: "發現價格、稅費、幣別、地區或訂閱條件有誤？請附上產品、地區、頁面連結與可信來源。",
        action: "填寫勘誤工單",
        icon: "FileSearch",
      },
      {
        title: "產品與功能建議",
        desc: "告訴我們你希望新增的訂閱產品、比較維度、工具或使用情境，我們會納入需求評估。",
        action: "提出產品建議",
        icon: "Lightbulb",
      },
      {
        title: "資料與內容合作",
        desc: "適合研究機構、媒體、開發者與資料服務商，可討論資料引用、聯合研究及內容合作。",
        action: "洽詢資料合作",
        icon: "BarChart3",
      },
      {
        title: "廣告與品牌合作",
        desc: "面向與數位訂閱、支付、跨境服務與生產力工具相關的品牌，提供清楚標示、獨立審核的合作機會。",
        action: "洽詢品牌合作",
        icon: "Megaphone",
      },
    ],
    ticketSectionKicker: "私密聯絡工單",
    ticketSectionHeading: "直接在站內提交，我們負責跟進",
    ticketSectionDesc: "工單不會公開顯示。送出後會產生回執編號，並進入私密審核處理佇列。",
    partnershipKicker: "合作邊界",
    partnershipHeading: "GeoSub 可以承接商業合作嗎？",
    partnershipDesc:
      "可以，但僅接受與讀者需求相關、合作關係清楚、不會干預價格資料與編輯結論的專案。",
    advertisingOptions: [
      {
        number: "01",
        title: "品牌展示",
        desc: "在相關內容或工具頁面展示明確標示的品牌資訊，絕不偽裝成編輯推薦。",
      },
      {
        number: "02",
        title: "贊助內容",
        desc: "圍繞訂閱趨勢、跨區定價或付款情境企劃內容，並清楚揭露合作關係。",
      },
      {
        number: "03",
        title: "聯合資料專案",
        desc: "基於可驗證的方法製作產業觀察、資料報告或專題頁面，結論保持獨立。",
      },
    ],
    principlesKicker: "商業合作原則",
    principlesHeading: "合作可以進行，資料立場絕不出售",
    principlesList: [
      "廣告與贊助內容明確標示",
      "付費不改變價格排名",
      "不出售個人瀏覽資料",
      "保留事實核驗與編輯獨立性",
    ],
    privacyKicker: "隱私相關請求",
    privacyHeading: "查詢、更正或刪除瀏覽器識別相關紀錄",
    privacyDesc:
      "如需查詢、更正或刪除與瀏覽器識別碼相關的資料，請在上方工單或信件主旨註明「隱私請求」。",
    privacyPrimaryBtn: "前往填寫工單",
    privacySecondaryBtn: "閱讀隱私權政策",
    form: {
      categories: [
        ["correction", "價格與資料勘誤"],
        ["suggestion", "產品與功能建議"],
        ["data", "資料與內容合作"],
        ["advertising", "廣告與品牌合作"],
        ["privacy", "隱私請求"],
        ["other", "其他問題"],
      ],
      categoryLabel: "聯絡類型",
      nameLabel: "稱呼",
      nameHint: "你的姓名或稱呼",
      emailLabel: "聯絡信箱",
      emailHint: "用於接收回覆",
      orgLabel: "組織 / 品牌（選填）",
      orgHint: "公司、機構或品牌名稱",
      subjectLabel: "主旨",
      subjectHint: "用一句話說明你的需求",
      pageUrlLabel: "相關頁面（選填）",
      pageUrlHint: "https://geosub.org/...",
      messageLabel: "詳細說明",
      messageHint: "請提供產品、地區、來源或合作目標等必要資訊。",
      honeypotLabel: "網站",
      consentNote:
        "送出即表示你同意我們僅為處理本次聯繫而保存並使用所填資訊。請勿提交密碼、付款資料或其他敏感憑證。",
      sendingLabel: "正在送出",
      submitLabel: "送出工單",
      successHeading: "送出成功",
      successFeedback: (ticketId) => `工單 ${ticketId} 已送出，我們會透過你填寫的信箱回覆。`,
      submitAnotherLabel: "再送出一筆",
      fallbackError: "送出失敗，請稍後再試或改用頁面信箱與我們聯繫。",
    },
    apiErrors: {
      invalidOrigin: "請求來源無效。",
      payloadTooLarge: "提交內容過長。",
      invalidFormat: "提交格式無效。",
      missingRequired: "請完整填寫必填欄位。",
      invalidEmail: "請輸入有效的電子信箱。",
      rateLimited: "提交過於頻繁，請稍後再試。",
    },
  },
  en: {
    metaTitle: "Contact & Partnerships",
    metaDescription:
      "Reach GeoSub to report price corrections, suggest products, submit privacy requests, or discuss data, editorial, and brand partnerships.",
    summaryTitle: "Direct email",
    eyebrow: "Corrections, Support & Partnerships",
    heading: "Keep regional pricing accurate and partnerships transparent.",
    intro:
      "Whether you want to report a price update, suggest a digital service to track, submit a privacy inquiry, or explore data and brand collaborations, reach us via the private ticket form below or direct email.",
    directEmailEyebrow: "Direct email contact",
    mailtoSubject: "Contact GeoSub",
    directEmailChecklist: [
      "Include the topic category in your email or ticket subject so we can route it quickly.",
      "For price corrections, share the page URL, store region, and official checkout evidence or link.",
    ],
    contactTypesKicker: "Choose a topic",
    contactTypesHeading: "Tell us how we can help",
    contactTypesDesc: "Clear context helps our team verify details and respond faster.",
    contactItems: [
      {
        title: "Price & data corrections",
        desc: "Spotted an outdated list price, tax rule, currency, region, or plan condition? Include the product, region, page URL, and official source.",
        action: "Submit a correction",
        icon: "FileSearch",
      },
      {
        title: "Product & feature requests",
        desc: "Let us know which subscriptions, comparison views, or calculators would help your workflow.",
        action: "Share a suggestion",
        icon: "Lightbulb",
      },
      {
        title: "Data & editorial collaboration",
        desc: "For researchers, journalists, developers, and analysts interested in data citations, joint studies, or editorial projects.",
        action: "Discuss data collaboration",
        icon: "BarChart3",
      },
      {
        title: "Advertising & brand partnerships",
        desc: "Clearly labeled sponsorship opportunities for relevant subscription, payment, and productivity brands.",
        action: "Inquire about partnerships",
        icon: "Megaphone",
      },
    ],
    ticketSectionKicker: "Private support ticket",
    ticketSectionHeading: "Submit directly on GeoSub",
    ticketSectionDesc:
      "Tickets are never displayed publicly. You will receive a reference ID right away while our team reviews your message.",
    partnershipKicker: "Commercial boundaries",
    partnershipHeading: "Does GeoSub accept commercial partnerships?",
    partnershipDesc:
      "Yes—when relevant to readers, clearly disclosed, and strictly separated from our regional price rankings and verification standards.",
    advertisingOptions: [
      {
        number: "01",
        title: "Brand placements",
        desc: "Clearly labeled placements on relevant pages—never disguised as editorial picks.",
      },
      {
        number: "02",
        title: "Sponsored features",
        desc: "Co-created guides on subscription trends or cross-border payments with prominent sponsorship disclosure.",
      },
      {
        number: "03",
        title: "Joint data reports",
        desc: "Research briefs and market snapshots built on reproducible methods with independent conclusions.",
      },
    ],
    principlesKicker: "Partnership principles",
    principlesHeading: "Partnerships welcome; data integrity is never for sale",
    principlesList: [
      "All ads and sponsorships are clearly labeled",
      "Paid partnerships never alter price rankings",
      "Personal browsing records are never sold",
      "Verification rules and editorial conclusions stay independent",
    ],
    privacyKicker: "Privacy inquiries",
    privacyHeading: "Access, correct, or delete browser-identifier records",
    privacyDesc:
      "To inquire about, correct, or delete records associated with browser identifiers, select “Privacy request” in the ticket form above or note it in your email subject.",
    privacyPrimaryBtn: "Go to ticket form",
    privacySecondaryBtn: "Read Privacy Policy",
    form: {
      categories: [
        ["correction", "Price & data correction"],
        ["suggestion", "Product & feature suggestion"],
        ["data", "Data & editorial collaboration"],
        ["advertising", "Advertising & brand partnership"],
        ["privacy", "Privacy request"],
        ["other", "General inquiry"],
      ],
      categoryLabel: "Inquiry type",
      nameLabel: "Your name",
      nameHint: "How we should address you",
      emailLabel: "Email address",
      emailHint: "Where we should send our reply",
      orgLabel: "Organization / Brand (optional)",
      orgHint: "Company, publication, or team",
      subjectLabel: "Subject",
      subjectHint: "Summarize your request in one line",
      pageUrlLabel: "Related page URL (optional)",
      pageUrlHint: "https://geosub.org/...",
      messageLabel: "Details",
      messageHint:
        "Include the product, region, official source link, or partnership scope (at least 20 characters).",
      honeypotLabel: "Website",
      consentNote:
        "By submitting, you agree that GeoSub may store and use these details solely to review and reply to your inquiry. Never include passwords, payment card details, or sensitive credentials.",
      sendingLabel: "Submitting",
      submitLabel: "Submit ticket",
      successHeading: "Ticket submitted",
      successFeedback: (ticketId) =>
        `Ticket ${ticketId} has been received. We will reply to the email address you provided.`,
      submitAnotherLabel: "Submit another ticket",
      fallbackError: "Unable to submit right now. Please try again shortly or email us directly.",
    },
    apiErrors: {
      invalidOrigin: "Invalid request origin.",
      payloadTooLarge: "Submission is too large.",
      invalidFormat: "Invalid submission format.",
      missingRequired: "Please complete all required fields.",
      invalidEmail: "Please enter a valid email address.",
      rateLimited: "Too many submissions. Please try again later.",
    },
  },
  ja: {
    metaTitle: "お問い合わせ・提携のご相談",
    metaDescription:
      "価格データの修正報告、機能リクエスト、プライバシーに関する請求、データ引用・広告提携について GeoSub へお問い合わせいただけます。",
    summaryTitle: "連絡先メール",
    eyebrow: "価格修正・お問い合わせ窓口",
    heading: "価格情報をより正確に、提携をより透明に。",
    intro:
      "価格データの誤り報告、掲載サービスのリクエスト、データ活用やブランド提携のご相談は、ページ下部の非公開フォームまたはメールにてご連絡ください。",
    directEmailEyebrow: "直通メールアドレス",
    mailtoSubject: "GeoSub お問い合わせ",
    directEmailChecklist: [
      "迅速な確認のため、件名にお問い合わせ種別をご記入ください。",
      "価格の修正報告では、対象ページ URL・国や地域・公式ストアの表示根拠を添えていただくとスムーズです。",
    ],
    contactTypesKicker: "お問い合わせ種別",
    contactTypesHeading: "ご用件をお知らせください",
    contactTypesDesc: "具体的な情報があるほど、迅速に事実確認と回答を行えます。",
    contactItems: [
      {
        title: "価格・データの修正報告",
        desc: "価格・税条件・通貨・地域・プラン内容に相違がある場合は、対象ページ URL と公式の根拠をお知らせください。",
        action: "修正フォームへ進む",
        icon: "FileSearch",
      },
      {
        title: "掲載サービス・機能の要望",
        desc: "追加してほしいサブスクリプションや比較軸、便利なツール案をお寄せください。",
        action: "要望を送る",
        icon: "Lightbulb",
      },
      {
        title: "データ・コンテンツ連携",
        desc: "調査機関・メディア・開発者向けに、データの引用や共同調査、記事連携のご相談を承ります。",
        action: "データ連携を相談する",
        icon: "BarChart3",
      },
      {
        title: "広告・ブランド提携",
        desc: "デジタルサービス・決済・生産性ツール関連ブランド向けに、明示的な広告表記を前提とした提携枠をご案内します。",
        action: "提携を相談する",
        icon: "Megaphone",
      },
    ],
    ticketSectionKicker: "非公開お問い合わせフォーム",
    ticketSectionHeading: "サイト内から直接送信できます",
    ticketSectionDesc: "送信内容が公開されることはありません。送信後に受付番号が発行され、担当者が順次確認します。",
    partnershipKicker: "提携ポリシー",
    partnershipHeading: "商用パートナーシップは可能ですか？",
    partnershipDesc:
      "読者にとって有益であり、提携関係が明示され、価格ランキングや検証結果に一切影響しない案件に限り受け付けています。",
    advertisingOptions: [
      {
        number: "01",
        title: "ブランド掲載",
        desc: "関連ページに「広告」「PR」を明確に表記して掲載し、編集部の推薦と混同させません。",
      },
      {
        number: "02",
        title: "タイアップ記事",
        desc: "サブスク動向や海外決済をテーマに企画し、提供元を明瞭に開示します。",
      },
      {
        number: "03",
        title: "共同データレポート",
        desc: "検証可能な手法に基づく市場レポートや特集を制作し、分析結論の独立性を保ちます。",
      },
    ],
    principlesKicker: "提携の基本原則",
    principlesHeading: "提携は行っても、データの独立性は売り渡さない",
    principlesList: [
      "広告・提供コンテンツは明確にラベル表示",
      "広告出稿によって価格順位を変更しない",
      "個人の閲覧データを第三者へ販売しない",
      "価格検証基準と編集の独立性を維持",
    ],
    privacyKicker: "プライバシー関連の請求",
    privacyHeading: "ブラウザ識別子に関する記録の照会・訂正・削除",
    privacyDesc:
      "ブラウザ識別子に関連するデータの照会・訂正・削除をご希望の場合は、フォームの種別またはメール件名で「プライバシーに関する請求」をお選びください。",
    privacyPrimaryBtn: "フォームへ移動",
    privacySecondaryBtn: "プライバシーポリシーを読む",
    form: {
      categories: [
        ["correction", "価格・データの修正報告"],
        ["suggestion", "サービス・機能の要望"],
        ["data", "データ・コンテンツ連携"],
        ["advertising", "広告・ブランド提携"],
        ["privacy", "プライバシーに関する請求"],
        ["other", "その他のお問い合わせ"],
      ],
      categoryLabel: "お問い合わせ種別",
      nameLabel: "お名前",
      nameHint: "お名前または呼び名",
      emailLabel: "メールアドレス",
      emailHint: "返信先メールアドレス",
      orgLabel: "会社・団体名（任意）",
      orgHint: "企業・メディア・団体名",
      subjectLabel: "件名",
      subjectHint: "ご用件を簡潔にご記入ください",
      pageUrlLabel: "関連ページ URL（任意）",
      pageUrlHint: "https://geosub.org/...",
      messageLabel: "詳細内容",
      messageHint: "対象サービス、地域、公式ソース、または提携内容の詳細をご記入ください（20文字以上）。",
      honeypotLabel: "ウェブサイト",
      consentNote:
        "送信により、本お問い合わせへの対応目的に限り入力情報を保存・利用することに同意したものとみなされます。パスワードや決済情報などの機密情報は入力しないでください。",
      sendingLabel: "送信中",
      submitLabel: "送信する",
      successHeading: "送信が完了しました",
      successFeedback: (ticketId) =>
        `受付番号 ${ticketId} で承りました。ご入力いただいたメールアドレス宛にご返信いたします。`,
      submitAnotherLabel: "別のお問い合わせを送る",
      fallbackError: "送信できませんでした。しばらくしてから再度お試しいただくか、メールにてご連絡ください。",
    },
    apiErrors: {
      invalidOrigin: "無効なリクエスト元です。",
      payloadTooLarge: "送信データが大きすぎます。",
      invalidFormat: "送信形式が正しくありません。",
      missingRequired: "必須項目をすべて入力してください。",
      invalidEmail: "有効なメールアドレスを入力してください。",
      rateLimited: "送信回数が上限に達しました。しばらく経ってから再度お試しください。",
    },
  },
  ko: {
    metaTitle: "문의 및 제휴 안내",
    metaDescription:
      "GeoSub에 가격 오류 제보, 서비스 추가 제안, 개인정보 관련 요청 또는 데이터·콘텐츠·브랜드 제휴를 문의하세요.",
    summaryTitle: "직통 이메일",
    eyebrow: "오류 제보 및 제휴 채널",
    heading: "가격 정보는 더 정확하게, 제휴는 더 투명하게.",
    intro:
      "가격 데이터 정정, 신규 구독 서비스 추천, 개인정보 관련 요청, 데이터·콘텐츠 및 브랜드 제휴 문의는 아래 비공개 티켓 양식이나 이메일로 접수하실 수 있습니다.",
    directEmailEyebrow: "직통 문의 이메일",
    mailtoSubject: "GeoSub 문의",
    directEmailChecklist: [
      "빠른 분류를 위해 이메일이나 티켓 제목에 문의 유형을 함께 적어 주세요.",
      "가격 정정 제보 시 페이지 링크, 해당 국가/지역 및 공식 결제 화면 근거를 첨부해 주시면 빠르게 확인됩니다.",
    ],
    contactTypesKicker: "문의 유형 선택",
    contactTypesHeading: "어떤 도움이 필요하신가요?",
    contactTypesDesc: "구체적인 내용을 남겨 주실수록 더 정확히 확인하고 답변드릴 수 있습니다.",
    contactItems: [
      {
        title: "가격 및 데이터 정정",
        desc: "가격, 세금 안내, 통화, 지역 또는 요금제 조건에 오류가 있나요? 제품명, 지역, 페이지 URL과 공식 출처를 알려 주세요.",
        action: "정정 티켓 작성",
        icon: "FileSearch",
      },
      {
        title: "제품 및 기능 제안",
        desc: "새로 추가되었으면 하는 구독 서비스, 비교 기준, 계산 도구 아이디어를 들려주세요.",
        action: "기능 제안하기",
        icon: "Lightbulb",
      },
      {
        title: "데이터 및 콘텐츠 협력",
        desc: "연구기관, 미디어, 개발자 및 데이터 파트너와 데이터 인용, 공동 리서치, 콘텐츠 협업을 논의합니다.",
        action: "데이터 협력 문의",
        icon: "BarChart3",
      },
      {
        title: "광고 및 브랜드 제휴",
        desc: "디지털 구독, 결제, 글로벌 생산성 도구 관련 브랜드를 대상으로 명확히 표기되는 제휴 기회를 제공합니다.",
        action: "브랜드 제휴 문의",
        icon: "Megaphone",
      },
    ],
    ticketSectionKicker: "비공개 문의 티켓",
    ticketSectionHeading: "사이트에서 바로 접수하세요",
    ticketSectionDesc: "접수된 티켓은 외부에 공개되지 않습니다. 제출 즉시 접수 번호가 발급되며 담당팀이 순차 검토합니다.",
    partnershipKicker: "제휴 원칙과 경계",
    partnershipHeading: "GeoSub은 상업적 제휴를 진행하나요?",
    partnershipDesc:
      "독자에게 유용하고 제휴 관계가 명확히 고지되며, 가격 순위와 검증 결과에 영향을 주지 않는 프로젝트에 한해 진행합니다.",
    advertisingOptions: [
      {
        number: "01",
        title: "브랜드 노출",
        desc: "관련 페이지에 광고임을 명확히 표시하여 노출하며 에디터 추천으로 위장하지 않습니다.",
      },
      {
        number: "02",
        title: "스폰서 콘텐츠",
        desc: "구독 트렌드나 해외 결제 주제를 다루되 후원 및 제휴 관계를 투명하게 밝힙니다.",
      },
      {
        number: "03",
        title: "공동 데이터 리포트",
        desc: "검증 가능한 방법론으로 시장 분석 리포트를 제작하며 결론의 독립성을 유지합니다.",
      },
    ],
    principlesKicker: "상업 제휴 기준",
    principlesHeading: "제휴는 가능해도 데이터의 중립성은 거래하지 않습니다",
    principlesList: [
      "광고 및 스폰서 콘텐츠 명확히 표기",
      "유료 제휴로 가격 순위를 변경하지 않음",
      "개인 브라우징 데이터를 판매하지 않음",
      "데이터 검증 및 편집 독립성 유지",
    ],
    privacyKicker: "개인정보 관련 요청",
    privacyHeading: "브라우저 식별자 관련 기록 조회·정정·삭제",
    privacyDesc:
      "브라우저 식별자와 연결된 기록의 조회, 정정 또는 삭제를 원하시면 위 티켓 유형에서 ‘개인정보 요청’을 선택하거나 이메일 제목에 명시해 주세요.",
    privacyPrimaryBtn: "티켓 양식으로 이동",
    privacySecondaryBtn: "개인정보 처리방침 보기",
    form: {
      categories: [
        ["correction", "가격 및 데이터 정정"],
        ["suggestion", "제품 및 기능 제안"],
        ["data", "데이터 및 콘텐츠 협력"],
        ["advertising", "광고 및 브랜드 제휴"],
        ["privacy", "개인정보 요청"],
        ["other", "기타 문의"],
      ],
      categoryLabel: "문의 유형",
      nameLabel: "성함 / 호칭",
      nameHint: "성함 또는 닉네임",
      emailLabel: "회신받을 이메일",
      emailHint: "답변을 받으실 이메일 주소",
      orgLabel: "소속 / 브랜드 (선택)",
      orgHint: "회사, 기관 또는 브랜드명",
      subjectLabel: "제목",
      subjectHint: "문의 내용을 한 줄로 요약해 주세요",
      pageUrlLabel: "관련 페이지 URL (선택)",
      pageUrlHint: "https://geosub.org/...",
      messageLabel: "상세 내용",
      messageHint: "서비스명, 지역, 공식 출처 링크 또는 제휴 목적을 구체적으로 작성해 주세요 (20자 이상).",
      honeypotLabel: "웹사이트",
      consentNote:
        "제출 시 본 문의 처리 및 회신 목적에 한해 입력하신 정보를 저장·이용하는 데 동의하게 됩니다. 비밀번호, 결제 정보 등 민감한 자격 증명은 절대 입력하지 마세요.",
      sendingLabel: "제출 중",
      submitLabel: "티켓 제출",
      successHeading: "접수 완료",
      successFeedback: (ticketId) =>
        `티켓 ${ticketId}번이 접수되었습니다. 입력하신 이메일로 확인 후 답변드리겠습니다.`,
      submitAnotherLabel: "추가 문의 작성",
      fallbackError: "제출에 실패했습니다. 잠시 후 다시 시도하거나 페이지에 안내된 이메일로 문의해 주세요.",
    },
    apiErrors: {
      invalidOrigin: "유효하지 않은 요청 출처입니다.",
      payloadTooLarge: "제출 내용이 허용 용량을 초과했습니다.",
      invalidFormat: "제출 형식이 올바르지 않습니다.",
      missingRequired: "필수 입력 항목을 모두 작성해 주세요.",
      invalidEmail: "유효한 이메일 주소를 입력해 주세요.",
      rateLimited: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    },
  },
  es: {
    metaTitle: "Contacto y colaboraciones",
    metaDescription:
      "Contacta con GeoSub para enviar correcciones de precios, sugerir servicios, tramitar solicitudes de privacidad o proponer colaboraciones de datos y marca.",
    summaryTitle: "Correo directo",
    eyebrow: "Correcciones, soporte y colaboraciones",
    heading: "Precios más precisos y colaboraciones más transparentes.",
    intro:
      "Tanto si quieres corregir un precio regional, proponer un nuevo servicio, enviar una solicitud de privacidad o hablar sobre alianzas de datos, contenido o marca, puedes escribirnos mediante el formulario privado inferior o por correo directo.",
    directEmailEyebrow: "Correo electrónico directo",
    mailtoSubject: "Contacto GeoSub",
    directEmailChecklist: [
      "Indica el tipo de consulta en el asunto del correo o ticket para agilizar su revisión.",
      "Para correcciones de precios, adjunta el enlace de la página, la región y la referencia oficial de pago.",
    ],
    contactTypesKicker: "Elige el motivo",
    contactTypesHeading: "Cuéntanos qué necesitas resolver",
    contactTypesDesc: "Cuanto más concreto sea el mensaje, más rápido podremos verificarlo y responderte.",
    contactItems: [
      {
        title: "Corrección de precios y datos",
        desc: "¿Detectaste un cambio en precio, impuestos, divisa, región o condiciones? Incluye el servicio, la región, la URL y la fuente oficial.",
        action: "Enviar corrección",
        icon: "FileSearch",
      },
      {
        title: "Sugerencias de producto",
        desc: "Dinos qué suscripciones, comparativas o herramientas te gustaría ver en GeoSub.",
        action: "Proponer mejora",
        icon: "Lightbulb",
      },
      {
        title: "Colaboración de datos y contenido",
        desc: "Para medios, investigadores, desarrolladores y analistas interesados en citas de datos o estudios conjuntos.",
        action: "Consultar colaboración de datos",
        icon: "BarChart3",
      },
      {
        title: "Publicidad y alianzas de marca",
        desc: "Oportunidades claramente identificadas para marcas de suscripciones digitales, pagos y productividad.",
        action: "Consultar alianza de marca",
        icon: "Megaphone",
      },
    ],
    ticketSectionKicker: "Ticket de contacto privado",
    ticketSectionHeading: "Envíalo directamente desde GeoSub",
    ticketSectionDesc:
      "Los tickets nunca se muestran en público. Al enviarlo recibirás un código de referencia para seguimiento privado.",
    partnershipKicker: "Límites comerciales",
    partnershipHeading: "¿Acepta GeoSub colaboraciones comerciales?",
    partnershipDesc:
      "Sí, siempre que aporten valor al lector, se identifiquen con claridad y no interfieran en los rankings de precios ni en las conclusiones editoriales.",
    advertisingOptions: [
      {
        number: "01",
        title: "Presencia de marca",
        desc: "Espacios claramente etiquetados en páginas relevantes, nunca disfrazados de recomendación editorial.",
      },
      {
        number: "02",
        title: "Contenido patrocinado",
        desc: "Artículos sobre tendencias de suscripción o pagos internacionales con aviso visible de patrocinio.",
      },
      {
        number: "03",
        title: "Informes de datos conjuntos",
        desc: "Análisis sectoriales basados en metodologías verificables manteniendo conclusiones independientes.",
      },
    ],
    principlesKicker: "Principios comerciales",
    principlesHeading: "Abiertos a colaborar; nuestros datos no están en venta",
    principlesList: [
      "Publicidad y patrocinios claramente señalizados",
      "Los acuerdos comerciales no alteran rankings de precios",
      "Nunca vendemos datos personales de navegación",
      "Verificación factual e independencia editorial intactas",
    ],
    privacyKicker: "Solicitudes de privacidad",
    privacyHeading: "Consultar, rectificar o eliminar registros de identificadores del navegador",
    privacyDesc:
      "Para consultar, corregir o eliminar datos vinculados a identificadores del navegador, elige «Solicitud de privacidad» en el formulario superior o indícalo en el asunto del correo.",
    privacyPrimaryBtn: "Ir al formulario",
    privacySecondaryBtn: "Leer Política de Privacidad",
    form: {
      categories: [
        ["correction", "Corrección de precios y datos"],
        ["suggestion", "Sugerencia de producto o función"],
        ["data", "Colaboración de datos y contenido"],
        ["advertising", "Publicidad y alianza de marca"],
        ["privacy", "Solicitud de privacidad"],
        ["other", "Otra consulta"],
      ],
      categoryLabel: "Tipo de consulta",
      nameLabel: "Nombre",
      nameHint: "Tu nombre o alias",
      emailLabel: "Correo de contacto",
      emailHint: "Dónde enviaremos nuestra respuesta",
      orgLabel: "Organización / Marca (opcional)",
      orgHint: "Empresa, medio o equipo",
      subjectLabel: "Asunto",
      subjectHint: "Resume tu consulta en una frase",
      pageUrlLabel: "Página relacionada (opcional)",
      pageUrlHint: "https://geosub.org/...",
      messageLabel: "Descripción detallada",
      messageHint:
        "Indica el producto, región, fuente oficial o alcance de la colaboración (mínimo 20 caracteres).",
      honeypotLabel: "Sitio web",
      consentNote:
        "Al enviar aceptas que guardemos y utilicemos estos datos únicamente para gestionar tu consulta. No incluyas contraseñas, datos de pago ni credenciales sensibles.",
      sendingLabel: "Enviando",
      submitLabel: "Enviar ticket",
      successHeading: "Ticket enviado",
      successFeedback: (ticketId) =>
        `Hemos recibido tu ticket ${ticketId}. Te responderemos al correo electrónico indicado.`,
      submitAnotherLabel: "Enviar otra consulta",
      fallbackError: "No se pudo enviar ahora mismo. Inténtalo de nuevo en unos minutos o escríbenos por correo.",
    },
    apiErrors: {
      invalidOrigin: "Origen de la solicitud no válido.",
      payloadTooLarge: "El contenido enviado es demasiado extenso.",
      invalidFormat: "Formato de envío no válido.",
      missingRequired: "Por favor, completa todos los campos obligatorios.",
      invalidEmail: "Introduce una dirección de correo electrónico válida.",
      rateLimited: "Demasiados envíos recientes. Inténtalo de nuevo más tarde.",
    },
  },
};

export function getContactCopy(locale: CanvasLocale = "zh"): ContactPageCopy {
  return contactCopyByLocale[resolveCanvasLocale(locale)];
}

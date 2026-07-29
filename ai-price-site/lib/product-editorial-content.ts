import type { SiteLocale } from "./site-locale";

export type ProductPlanEditorialContent = {
  bestFor: string;
  difference: string;
  availabilityNote?: string;
  indexingStatus?: "current" | "legacy";
  sourceUrl: string;
};

export type ProductEditorialContent = {
  summary: string;
  sectionTitle: string;
  bestForLabel: string;
  differenceLabel: string;
  availabilityLabel: string;
  sourceLabel: string;
  plans: Record<string, ProductPlanEditorialContent>;
};

type EditorialLocale = "zh" | "en";

const editorialContent: Record<
  EditorialLocale,
  Record<string, ProductEditorialContent>
> = {
  zh: {
    chatgpt: {
      summary:
        "ChatGPT 是 OpenAI 面向个人用户的 AI 助手。各付费层级主要差在使用额度、可用模型、记忆与上下文，以及 Codex 等高级工具的访问范围。本页只比较可核验的个人月度订阅价格，不混入团队版或 API 计费。",
      sectionTitle: "这个套餐适合谁",
      bestForLabel: "适合",
      differenceLabel: "与其他套餐的主要区别",
      availabilityLabel: "订阅前注意",
      sourceLabel: "查看 OpenAI 官方套餐说明",
      plans: {
        go: {
          bestFor:
            "预算优先，希望比免费版获得更多消息、文件上传和图片生成额度的日常用户。",
          difference:
            "定位较低价的个人入门层。它扩展免费版的常用额度，但深度推理和更长工作流更适合 Plus 或 Pro。",
          sourceUrl: "https://openai.com/index/introducing-chatgpt-go/",
        },
        plus: {
          bestFor:
            "经常用于写作、学习、研究、数据分析，或需要更深推理能力的个人用户。",
          difference:
            "比 Go 提供更高的消息、上传、记忆和上下文额度，并扩大高级模型与 Codex 的使用范围。",
          sourceUrl: "https://openai.com/index/introducing-chatgpt-go/",
        },
        "pro-5x": {
          bestFor:
            "使用频率明显高于 Plus，但暂时不需要最高额度的专业个人用户。",
          difference:
            "与 20x 层共享 Pro 核心能力，主要区别是使用额度约为 Plus 的 5 倍；实际限额以账号套餐页为准。",
          sourceUrl:
            "https://help.openai.com/en/articles/9793128-what-is-chatgpt-pro",
        },
        pro: {
          bestFor:
            "每天高强度使用高级模型、长上下文或 Codex，并希望获得个人套餐最高额度的用户。",
          difference:
            "这是更高额度的 Pro 层，官方说明为约 Plus 的 20 倍使用容量；功能和动态限额仍以账号套餐页为准。",
          sourceUrl:
            "https://help.openai.com/en/articles/9793128-what-is-chatgpt-pro",
        },
      },
    },
    claude: {
      summary:
        "Claude 是 Anthropic 的 AI 助手，常用于写作、分析、研究与编程。个人付费层级主要按可用容量区分：Pro 面向规律使用，Max 5x 和 Max 20x 面向更高频、更长时间的专业工作。",
      sectionTitle: "这个套餐适合谁",
      bestForLabel: "适合",
      differenceLabel: "与其他套餐的主要区别",
      availabilityLabel: "订阅前注意",
      sourceLabel: "查看 Anthropic 官方套餐说明",
      plans: {
        pro: {
          bestFor:
            "日常规律使用 Claude，但不需要全天高强度额度的个人用户。",
          difference:
            "这是标准个人付费层，容量高于免费版；需要更高频持续使用时再考虑 Max。",
          sourceUrl:
            "https://support.anthropic.com/en/articles/11049762-choosing-a-claude-ai-plan",
        },
        "max-5x": {
          bestFor:
            "频繁处理长文档、代码或研究任务，Pro 额度经常不足的专业用户。",
          difference:
            "官方定位为约 Pro 的 5 倍使用容量，适合高频工作，但仍低于 Max 20x 的最高额度。",
          sourceUrl:
            "https://support.anthropic.com/en/articles/11049762-choosing-a-claude-ai-plan",
        },
        "max-20x": {
          bestFor:
            "把 Claude 作为核心生产工具，需要个人套餐最高使用容量的重度用户。",
          difference:
            "官方定位为约 Pro 的 20 倍使用容量，是个人套餐中的最高额度层。",
          sourceUrl:
            "https://support.anthropic.com/en/articles/11049762-choosing-a-claude-ai-plan",
        },
      },
    },
    netflix: {
      summary:
        "Netflix 套餐通常按画质、同时观看设备数和下载设备数区分，但具体套餐名称、权益和新用户可选范围会随国家或地区变化。本页比较 App Store 中可核验的续订价格，并将新用户可购买性单独说明。",
      sectionTitle: "这个套餐适合谁",
      bestForLabel: "适合",
      differenceLabel: "与其他套餐的主要区别",
      availabilityLabel: "可购买性说明",
      sourceLabel: "查看 Netflix 官方套餐说明",
      plans: {
        basic: {
          bestFor:
            "仍在续订旧套餐、观看设备较少，并且更在意月费而非最高画质的用户。",
          difference:
            "Basic 通常是较早期的低价层。它在部分地区仍可能存在续订价格，但不代表当地新用户仍能选择。",
          availabilityNote:
            "App Store 出现可续订价格，不等于当地新账号一定可以选择 Basic。请以 Netflix 注册页或账户中的“更改套餐”页面为准。",
          indexingStatus: "legacy",
          sourceUrl: "https://help.netflix.com/en/node/412",
        },
        standard: {
          bestFor:
            "希望在价格、画质和同时观看设备数之间取得平衡的家庭或个人用户。",
          difference:
            "通常比入门层提供更高画质和更多同时观看设备，但低于 Premium 的最高配置。",
          sourceUrl: "https://help.netflix.com/en/node/412",
        },
        premium: {
          bestFor:
            "优先考虑最高可用画质，并需要更多同时观看设备和下载设备的家庭用户。",
          difference:
            "通常是 Netflix 消费者套餐中的最高配置和最高月费层；实际画质和设备支持仍取决于内容、硬件与地区。",
          sourceUrl: "https://help.netflix.com/en/node/412",
        },
      },
    },
    gemini: {
      summary:
        "Google AI 套餐把 Gemini 模型、Google 应用内 AI 功能和云存储组合在一起。Plus、Pro、Ultra 的主要差异是模型与生成工具的使用额度、Google 产品集成范围和存储容量，部分权益会因国家、年龄与语言而不同。",
      sectionTitle: "这个套餐适合谁",
      bestForLabel: "适合",
      differenceLabel: "与其他套餐的主要区别",
      availabilityLabel: "订阅前注意",
      sourceLabel: "查看 Google AI 官方套餐说明",
      plans: {
        plus: {
          bestFor:
            "希望以较低成本提高 Gemini、NotebookLM 和 Google 应用内 AI 使用额度的个人用户。",
          difference:
            "这是 Google AI 的个人入门付费层，提供更多 Gemini 与 Flow 使用量和云存储，但额度低于 Pro 与 Ultra。",
          sourceUrl: "https://one.google.com/about/google-ai-plans/",
        },
        pro: {
          bestFor:
            "经常使用 Gemini 深度研究、Google 应用和生成式工具，并需要更高额度的个人用户。",
          difference:
            "包含 Plus 的主要能力，并扩大 Gemini、Flow、AI Studio 与 NotebookLM 的额度，同时提供更大的云存储。",
          sourceUrl: "https://one.google.com/about/google-ai-plans/",
        },
        ultra: {
          bestFor:
            "需要 Google AI 最高模型额度、Deep Think 等高级能力和大容量云存储的重度专业用户。",
          difference:
            "这是最高个人层级，提供高于 Pro 的模型与生成额度，并包含部分地区限定的高级权益。",
          sourceUrl: "https://one.google.com/about/google-ai-plans/",
        },
      },
    },
    grok: {
      summary:
        "Grok 是 xAI 的对话与创作助手，支持实时网页和 X 搜索、文件分析、语音以及图片和视频生成。SuperGrok 各层级主要按每周使用额度和高级模型访问范围区分，实际动态限制以账号页面为准。",
      sectionTitle: "这个套餐适合谁",
      bestForLabel: "适合",
      differenceLabel: "与其他套餐的主要区别",
      availabilityLabel: "订阅前注意",
      sourceLabel: "查看 xAI 官方套餐说明",
      plans: {
        "super-lite": {
          bestFor:
            "希望比免费版获得更高额度，但使用强度仍以日常问答、搜索和轻量创作为主的个人用户。",
          difference:
            "Lite 是 SuperGrok 的低额度付费层，保留核心应用能力，但可用容量低于标准版与 Heavy。",
          sourceUrl: "https://x.ai/pricing",
        },
        super: {
          bestFor:
            "经常使用 Grok 搜索、专家模式、连接器和图片视频生成，需要稳定较高额度的个人用户。",
          difference:
            "标准 SuperGrok 提供高级模型和更高功能限额，是 Lite 与 Heavy 之间的主流个人层。",
          sourceUrl: "https://x.ai/pricing",
        },
        "super-heavy": {
          bestFor:
            "将 Grok 用作高强度研究、创作或生产工具，并需要个人套餐最高使用容量的用户。",
          difference:
            "Heavy 是个人套餐中的最高容量层，核心差异主要是比标准 SuperGrok 更高的共享使用额度。",
          sourceUrl: "https://x.ai/pricing",
        },
      },
    },
    manus: {
      summary:
        "Manus 是面向研究、报告、网站部署和幻灯片生成等任务的通用智能体。官方当前面向个人的新套餐名称是 Pro；App Store 中仍出现的 Basic 和 Plus 价格可能属于历史会员续订，不能直接视作新用户仍可选择。",
      sectionTitle: "这个套餐适合谁",
      bestForLabel: "适合",
      differenceLabel: "与其他套餐的主要区别",
      availabilityLabel: "可购买性说明",
      sourceLabel: "查看 Manus 官方会员说明",
      plans: {
        basic: {
          bestFor:
            "仍在续订原 Basic 会员，并希望核对历史 App Store 扣费金额的现有用户。",
          difference:
            "官方已将原 Basic 与 Plus 重命名为 Pro，因此这一名称不应再作为当前新用户套餐推广。",
          availabilityNote:
            "此价格更适合作为历史续订参考。新用户请以 Manus 当前定价页中的 Free、Pro 和 Team 方案为准。",
          indexingStatus: "legacy",
          sourceUrl:
            "https://help.manus.im/en/articles/11711111-what-is-the-current-membership-pricing-for-manus",
        },
        pro: {
          bestFor:
            "需要更高月度积分、并发任务、深度研究、网站部署和专业报告生成能力的个人用户。",
          difference:
            "Pro 是当前个人付费主线，官方提供不同积分容量选项；实际价格和积分以当前定价页为准。",
          sourceUrl:
            "https://help.manus.im/en/articles/11711111-what-is-the-current-membership-pricing-for-manus",
        },
        plus: {
          bestFor:
            "仍在续订原 Plus 会员，并希望核对历史 App Store 扣费金额的现有用户。",
          difference:
            "官方已将原 Plus 重命名为 Pro，因此这一名称不应再作为独立的当前套餐解释。",
          availabilityNote:
            "此价格更适合作为历史续订参考。升级或重新订阅时，请以 Manus 当前 Pro 方案为准。",
          indexingStatus: "legacy",
          sourceUrl:
            "https://help.manus.im/en/articles/11711111-what-is-the-current-membership-pricing-for-manus",
        },
      },
    },
    disney: {
      summary:
        "Disney+ 套餐主要按是否插播广告、最高画质、同时观看设备数和离线下载区分。不同国家可能提供不同组合，直播、体育和宣传内容即使在无广告套餐中也可能包含广告，具体权益以当地结算页为准。",
      sectionTitle: "这个套餐适合谁",
      bestForLabel: "适合",
      differenceLabel: "与其他套餐的主要区别",
      availabilityLabel: "订阅前注意",
      sourceLabel: "查看 Disney+ 官方套餐说明",
      plans: {
        "standard-with-ads": {
          bestFor:
            "优先降低月费，可以接受广告，并且不需要离线下载或最高 4K 画质的用户。",
          difference:
            "通常支持最高 1080p 和两台设备同时观看，但包含广告，且多数地区不提供离线下载。",
          sourceUrl:
            "https://www.disneyplus.com/en-nz/explore/what-is-disneyplus",
        },
        standard: {
          bestFor:
            "希望无常规广告观看、支持离线下载，并在价格和画质之间取得平衡的家庭用户。",
          difference:
            "通常提供最高 1080p、两台设备同时观看和下载能力，但低于 Premium 的 4K 与四设备配置。",
          sourceUrl:
            "https://www.disneyplus.com/en-nz/explore/what-is-disneyplus",
        },
        premium: {
          bestFor:
            "需要最高 4K HDR 画质、Dolby Atmos 和更多同时观看设备的家庭用户。",
          difference:
            "Premium 通常提供最高画质、四台设备同时观看及离线下载，是 Disney+ 的最高个人层。",
          sourceUrl:
            "https://www.disneyplus.com/en-nz/explore/what-is-disneyplus",
        },
      },
    },
    "hbo-max": {
      summary:
        "HBO Max 套餐主要按广告、最高画质、同时观看设备数和下载数量区分。部分地区把最高层称为 Premium，另一些地区称为 Platinum；GeoSub 将同等权益归并为一个最高层，避免重复套餐。",
      sectionTitle: "这个套餐适合谁",
      bestForLabel: "适合",
      differenceLabel: "与其他套餐的主要区别",
      availabilityLabel: "订阅前注意",
      sourceLabel: "查看 HBO Max 官方套餐说明",
      plans: {
        "basic-with-ads": {
          bestFor:
            "希望以最低月费观看 HBO Max，可以接受广告且不需要离线下载的用户。",
          difference:
            "通常支持最高 1080p 和两台设备同时观看，但包含广告，也不提供标准套餐的离线下载额度。",
          sourceUrl: "https://help.max.com/US/Answer/Detail/000002547",
        },
        standard: {
          bestFor:
            "希望无常规广告观看、支持离线下载，但不需要最高 4K 画质的家庭或个人用户。",
          difference:
            "通常提供 1080p、两台设备同时观看和约 30 个离线下载，低于 Premium 的最高配置。",
          sourceUrl: "https://help.max.com/US/Answer/Detail/000002547",
        },
        premium: {
          bestFor:
            "需要 4K、Dolby Atmos、更多同时观看设备和更高离线下载额度的家庭用户。",
          difference:
            "通常支持四台设备同时观看和约 100 个下载，是 HBO Max 的最高个人层；部分地区称 Platinum。",
          sourceUrl: "https://help.max.com/US/Answer/Detail/000002547",
        },
      },
    },
  },
  en: {
    chatgpt: {
      summary:
        "ChatGPT is OpenAI's AI assistant for individuals. Paid tiers mainly differ in usage limits, model access, memory and context capacity, and access to advanced tools such as Codex. This page compares verified monthly consumer subscriptions, excluding team plans and API usage.",
      sectionTitle: "Who this plan is for",
      bestForLabel: "Best for",
      differenceLabel: "Main difference",
      availabilityLabel: "Before subscribing",
      sourceLabel: "OpenAI plan guide",
      plans: {
        go: {
          bestFor:
            "Budget-conscious everyday users who want more messages, uploads and image generation than the free tier.",
          difference:
            "An affordable consumer entry tier. It expands common free-tier limits, while deeper reasoning and longer workflows are better suited to Plus or Pro.",
          sourceUrl: "https://openai.com/index/introducing-chatgpt-go/",
        },
        plus: {
          bestFor:
            "Individuals who regularly use ChatGPT for writing, study, research, data analysis or deeper reasoning.",
          difference:
            "Higher message, upload, memory and context limits than Go, with broader access to advanced models and Codex.",
          sourceUrl: "https://openai.com/index/introducing-chatgpt-go/",
        },
        "pro-5x": {
          bestFor:
            "Professional individuals whose usage frequently exceeds Plus but who do not need the highest allowance.",
          difference:
            "Shares the Pro capability set with the 20x tier, with an allowance positioned at roughly five times Plus. Account-level limits remain authoritative.",
          sourceUrl:
            "https://help.openai.com/en/articles/9793128-what-is-chatgpt-pro",
        },
        pro: {
          bestFor:
            "Heavy daily users of advanced models, long context or Codex who need the highest individual allowance.",
          difference:
            "The higher-capacity Pro tier, described as roughly twenty times the Plus allowance. Features and dynamic limits remain subject to the account plan page.",
          sourceUrl:
            "https://help.openai.com/en/articles/9793128-what-is-chatgpt-pro",
        },
      },
    },
    claude: {
      summary:
        "Claude is Anthropic's AI assistant for writing, analysis, research and coding. Individual paid tiers mainly differ by capacity: Pro supports regular use, while Max 5x and Max 20x are designed for sustained professional workloads.",
      sectionTitle: "Who this plan is for",
      bestForLabel: "Best for",
      differenceLabel: "Main difference",
      availabilityLabel: "Before subscribing",
      sourceLabel: "Anthropic plan guide",
      plans: {
        pro: {
          bestFor:
            "Individuals who use Claude regularly but do not require high-capacity access throughout the day.",
          difference:
            "The standard paid individual tier, with more capacity than Free. Max is intended for users who repeatedly reach Pro limits.",
          sourceUrl:
            "https://support.anthropic.com/en/articles/11049762-choosing-a-claude-ai-plan",
        },
        "max-5x": {
          bestFor:
            "Professionals handling long documents, code or research tasks who frequently exhaust Pro capacity.",
          difference:
            "Positioned at roughly five times Pro usage capacity, for frequent work below the highest Max 20x allowance.",
          sourceUrl:
            "https://support.anthropic.com/en/articles/11049762-choosing-a-claude-ai-plan",
        },
        "max-20x": {
          bestFor:
            "Heavy users who rely on Claude as a primary production tool and need the highest individual capacity.",
          difference:
            "Positioned at roughly twenty times Pro usage capacity, making it the highest-capacity individual tier.",
          sourceUrl:
            "https://support.anthropic.com/en/articles/11049762-choosing-a-claude-ai-plan",
        },
      },
    },
    netflix: {
      summary:
        "Netflix plans generally differ by video quality, simultaneous streams and download devices, but names, benefits and new-customer availability vary by country. This page compares verified App Store renewal prices and explains availability separately.",
      sectionTitle: "Who this plan is for",
      bestForLabel: "Best for",
      differenceLabel: "Main difference",
      availabilityLabel: "Availability note",
      sourceLabel: "Netflix plan guide",
      plans: {
        basic: {
          bestFor:
            "Existing subscribers retaining a legacy lower-cost plan with modest viewing needs.",
          difference:
            "Basic is generally a legacy entry tier. Renewal pricing may still appear in some regions even when new customers cannot select it.",
          availabilityNote:
            "An App Store renewal price does not prove that a new account can choose Basic in that country. Check Netflix signup or the account Change Plan page.",
          indexingStatus: "legacy",
          sourceUrl: "https://help.netflix.com/en/node/412",
        },
        standard: {
          bestFor:
            "Households or individuals seeking a balance of price, video quality and simultaneous viewing.",
          difference:
            "Typically offers better quality and more simultaneous viewing than an entry tier, while remaining below Premium's highest configuration.",
          sourceUrl: "https://help.netflix.com/en/node/412",
        },
        premium: {
          bestFor:
            "Households prioritizing the highest available picture quality and more simultaneous viewing devices.",
          difference:
            "Usually Netflix's highest consumer configuration and highest monthly price. Resolution and device support still depend on content, hardware and region.",
          sourceUrl: "https://help.netflix.com/en/node/412",
        },
      },
    },
    gemini: {
      summary:
        "Google AI plans combine Gemini models, AI features inside Google apps and cloud storage. Plus, Pro and Ultra mainly differ in model and generation limits, product integrations and storage. Some benefits vary by country, age and language.",
      sectionTitle: "Who this plan is for",
      bestForLabel: "Best for",
      differenceLabel: "Main difference",
      availabilityLabel: "Before subscribing",
      sourceLabel: "Google AI plan guide",
      plans: {
        plus: {
          bestFor:
            "Individuals seeking an affordable increase in Gemini, NotebookLM and Google app AI usage.",
          difference:
            "Google AI's entry paid consumer tier, with more Gemini and Flow access plus cloud storage, below Pro and Ultra limits.",
          sourceUrl: "https://one.google.com/about/google-ai-plans/",
        },
        pro: {
          bestFor:
            "Frequent users of Gemini research, Google apps and generative tools who need expanded capacity.",
          difference:
            "Includes the main Plus benefits with higher Gemini, Flow, AI Studio and NotebookLM limits and more cloud storage.",
          sourceUrl: "https://one.google.com/about/google-ai-plans/",
        },
        ultra: {
          bestFor:
            "Heavy professional users needing Google's highest model limits, advanced capabilities and large cloud storage.",
          difference:
            "The highest individual tier, with more capacity than Pro and additional advanced benefits that may be region limited.",
          sourceUrl: "https://one.google.com/about/google-ai-plans/",
        },
      },
    },
    grok: {
      summary:
        "Grok is xAI's assistant for conversation and creation, with real-time web and X search, file analysis, voice, image and video generation. SuperGrok tiers mainly differ by shared weekly usage capacity and advanced model access.",
      sectionTitle: "Who this plan is for",
      bestForLabel: "Best for",
      differenceLabel: "Main difference",
      availabilityLabel: "Before subscribing",
      sourceLabel: "xAI plan guide",
      plans: {
        "super-lite": {
          bestFor:
            "Everyday users who want more capacity than Free for search, questions and light creative work.",
          difference:
            "The lower-capacity paid SuperGrok tier, retaining core app capabilities below standard SuperGrok and Heavy limits.",
          sourceUrl: "https://x.ai/pricing",
        },
        super: {
          bestFor:
            "Frequent users of Grok search, Expert, connectors and image or video generation who need higher limits.",
          difference:
            "The mainstream paid individual tier, with frontier model access and higher feature limits between Lite and Heavy.",
          sourceUrl: "https://x.ai/pricing",
        },
        "super-heavy": {
          bestFor:
            "Heavy research and creative users who rely on Grok as a production tool and need maximum individual capacity.",
          difference:
            "The highest-capacity individual tier, primarily distinguished by a larger shared usage allowance than SuperGrok.",
          sourceUrl: "https://x.ai/pricing",
        },
      },
    },
    manus: {
      summary:
        "Manus is a general-purpose agent for research, reports, website deployment and slide generation. Its current individual paid line is named Pro. Basic and Plus prices still found in the App Store may be legacy renewals rather than plans available to new customers.",
      sectionTitle: "Who this plan is for",
      bestForLabel: "Best for",
      differenceLabel: "Main difference",
      availabilityLabel: "Availability note",
      sourceLabel: "Manus membership guide",
      plans: {
        basic: {
          bestFor:
            "Existing members retaining the former Basic subscription and checking a historical App Store renewal charge.",
          difference:
            "Manus says the former Basic and Plus plans were renamed Pro, so Basic should not be promoted as a current new-customer tier.",
          availabilityNote:
            "Treat this as legacy renewal evidence. New customers should use the current Free, Pro and Team offers on the Manus pricing page.",
          indexingStatus: "legacy",
          sourceUrl:
            "https://help.manus.im/en/articles/11711111-what-is-the-current-membership-pricing-for-manus",
        },
        pro: {
          bestFor:
            "Individuals needing more credits, concurrent tasks, deep research, website deployment and professional report generation.",
          difference:
            "Pro is the current individual paid line with multiple credit capacities. Current pricing and credits remain subject to the live pricing page.",
          sourceUrl:
            "https://help.manus.im/en/articles/11711111-what-is-the-current-membership-pricing-for-manus",
        },
        plus: {
          bestFor:
            "Existing members retaining the former Plus subscription and checking a historical App Store renewal charge.",
          difference:
            "Manus says the former Plus plan was renamed Pro, so Plus should not be described as a separate current offer.",
          availabilityNote:
            "Treat this as legacy renewal evidence. Upgrades and new subscriptions should follow the current Manus Pro offers.",
          indexingStatus: "legacy",
          sourceUrl:
            "https://help.manus.im/en/articles/11711111-what-is-the-current-membership-pricing-for-manus",
        },
      },
    },
    disney: {
      summary:
        "Disney+ plans mainly differ by ads, maximum video quality, simultaneous streams and offline downloads. Country offerings vary, and live, sports or promotional content may still contain ads even on otherwise ad-free tiers.",
      sectionTitle: "Who this plan is for",
      bestForLabel: "Best for",
      differenceLabel: "Main difference",
      availabilityLabel: "Before subscribing",
      sourceLabel: "Disney+ plan guide",
      plans: {
        "standard-with-ads": {
          bestFor:
            "Price-conscious viewers who accept ads and do not need offline downloads or the highest 4K quality.",
          difference:
            "Typically supports up to 1080p and two simultaneous streams, with ads and no offline downloads in most markets.",
          sourceUrl:
            "https://www.disneyplus.com/en-nz/explore/what-is-disneyplus",
        },
        standard: {
          bestFor:
            "Households wanting regular ad-free viewing and downloads while balancing price and picture quality.",
          difference:
            "Typically includes up to 1080p, two simultaneous streams and downloads, below Premium's 4K and four-stream configuration.",
          sourceUrl:
            "https://www.disneyplus.com/en-nz/explore/what-is-disneyplus",
        },
        premium: {
          bestFor:
            "Households wanting the highest 4K HDR quality, Dolby Atmos and more simultaneous viewing devices.",
          difference:
            "Typically provides the highest picture quality, four simultaneous streams and downloads as Disney+'s top consumer tier.",
          sourceUrl:
            "https://www.disneyplus.com/en-nz/explore/what-is-disneyplus",
        },
      },
    },
    "hbo-max": {
      summary:
        "HBO Max plans mainly differ by ads, maximum video quality, simultaneous streams and download allowances. The highest tier is called Premium in some markets and Platinum in others; GeoSub groups equivalent benefits together.",
      sectionTitle: "Who this plan is for",
      bestForLabel: "Best for",
      differenceLabel: "Main difference",
      availabilityLabel: "Before subscribing",
      sourceLabel: "HBO Max plan guide",
      plans: {
        "basic-with-ads": {
          bestFor:
            "Viewers seeking the lowest monthly price who accept ads and do not need offline downloads.",
          difference:
            "Typically supports up to 1080p and two simultaneous streams, with ads and without Standard's download allowance.",
          sourceUrl: "https://help.max.com/US/Answer/Detail/000002547",
        },
        standard: {
          bestFor:
            "Households wanting regular ad-free viewing and downloads without requiring the highest 4K tier.",
          difference:
            "Typically offers 1080p, two simultaneous streams and about 30 downloads, below Premium's maximum configuration.",
          sourceUrl: "https://help.max.com/US/Answer/Detail/000002547",
        },
        premium: {
          bestFor:
            "Households needing 4K, Dolby Atmos, more simultaneous streams and a larger offline download allowance.",
          difference:
            "Typically supports four simultaneous streams and about 100 downloads. This top tier is called Platinum in some markets.",
          sourceUrl: "https://help.max.com/US/Answer/Detail/000002547",
        },
      },
    },
  },
};

export function getProductEditorialContent(
  locale: SiteLocale,
  productSlug: string,
  planSlug: string,
) {
  if (locale !== "zh" && locale !== "en") return null;

  const product = editorialContent[locale][productSlug];
  if (!product) return null;

  const plan = product.plans[planSlug];
  if (!plan) return null;

  return {
    ...product,
    plan,
  };
}

export function getProductEditorialCoverage(
  productSlug: string,
  planSlugs: string[],
) {
  const product = editorialContent.zh[productSlug];

  return {
    summary: product?.summary || null,
    describedPlanCount: product
      ? planSlugs.filter((slug) => Boolean(product.plans[slug])).length
      : 0,
  };
}

export function getPlanEditorialIndexingStatus(
  productSlug: string,
  planSlug: string,
) {
  return (
    editorialContent.zh[productSlug]?.plans[planSlug]?.indexingStatus ||
    "current"
  );
}

export function getProductEditorialCatalog(locale: EditorialLocale) {
  return Object.entries(editorialContent[locale]).flatMap(
    ([productSlug, product]) =>
      Object.entries(product.plans).map(([planSlug, plan]) => ({
        locale,
        productSlug,
        planSlug,
        content: {
          ...product,
          plan,
        },
      })),
  );
}

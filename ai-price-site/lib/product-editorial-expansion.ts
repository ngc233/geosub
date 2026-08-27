import type { ProductEditorialContent } from "./product-editorial-content";
import type { SiteLocale } from "./site-locale";

type EditorialExpansion = Record<string, ProductEditorialContent>;

const zh: EditorialExpansion = {
  captions: {
    summary:
      "Captions 是面向短视频与社交内容的 AI 创作工具，覆盖字幕、翻译、配音和自动剪辑。App Store 内的套餐名称可能与官网当前的 Lite、Pro、Max 或 Scale 分层不同，因此本页按实际可购买的应用内套餐比较，不把不同平台的名称强行等同。",
    sectionTitle: "这个套餐适合谁",
    bestForLabel: "适合",
    differenceLabel: "与其他套餐的主要区别",
    availabilityLabel: "订阅前注意",
    sourceLabel: "查看 Captions 官方套餐说明",
    plans: {
      basic: {
        bestFor:
          "主要需要自动字幕、基础视频处理和轻量 AI 创作，希望先控制月费的个人用户。",
        difference:
          "Basic 是较低价的 App Store 入口层，通常比 Max 提供更少的高级模型、自动剪辑能力和生成额度。",
        availabilityNote:
          "Basic 属于应用内显示名称，官网套餐命名和权益可能不同；付款前应以当前账号内的功能清单为准。",
        sourceUrl: "https://help.captions.ai/docs/subscriptions",
      },
      max: {
        bestFor:
          "频繁制作社交视频，需要 AI Edit、更多生成模型或更高处理额度的创作者。",
        difference:
          "Max 面向更高频的 AI 视频工作流，通常解锁更广的模型与自动编辑能力，并提高生成和处理额度。",
        availabilityNote:
          "模型、额度和并发能力可能随平台与版本调整，请以应用内 Max 权益页为准。",
        sourceUrl: "https://help.captions.ai/docs/subscriptions",
      },
    },
  },
  crunchyroll: {
    summary:
      "Crunchyroll 付费层主要按同时观看设备数、离线下载和附加会员权益区分。Fan 适合单人串流，Mega Fan 增加多设备和离线功能，Ultimate Fan 则面向设备更多的家庭，但仅在部分市场提供。",
    sectionTitle: "这个套餐适合谁",
    bestForLabel: "适合",
    differenceLabel: "与其他套餐的主要区别",
    availabilityLabel: "订阅前注意",
    sourceLabel: "查看 Crunchyroll 官方会员说明",
    plans: {
      fan: {
        bestFor:
          "主要在一台设备观看动画，不需要离线下载或多人同时观看的个人用户。",
        difference:
          "Fan 提供无广告观看与完整会员片库，但通常只支持一台设备同时串流，也不含离线下载。",
        sourceUrl:
          "https://help.crunchyroll.com/hc/en-us/articles/19133832775956-Why-can-t-I-stream-on-multiple-devices-at-the-same-time",
      },
      "mega-fan": {
        bestFor:
          "需要手机离线下载、跨设备观看，或与家人共享更多同时串流名额的用户。",
        difference:
          "Mega Fan 通常支持四台设备同时观看，并加入离线下载和 Crunchyroll Game Vault 等权益。",
        sourceUrl:
          "https://help.crunchyroll.com/hc/en-us/articles/19133832775956-Why-can-t-I-stream-on-multiple-devices-at-the-same-time",
      },
      "ultimate-fan": {
        bestFor:
          "设备较多、需要最多同时串流名额，并重视商店或会员附加权益的重度用户。",
        difference:
          "Ultimate Fan 通常把同时串流提高到六台，并增加更高等级的会员权益。",
        availabilityNote:
          "Ultimate Fan 目前主要面向美国市场；其他地区可能只提供 Fan 与 Mega Fan。",
        sourceUrl:
          "https://help.crunchyroll.com/hc/en-us/articles/19133832775956-Why-can-t-I-stream-on-multiple-devices-at-the-same-time",
      },
    },
  },
  deezer: {
    summary:
      "Deezer 个人付费套餐提供无广告音乐、离线播放和高音质功能。Premium 面向单个账号，Family 则为同一家庭提供多个独立账号；地区价格、试用和年付选项可能不同。",
    sectionTitle: "这个套餐适合谁",
    bestForLabel: "适合",
    differenceLabel: "与其他套餐的主要区别",
    availabilityLabel: "订阅前注意",
    sourceLabel: "查看 Deezer 官方套餐说明",
    plans: {
      premium: {
        bestFor:
          "只需要一个个人音乐账号，希望无广告、离线收听并使用高音质播放的用户。",
        difference:
          "Premium 服务一个独立账号；如果多位家庭成员需要各自的收藏与推荐，应考虑 Family。",
        sourceUrl: "https://www.deezer.com/en/offers",
      },
      family: {
        bestFor:
          "希望最多六位家庭成员分别保留歌单、收藏、收听记录和个性化推荐的家庭用户。",
        difference:
          "Family 将 Premium 的核心音乐权益扩展到最多六个独立账号，而不是共享同一个播放档案。",
        availabilityNote:
          "家庭资格、价格、试用与年付选项因国家和结算平台而异。",
        sourceUrl: "https://www.deezer.com/en/offers",
      },
    },
  },
  "kling-ai": {
    summary:
      "Kling AI 是 AI 视频与图像生成工具。付费层通常按月度积分、任务队列、并发能力和高级生成权限区分；这些额度更新较快，因此 GeoSub 只比较可核验的订阅价格，不把某一时点的积分写成长期固定权益。",
    sectionTitle: "这个套餐适合谁",
    bestForLabel: "适合",
    differenceLabel: "与其他套餐的主要区别",
    availabilityLabel: "订阅前注意",
    sourceLabel: "查看 Kling AI 官方会员页",
    plans: {
      standard: {
        bestFor:
          "偶尔生成短视频或图片，希望以较低预算体验付费队列与更多创作额度的个人用户。",
        difference:
          "Standard 是付费入门层，月度积分、并发和优先级通常低于 Pro 与 Premier。",
        availabilityNote:
          "实际积分、模型和任务优先级会调整，请以登录后的会员页为准。",
        sourceUrl: "https://app.klingai.com/global/",
      },
      pro: {
        bestFor:
          "持续制作 AI 视频，需要比 Standard 更多月度额度和更顺畅工作流的创作者。",
        difference:
          "Pro 位于中间层，通常提高月度积分和生产能力，同时保持低于 Premier 的价格。",
        availabilityNote:
          "实际积分、模型和任务优先级会调整，请以登录后的会员页为准。",
        sourceUrl: "https://app.klingai.com/global/",
      },
      premier: {
        bestFor:
          "生成量较高、重视并发和任务优先级，并把 Kling AI 用于稳定生产的专业用户。",
        difference:
          "Premier 是个人订阅中的高额度层，主要价值在更大的创作容量和更高的任务处理能力。",
        availabilityNote:
          "实际积分、模型和任务优先级会调整，请以登录后的会员页为准。",
        sourceUrl: "https://app.klingai.com/global/",
      },
    },
  },
  kimi: {
    summary:
      "Kimi 是月之暗面推出的 AI 助手，覆盖对话、文档处理、深度研究、演示文稿和编程等任务。GeoSub 在这里比较 Apple App Store 可核验的 Moderato、Allegretto、Allegro 与 Vivace 周期性月度订阅；Kimi 官网与 App Store 的套餐名单可能不同，因此不把 Web 端权益直接套用到应用内购。",
    sectionTitle: "这个套餐适合谁",
    bestForLabel: "适合",
    differenceLabel: "与其他套餐的主要区别",
    availabilityLabel: "订阅前注意",
    sourceLabel: "查看 Kimi 官方套餐或 App Store 说明",
    plans: {
      moderato: {
        bestFor:
          "希望从 Kimi 较低价的周期性 App Store 会员开始，并主要用于日常对话、文档和轻量研究的个人用户。",
        difference:
          "在 GeoSub 当前 App Store 数据中，Moderato 是四个周期性月度档位的最低价层；Kimi 官网将同名档位定位为效率升级。",
        availabilityNote:
          "官网与 App Store 的套餐名单并不完全一致，实际额度和功能应以付款前的应用内权益页为准。",
        sourceUrl: "https://www.kimi.com/help/membership/membership-pricing",
      },
      allegretto: {
        bestFor:
          "更频繁使用 Kimi 处理专业研究、并行 Agent 或编程任务，并愿意为更高使用容量付费的个人用户。",
        difference:
          "Kimi 官网将 Allegretto 定位为专业档，并公开说明其额度和 Agent 能力高于 Moderato；应用内购的具体权益仍需单独核对。",
        availabilityNote:
          "GeoSub 比较的是 App Store 标价，不保证官网与应用内同名套餐在每个地区都具备完全相同的权益。",
        sourceUrl: "https://www.kimi.com/help/membership/membership-pricing",
      },
      allegro: {
        bestFor:
          "高频使用 Kimi 的研究、Agent、文档和编程能力，并需要更大额度或更强并行能力的重度个人用户。",
        difference:
          "Kimi 官网将 Allegro 定位为全能高阶档，公开权益高于 Allegretto；GeoSub 只确认 App Store 价格，不把动态额度写成固定承诺。",
        availabilityNote:
          "额度按实际用量消耗且可能调整，订阅前应在当前账号的应用内套餐页确认功能、限制和续费价格。",
        sourceUrl: "https://www.kimi.com/help/membership/membership-pricing",
      },
      vivace: {
        bestFor:
          "仅适合在 App Store 订阅页仍能看到 Vivace，并已确认其当期权益确实符合高强度使用需求的用户。",
        difference:
          "Vivace 是 GeoSub 当前 App Store 周期性月度套餐中的最高价层，但 Kimi 现行公开帮助中心未提供它的权益对照，因此不能推断固定额度或功能。",
        availabilityNote:
          "Vivace 可能是渠道或历史差异套餐；若应用内没有清晰列出权益，不应只因价格更高就假定功能更多。",
        sourceUrl:
          "https://apps.apple.com/us/app/kimi-kimi-k3-is-live/id6474233312",
      },
    },
  },
  "leonardo-ai": {
    summary:
      "Leonardo AI 是图像与视频生成平台。个人付费层主要按 Fast Tokens、并发生成、私密创作和 Relaxed Generation 权益区分，适合从日常视觉创作到高频专业生产的不同用户。",
    sectionTitle: "这个套餐适合谁",
    bestForLabel: "适合",
    differenceLabel: "与其他套餐的主要区别",
    availabilityLabel: "订阅前注意",
    sourceLabel: "查看 Leonardo AI 官方价格",
    plans: {
      essential: {
        bestFor:
          "需要私密生成和稳定月度额度，但创作频率仍以个人项目为主的用户。",
        difference:
          "Essential 是个人付费入门层，提供较低的 Fast Tokens 和并发数量，适合可预测的轻中度使用。",
        sourceUrl: "https://leonardo.ai/pricing",
      },
      premium: {
        bestFor:
          "持续制作图片、需要更多并发任务，并希望在快速额度外继续使用宽松图像生成的创作者。",
        difference:
          "Premium 明显提高 Fast Tokens 与并发能力，并加入 Relaxed Image Generation，适合更连续的生产。",
        sourceUrl: "https://leonardo.ai/pricing",
      },
      ultimate: {
        bestFor:
          "同时生产大量图片和视频，需要最高个人额度、更多并发与宽松生成能力的专业用户。",
        difference:
          "Ultimate 是最高个人层，提供最大的 Fast Tokens、并发能力，并扩展宽松图像与视频生成。",
        sourceUrl: "https://leonardo.ai/pricing",
      },
    },
  },
  podimo: {
    summary:
      "Podimo 提供独家播客、有声书和开放 RSS 节目。Premium 与 Premium Plus 的核心差异通常是每月可收听有声书的额度，但套餐名称和具体小时数会随国家变化。",
    sectionTitle: "这个套餐适合谁",
    bestForLabel: "适合",
    differenceLabel: "与其他套餐的主要区别",
    availabilityLabel: "订阅前注意",
    sourceLabel: "查看 Podimo 官方订阅说明",
    plans: {
      premium: {
        bestFor:
          "以独家播客为主、偶尔收听有声书，同时希望控制每月订阅支出的用户。",
        difference:
          "Premium 通常包含完整播客权益和较低的有声书月度额度，低于 Premium Plus。",
        availabilityNote:
          "有声书小时数、试用和套餐名称因国家而异，请以当地 Podimo 结算页为准。",
        sourceUrl:
          "https://support.podimo.com/hc/en-001/articles/35005460459025-Subscription-types",
      },
      "premium-plus": {
        bestFor:
          "经常收听有声书，需要比 Premium 更高月度收听额度的重度用户。",
        difference:
          "Premium Plus 保留播客权益，并通常提供更高的有声书月度额度。",
        availabilityNote:
          "有声书小时数、试用和套餐名称因国家而异，请以当地 Podimo 结算页为准。",
        sourceUrl:
          "https://support.podimo.com/hc/en-001/articles/35005460459025-Subscription-types",
      },
    },
  },
  poe: {
    summary:
      "Poe 将多个公司的 AI 模型与社区机器人集中在一个界面中。付费层主要按计算点数和可用容量区分，具体模型消耗会变化，因此选择时应同时看月费、点数和自己常用模型的成本。",
    sectionTitle: "这个套餐适合谁",
    bestForLabel: "适合",
    differenceLabel: "与其他套餐的主要区别",
    availabilityLabel: "订阅前注意",
    sourceLabel: "查看 Poe 官方购买说明",
    plans: {
      basic: {
        bestFor:
          "希望用一个账号轻量尝试多个 AI 模型，并且日常计算点消耗较低的用户。",
        difference:
          "Basic 是较低容量的付费入口，重点是以较低月费获得更多计算点，而不是固定无限使用某个模型。",
        availabilityNote:
          "点数额度、模型单次成本和平台可售套餐会变化，请以 Poe 当前购买页为准。",
        sourceUrl:
          "https://help.poe.com/hc/en-us/articles/19945140063636-Poe-Purchases-FAQs",
      },
      plus: {
        bestFor:
          "频繁使用高成本模型、长上下文或媒体生成，需要更高计算点容量的用户。",
        difference:
          "Plus 提供比 Basic 更高的使用容量，适合研究、编程和媒体生成等消耗较大的工作流。",
        availabilityNote:
          "点数额度、模型单次成本和平台可售套餐会变化，请以 Poe 当前购买页为准。",
        sourceUrl:
          "https://help.poe.com/hc/en-us/articles/19945140063636-Poe-Purchases-FAQs",
      },
    },
  },
  viki: {
    summary:
      "Rakuten Viki 主要提供亚洲电视剧与综艺。Standard 面向单人高清观看，Plus 提高画质和同时串流数量，并为部分内容提供离线下载；具体片库受地区授权影响。",
    sectionTitle: "这个套餐适合谁",
    bestForLabel: "适合",
    differenceLabel: "与其他套餐的主要区别",
    availabilityLabel: "订阅前注意",
    sourceLabel: "查看 Viki 官方套餐说明",
    plans: {
      standard: {
        bestFor:
          "主要由一人观看、720p 已足够，不需要多设备同时播放或离线下载的用户。",
        difference:
          "Standard 提供无广告会员片库和最高 720p，通常只支持一台设备同时串流。",
        availabilityNote:
          "节目授权和可观看地区会变化，购买会员不代表所有内容在当地可用。",
        sourceUrl:
          "https://support.viki.com/hc/en-us/articles/115011439408-What-Are-the-Viki-Pass-Plans-Available",
      },
      plus: {
        bestFor:
          "希望 1080p、更适合家庭的多设备同时观看，以及部分内容离线下载的用户。",
        difference:
          "Plus 通常把画质提高到 1080p、支持四台设备同时串流，并加入部分内容的离线下载。",
        availabilityNote:
          "Plus、离线下载和具体节目可能只在部分地区提供。",
        sourceUrl:
          "https://support.viki.com/hc/en-us/articles/115011439408-What-Are-the-Viki-Pass-Plans-Available",
      },
    },
  },
  "youtube-premium": {
    summary:
      "YouTube 的付费层分为价格更低的 Premium Lite，以及包含完整无广告、后台播放、下载和 YouTube Music Premium 的个人与家庭套餐。Lite 的广告和功能范围不同，不能视为完整 Premium 的低价复制。",
    sectionTitle: "这个套餐适合谁",
    bestForLabel: "适合",
    differenceLabel: "与其他套餐的主要区别",
    availabilityLabel: "订阅前注意",
    sourceLabel: "查看 YouTube 官方会员说明",
    plans: {
      lite: {
        bestFor:
          "主要观看普通长视频，希望减少广告，并不需要 YouTube Music Premium 的用户。",
        difference:
          "Premium Lite 为多数非音乐视频提供较少广告，并逐步支持后台播放和下载；音乐、Shorts、搜索与浏览位置仍可能出现广告。",
        availabilityNote:
          "Lite 只在部分国家提供，功能上线进度也可能因账号和地区不同。",
        sourceUrl:
          "https://support.google.com/youtube/answer/15968883?hl=en-EN",
      },
      individual: {
        bestFor:
          "需要完整无广告体验、后台播放、离线下载和 YouTube Music Premium 的单个用户。",
        difference:
          "Individual 提供一个账号的完整 Premium 权益，比 Lite 覆盖更多内容类型并包含 Music Premium。",
        sourceUrl: "https://support.google.com/youtube/answer/6308116?hl=en",
      },
      family: {
        bestFor:
          "同住家庭中有多位成员需要各自的 YouTube Premium 与 Music Premium 账号。",
        difference:
          "Family 将完整 Premium 权益扩展给家庭管理员之外最多五位同住成员，并保留各自账号与推荐。",
        availabilityNote:
          "成员必须符合当地年龄和同一家庭住址要求，Google 会定期验证家庭资格。",
        sourceUrl:
          "https://support.google.com/youtube/answer/7507349?hl=en-EN",
      },
    },
  },
};

const en: EditorialExpansion = {
  captions: {
    summary:
      "Captions is an AI creation tool for social video, covering captions, translation, dubbing and automated editing. App Store tier names can differ from the current Lite, Pro, Max and Scale labels on the web, so this page compares the subscriptions actually offered in the app instead of treating unlike platform tiers as identical.",
    sectionTitle: "Who this plan is for",
    bestForLabel: "Best for",
    differenceLabel: "Main difference",
    availabilityLabel: "Before subscribing",
    sourceLabel: "Captions plan guide",
    plans: {
      basic: {
        bestFor:
          "Individuals mainly needing automatic captions, basic video processing and lighter AI creation at a lower monthly cost.",
        difference:
          "Basic is a lower-priced App Store entry tier and generally includes fewer advanced models, automated editing features and generation capacity than Max.",
        availabilityNote:
          "Basic is an in-app label. Web plan names and benefits may differ, so check the current feature list in your account before paying.",
        sourceUrl: "https://help.captions.ai/docs/subscriptions",
      },
      max: {
        bestFor:
          "Creators producing social video frequently who need AI Edit, broader model access or higher processing capacity.",
        difference:
          "Max targets higher-volume AI video workflows, typically unlocking a wider model set, automated editing and greater generation capacity.",
        availabilityNote:
          "Models, limits and concurrency can change by platform and release; confirm the current Max benefits in the app.",
        sourceUrl: "https://help.captions.ai/docs/subscriptions",
      },
    },
  },
  crunchyroll: {
    summary:
      "Crunchyroll paid tiers mainly differ by simultaneous streams, offline viewing and additional membership benefits. Fan suits a single viewer, Mega Fan adds multi-device and offline use, while Ultimate Fan targets larger households but is limited to selected markets.",
    sectionTitle: "Who this plan is for",
    bestForLabel: "Best for",
    differenceLabel: "Main difference",
    availabilityLabel: "Before subscribing",
    sourceLabel: "Crunchyroll membership guide",
    plans: {
      fan: {
        bestFor:
          "Individuals who mainly watch anime on one device and do not need offline viewing or simultaneous household streams.",
        difference:
          "Fan includes ad-free access to the member library, but normally allows one simultaneous stream and does not include offline viewing.",
        sourceUrl:
          "https://help.crunchyroll.com/hc/en-us/articles/19133832775956-Why-can-t-I-stream-on-multiple-devices-at-the-same-time",
      },
      "mega-fan": {
        bestFor:
          "Viewers needing mobile downloads, cross-device use or more simultaneous streams for a household.",
        difference:
          "Mega Fan normally supports four simultaneous streams and adds offline viewing and benefits such as Crunchyroll Game Vault.",
        sourceUrl:
          "https://help.crunchyroll.com/hc/en-us/articles/19133832775956-Why-can-t-I-stream-on-multiple-devices-at-the-same-time",
      },
      "ultimate-fan": {
        bestFor:
          "Heavy users with more devices who want the largest stream allowance and additional store or membership perks.",
        difference:
          "Ultimate Fan normally raises simultaneous streaming to six devices and adds higher-tier membership benefits.",
        availabilityNote:
          "Ultimate Fan is primarily a US offering; many markets only offer Fan and Mega Fan.",
        sourceUrl:
          "https://help.crunchyroll.com/hc/en-us/articles/19133832775956-Why-can-t-I-stream-on-multiple-devices-at-the-same-time",
      },
    },
  },
  deezer: {
    summary:
      "Deezer paid plans provide ad-free music, offline listening and high-quality audio. Premium serves one account, while Family provides separate accounts for a household. Regional pricing, trials and annual billing options can differ.",
    sectionTitle: "Who this plan is for",
    bestForLabel: "Best for",
    differenceLabel: "Main difference",
    availabilityLabel: "Before subscribing",
    sourceLabel: "Deezer plan guide",
    plans: {
      premium: {
        bestFor:
          "One listener wanting an individual music account with no ads, offline listening and high-quality audio.",
        difference:
          "Premium serves one independent account. Households needing separate libraries and recommendations should consider Family.",
        sourceUrl: "https://www.deezer.com/en/offers",
      },
      family: {
        bestFor:
          "Households wanting up to six members to keep separate playlists, favourites and personalised recommendations.",
        difference:
          "Family extends the core Premium music benefits to as many as six independent accounts rather than one shared profile.",
        availabilityNote:
          "Household eligibility, prices, trials and annual plans vary by country and billing platform.",
        sourceUrl: "https://www.deezer.com/en/offers",
      },
    },
  },
  "kling-ai": {
    summary:
      "Kling AI is an AI video and image creation service. Paid tiers generally differ by monthly credits, queues, concurrency and advanced generation access. These allowances change frequently, so GeoSub compares verifiable subscription prices without presenting a temporary credit allocation as a permanent benefit.",
    sectionTitle: "Who this plan is for",
    bestForLabel: "Best for",
    differenceLabel: "Main difference",
    availabilityLabel: "Before subscribing",
    sourceLabel: "Kling AI membership page",
    plans: {
      standard: {
        bestFor:
          "Occasional short video or image creation with a lower budget and a need for more capacity than the free tier.",
        difference:
          "Standard is the paid entry tier, generally offering lower monthly credits, concurrency and queue priority than Pro or Premier.",
        availabilityNote:
          "Credits, models and task priority can change. Confirm current benefits on the signed-in membership page.",
        sourceUrl: "https://app.klingai.com/global/",
      },
      pro: {
        bestFor:
          "Regular creators who need more monthly capacity and a smoother production workflow than Standard.",
        difference:
          "Pro is the middle tier, generally increasing monthly credits and production capacity while costing less than Premier.",
        availabilityNote:
          "Credits, models and task priority can change. Confirm current benefits on the signed-in membership page.",
        sourceUrl: "https://app.klingai.com/global/",
      },
      premier: {
        bestFor:
          "High-volume professional users who value concurrency and queue priority for steady production work.",
        difference:
          "Premier is the high-capacity consumer tier, with its main value in larger creation capacity and stronger task throughput.",
        availabilityNote:
          "Credits, models and task priority can change. Confirm current benefits on the signed-in membership page.",
        sourceUrl: "https://app.klingai.com/global/",
      },
    },
  },
  kimi: {
    summary:
      "Kimi is Moonshot AI's assistant for chat, document work, deep research, presentations and coding. GeoSub compares the recurring monthly Moderato, Allegretto, Allegro and Vivace subscriptions verifiable in Apple's App Store. Kimi's web and App Store line-ups can differ, so web-plan benefits are not automatically assigned to in-app purchases.",
    sectionTitle: "Who this plan is for",
    bestForLabel: "Best for",
    differenceLabel: "Main difference",
    availabilityLabel: "Before subscribing",
    sourceLabel: "Kimi plan or App Store details",
    plans: {
      moderato: {
        bestFor:
          "Individuals starting with a lower-priced recurring Kimi App Store membership for everyday chat, documents and lighter research.",
        difference:
          "Moderato is the lowest-priced of the four recurring monthly tiers in GeoSub's current App Store dataset; Kimi's website positions the same-named tier as a productivity upgrade.",
        availabilityNote:
          "The website and App Store do not always show the same plan line-up. Confirm current allowances and features in the in-app benefit sheet before paying.",
        sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
      },
      allegretto: {
        bestFor:
          "Individuals using Kimi more frequently for professional research, parallel Agent work or coding and willing to pay for greater capacity.",
        difference:
          "Kimi positions Allegretto as a professional tier with more credits and Agent capability than Moderato, while the exact in-app entitlements still require channel-specific confirmation.",
        availabilityNote:
          "GeoSub compares App Store list prices and does not assume that web and in-app plans with the same name have identical benefits in every region.",
        sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
      },
      allegro: {
        bestFor:
          "Heavy individual users who need larger allowances or stronger parallel capacity across Kimi research, Agent, document and coding workflows.",
        difference:
          "Kimi positions Allegro as its all-in-one premium web tier above Allegretto. GeoSub verifies its App Store price but does not present changing credit allowances as permanent promises.",
        availabilityNote:
          "Usage is metered and can change. Confirm features, limits and renewal pricing on the current in-app subscription page before purchase.",
        sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
      },
      vivace: {
        bestFor:
          "Only users who still see Vivace in the App Store subscription sheet and have verified that its current benefits justify the high-intensity use case they need.",
        difference:
          "Vivace is the highest-priced recurring monthly tier in GeoSub's current App Store dataset, but Kimi's current public help center does not provide a Vivace benefit comparison, so fixed features or allowances cannot be inferred.",
        availabilityNote:
          "Vivace may reflect a channel or legacy difference. A higher price alone should not be treated as proof of additional benefits when the in-app sheet is unclear.",
        sourceUrl:
          "https://apps.apple.com/us/app/kimi-kimi-k3-is-live/id6474233312",
      },
    },
  },
  "leonardo-ai": {
    summary:
      "Leonardo AI is an image and video generation platform. Individual paid tiers mainly differ by Fast Tokens, concurrent generations, private creation and Relaxed Generation benefits, serving users from everyday visual creation to high-volume professional production.",
    sectionTitle: "Who this plan is for",
    bestForLabel: "Best for",
    differenceLabel: "Main difference",
    availabilityLabel: "Before subscribing",
    sourceLabel: "Leonardo AI pricing",
    plans: {
      essential: {
        bestFor:
          "Individuals needing private generation and predictable monthly capacity for personal or lighter commercial projects.",
        difference:
          "Essential is the paid individual entry tier, with fewer Fast Tokens and concurrent generations for light-to-moderate use.",
        sourceUrl: "https://leonardo.ai/pricing",
      },
      premium: {
        bestFor:
          "Active image creators needing more concurrent jobs and the ability to keep creating after fast capacity is used.",
        difference:
          "Premium substantially increases Fast Tokens and concurrency and adds Relaxed Image Generation for more continuous work.",
        sourceUrl: "https://leonardo.ai/pricing",
      },
      ultimate: {
        bestFor:
          "Professionals producing larger volumes of images and video who need the highest individual capacity and concurrency.",
        difference:
          "Ultimate is the top individual tier, offering the largest Fast Token allowance, more concurrency and relaxed image and video generation.",
        sourceUrl: "https://leonardo.ai/pricing",
      },
    },
  },
  podimo: {
    summary:
      "Podimo combines exclusive podcasts, audiobooks and open RSS shows. Premium and Premium Plus mainly differ in the monthly audiobook allowance, while plan names and exact listening hours vary by country.",
    sectionTitle: "Who this plan is for",
    bestForLabel: "Best for",
    differenceLabel: "Main difference",
    availabilityLabel: "Before subscribing",
    sourceLabel: "Podimo subscription guide",
    plans: {
      premium: {
        bestFor:
          "Listeners focused on exclusive podcasts who only use audiobooks occasionally and want a lower monthly price.",
        difference:
          "Premium normally includes the full podcast benefits with a lower monthly audiobook allowance than Premium Plus.",
        availabilityNote:
          "Audiobook hours, trials and tier names differ by country. Check the local Podimo checkout page.",
        sourceUrl:
          "https://support.podimo.com/hc/en-001/articles/35005460459025-Subscription-types",
      },
      "premium-plus": {
        bestFor:
          "Frequent audiobook listeners who need a larger monthly listening allowance than Premium.",
        difference:
          "Premium Plus retains the podcast benefits and generally provides a higher monthly audiobook allowance.",
        availabilityNote:
          "Audiobook hours, trials and tier names differ by country. Check the local Podimo checkout page.",
        sourceUrl:
          "https://support.podimo.com/hc/en-001/articles/35005460459025-Subscription-types",
      },
    },
  },
  poe: {
    summary:
      "Poe brings models and community bots from multiple AI providers into one interface. Paid tiers mainly differ by compute points and usable capacity. Because model costs change, compare the monthly price, included points and the cost of the models you actually use.",
    sectionTitle: "Who this plan is for",
    bestForLabel: "Best for",
    differenceLabel: "Main difference",
    availabilityLabel: "Before subscribing",
    sourceLabel: "Poe purchase guide",
    plans: {
      basic: {
        bestFor:
          "Light users who want to try several AI models through one account with relatively modest compute use.",
        difference:
          "Basic is the lower-capacity paid entry tier, providing additional compute points rather than unlimited use of a fixed model.",
        availabilityNote:
          "Point allowances, per-model costs and available tiers can change by platform and account. Check Poe's current purchase page.",
        sourceUrl:
          "https://help.poe.com/hc/en-us/articles/19945140063636-Poe-Purchases-FAQs",
      },
      plus: {
        bestFor:
          "Frequent users of higher-cost models, long context or media generation who need a larger compute-point allowance.",
        difference:
          "Plus provides more usable capacity than Basic for heavier research, coding and media-generation workflows.",
        availabilityNote:
          "Point allowances, per-model costs and available tiers can change by platform and account. Check Poe's current purchase page.",
        sourceUrl:
          "https://help.poe.com/hc/en-us/articles/19945140063636-Poe-Purchases-FAQs",
      },
    },
  },
  viki: {
    summary:
      "Rakuten Viki focuses on Asian dramas and variety shows. Standard is designed for one-person HD viewing, while Plus raises video quality and simultaneous streams and adds offline access for selected titles. The catalogue remains subject to regional licensing.",
    sectionTitle: "Who this plan is for",
    bestForLabel: "Best for",
    differenceLabel: "Main difference",
    availabilityLabel: "Before subscribing",
    sourceLabel: "Viki plan guide",
    plans: {
      standard: {
        bestFor:
          "One viewer who is comfortable with 720p and does not need multiple simultaneous streams or offline viewing.",
        difference:
          "Standard includes the ad-free member library at up to 720p and normally supports one simultaneous stream.",
        availabilityNote:
          "Title licensing changes by market, and membership does not guarantee that every show is available locally.",
        sourceUrl:
          "https://support.viki.com/hc/en-us/articles/115011439408-What-Are-the-Viki-Pass-Plans-Available",
      },
      plus: {
        bestFor:
          "Viewers wanting 1080p, more household-friendly simultaneous streaming and offline access for selected titles.",
        difference:
          "Plus normally raises quality to 1080p, supports four simultaneous streams and adds offline viewing for selected content.",
        availabilityNote:
          "Plus, offline viewing and individual titles may only be available in selected regions.",
        sourceUrl:
          "https://support.viki.com/hc/en-us/articles/115011439408-What-Are-the-Viki-Pass-Plans-Available",
      },
    },
  },
  "youtube-premium": {
    summary:
      "YouTube offers the lower-priced Premium Lite alongside full Individual and Family memberships. Full Premium includes ad-free viewing, background play, downloads and YouTube Music Premium. Lite has a narrower ad and feature scope and is not simply a discounted copy of full Premium.",
    sectionTitle: "Who this plan is for",
    bestForLabel: "Best for",
    differenceLabel: "Main difference",
    availabilityLabel: "Before subscribing",
    sourceLabel: "YouTube membership guide",
    plans: {
      lite: {
        bestFor:
          "People who mainly watch regular long-form videos, want fewer ads and do not need YouTube Music Premium.",
        difference:
          "Premium Lite provides fewer ads on most non-music videos and is adding background play and downloads, while ads may remain on music, Shorts, search and browsing surfaces.",
        availabilityNote:
          "Lite is only sold in selected countries, and feature rollout can vary by account and region.",
        sourceUrl:
          "https://support.google.com/youtube/answer/15968883?hl=en-EN",
      },
      individual: {
        bestFor:
          "One person wanting the full ad-free experience, background play, offline downloads and YouTube Music Premium.",
        difference:
          "Individual gives one account the complete Premium benefits, covering more content than Lite and including Music Premium.",
        sourceUrl: "https://support.google.com/youtube/answer/6308116?hl=en",
      },
      family: {
        bestFor:
          "A household where several people need separate YouTube Premium and Music Premium accounts.",
        difference:
          "Family extends full Premium benefits to the manager and up to five additional household members while keeping separate accounts and recommendations.",
        availabilityNote:
          "Members must meet local age and same-household requirements, which Google may verify periodically.",
        sourceUrl:
          "https://support.google.com/youtube/answer/7507349?hl=en-EN",
      },
    },
  },
};

type AdditionalEditorialLocale = Exclude<SiteLocale, "zh" | "en">;

export const localizedEditorialContent: Record<
  AdditionalEditorialLocale,
  Record<string, ProductEditorialContent>
> = {
  "zh-tw": {
    kimi: {
      summary:
        "Kimi 是月之暗面推出的 AI 助手，涵蓋對話、文件處理、深度研究、簡報和程式設計等任務。GeoSub 在這裡比較 Apple App Store 可核驗的 Moderato、Allegretto、Allegro 與 Vivace 週期性月度訂閱；Kimi 官網與 App Store 的方案名單可能不同，因此不會把 Web 端權益直接套用到 App 內購買。",
      sectionTitle: "這個方案適合誰",
      bestForLabel: "適合",
      differenceLabel: "與其他方案的主要差異",
      availabilityLabel: "訂閱前注意",
      sourceLabel: "Kimi 官方方案",
      plans: {
        moderato: {
          bestFor:
            "已超出免費版用量，希望更穩定地處理日常對話、文件和一般研究，又不需要最高額度的個人使用者。",
          difference:
            "Kimi 官網把 Moderato 定位為生產力升級層；App Store 內購的實際權益和動態額度仍須以目前帳號顯示為準。",
          availabilityNote:
            "Kimi 官網與 App Store 可能提供不同方案。訂閱前請確認 App 內購買頁的功能、限制和續訂價格。",
          sourceUrl: "https://www.kimi.com/help/membership/membership-pricing",
        },
        allegretto: {
          bestFor:
            "經常進行深度研究、長文件分析、簡報製作或程式設計，需要比 Moderato 更高使用量的專業使用者。",
          difference:
            "Kimi 官網把 Allegretto 定位為專業層，通常提供更高容量；App Store 內購的具體額度仍可能因帳號和渠道而異。",
          availabilityNote:
            "不要只依方案名稱推定 Web 與 App Store 權益完全一致；請以目前 App 內購買頁為準。",
          sourceUrl: "https://www.kimi.com/help/membership/membership-pricing",
        },
        allegro: {
          bestFor:
            "把 Kimi 當作高強度核心工作工具，並已確認需要更高模型與任務容量的個人使用者。",
          difference:
            "Kimi 官網把 Allegro 定位為高階完整方案，容量高於 Allegretto；實際 App Store 權益和動態限制仍須個別核對。",
          availabilityNote:
            "用量按實際消耗計算且可能調整。訂閱前請在目前帳號的 App 內方案頁確認功能、限制和續訂價格。",
          sourceUrl: "https://www.kimi.com/help/membership/membership-pricing",
        },
        vivace: {
          bestFor:
            "僅適合仍能在 App Store 訂閱頁看到 Vivace，並已確認當期權益確實符合高強度需求的使用者。",
          difference:
            "Vivace 是 GeoSub 目前 App Store 週期性月度資料中的最高價層，但 Kimi 現行公開說明沒有提供其權益對照，因此不能推定固定功能或額度。",
          availabilityNote:
            "Vivace 可能反映渠道或歷史差異；若 App 內頁面沒有清楚列出權益，不應只因價格較高就假定功能更多。",
          sourceUrl:
            "https://apps.apple.com/us/app/kimi-kimi-k3-is-live/id6474233312",
        },
      },
    },
  },
  ja: {
    kimi: {
      summary:
        "Kimi は Moonshot AI の AI アシスタントで、対話、文書処理、ディープリサーチ、プレゼンテーション、コーディングなどに対応します。GeoSub では Apple App Store で確認できる Moderato、Allegretto、Allegro、Vivace の月額サブスクリプションを比較します。Web 版と App Store 版ではプラン構成が異なる場合があるため、Web 版の特典をアプリ内課金に自動的には適用しません。",
      sectionTitle: "このプランが向いている人",
      bestForLabel: "おすすめの利用者",
      differenceLabel: "他のプランとの主な違い",
      availabilityLabel: "登録前の確認事項",
      sourceLabel: "Kimi 公式プラン",
      plans: {
        moderato: {
          bestFor:
            "無料枠では足りず、日常の対話、文書処理、一般的な調査を安定して使いたいものの、最上位の容量までは不要な個人利用者。",
          difference:
            "Kimi の公式ヘルプでは Moderato を生産性向上向けの層と位置付けています。App Store 版の具体的な特典や動的上限は、現在のアカウント画面で確認する必要があります。",
          availabilityNote:
            "Web 版と App Store 版では提供プランが異なる場合があります。購入前にアプリ内の機能、制限、更新価格を確認してください。",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        allegretto: {
          bestFor:
            "ディープリサーチ、長文書の分析、スライド作成、コーディングを頻繁に行い、Moderato より高い使用量が必要な専門ユーザー。",
          difference:
            "公式ヘルプでは Allegretto をプロ向けの層と位置付けています。App Store 版の実際の容量は、アカウントや販売チャネルによって異なる場合があります。",
          availabilityNote:
            "プラン名だけで Web 版と App Store 版の特典が同一だと判断せず、現在のアプリ内課金画面を確認してください。",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        allegro: {
          bestFor:
            "Kimi を高頻度の中核業務ツールとして使い、より大きなモデル利用量やタスク容量が必要だと確認できている個人利用者。",
          difference:
            "公式ヘルプでは Allegro を上位の総合プランと位置付け、Allegretto より高い容量を提供しています。App Store 版の特典と動的制限は別途確認が必要です。",
          availabilityNote:
            "使用量は実際の消費に応じて計算され、変更される場合があります。購入前に現在のアプリ内プラン画面で機能、制限、更新価格を確認してください。",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        vivace: {
          bestFor:
            "App Store の購入画面に Vivace が表示され、その時点の特典が高負荷の用途に見合うと確認できた利用者に限られます。",
          difference:
            "Vivace は GeoSub の現在の App Store 月額データで最も高価な層ですが、Kimi の現行公開ヘルプには特典比較がないため、固定機能や利用量を推測できません。",
          availabilityNote:
            "Vivace は販売チャネルまたは旧プランの違いを反映している可能性があります。アプリ内画面の説明が明確でない場合、価格だけで機能が多いと判断しないでください。",
          sourceUrl:
            "https://apps.apple.com/us/app/kimi-kimi-k3-is-live/id6474233312",
        },
      },
    },
  },
  ko: {
    kimi: {
      summary:
        "Kimi는 Moonshot AI의 AI 어시스턴트로 대화, 문서 처리, 심층 조사, 프레젠테이션 및 코딩 작업을 지원합니다. GeoSub는 Apple App Store에서 확인 가능한 Moderato, Allegretto, Allegro, Vivace 정기 월간 구독을 비교합니다. Kimi 웹사이트와 App Store의 요금제 구성은 다를 수 있으므로 웹 요금제 혜택을 앱 내 구독에 자동으로 적용하지 않습니다.",
      sectionTitle: "이 요금제가 적합한 사용자",
      bestForLabel: "적합한 사용자",
      differenceLabel: "다른 요금제와의 주요 차이",
      availabilityLabel: "구독 전 확인",
      sourceLabel: "Kimi 공식 요금제",
      plans: {
        moderato: {
          bestFor:
            "무료 사용량을 넘어 일상 대화, 문서 작업과 일반 조사를 안정적으로 처리하고 싶지만 최고 수준의 용량은 필요하지 않은 개인 사용자.",
          difference:
            "Kimi 공식 도움말은 Moderato를 생산성 향상 단계로 설명합니다. App Store 구독의 실제 혜택과 동적 한도는 현재 계정 화면에서 확인해야 합니다.",
          availabilityNote:
            "웹과 App Store에서 제공하는 요금제가 다를 수 있습니다. 구독 전에 앱 내 구매 화면의 기능, 제한 및 갱신 가격을 확인하세요.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        allegretto: {
          bestFor:
            "심층 조사, 긴 문서 분석, 프레젠테이션 제작 또는 코딩을 자주 수행하며 Moderato보다 높은 사용량이 필요한 전문 사용자.",
          difference:
            "공식 도움말은 Allegretto를 전문 사용 단계로 설명합니다. App Store에서 제공되는 실제 용량은 계정과 판매 채널에 따라 달라질 수 있습니다.",
          availabilityNote:
            "요금제 이름만으로 웹과 App Store 혜택이 같다고 판단하지 말고 현재 앱 내 구매 화면을 확인하세요.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        allegro: {
          bestFor:
            "Kimi를 고강도 핵심 업무 도구로 사용하며 더 높은 모델 및 작업 용량이 필요하다고 확인한 개인 사용자.",
          difference:
            "공식 도움말은 Allegro를 Allegretto보다 용량이 높은 상위 종합 요금제로 설명합니다. App Store 혜택과 동적 제한은 별도로 확인해야 합니다.",
          availabilityNote:
            "사용량은 실제 소비에 따라 계산되며 변경될 수 있습니다. 구독 전 현재 계정의 앱 내 요금제 화면에서 기능, 제한 및 갱신 가격을 확인하세요.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        vivace: {
          bestFor:
            "App Store 구독 화면에 Vivace가 계속 표시되고 현재 혜택이 실제 고강도 사용 목적에 적합하다고 확인한 사용자에게만 해당합니다.",
          difference:
            "Vivace는 GeoSub의 현재 App Store 정기 월간 데이터에서 가장 비싼 단계이지만 Kimi의 현재 공개 도움말에는 혜택 비교가 없어 고정 기능이나 사용량을 추정할 수 없습니다.",
          availabilityNote:
            "Vivace는 판매 채널 또는 이전 요금제의 차이를 반영할 수 있습니다. 앱 내 설명이 명확하지 않다면 가격이 높다는 이유만으로 기능이 더 많다고 판단하지 마세요.",
          sourceUrl:
            "https://apps.apple.com/us/app/kimi-kimi-k3-is-live/id6474233312",
        },
      },
    },
  },
  es: {
    kimi: {
      summary:
        "Kimi es el asistente de IA de Moonshot AI para conversación, documentos, investigación profunda, presentaciones y programación. GeoSub compara las suscripciones mensuales recurrentes Moderato, Allegretto, Allegro y Vivace verificables en Apple App Store. La oferta de Kimi en la web y en App Store puede variar, por lo que las ventajas de los planes web no se asignan automáticamente a las compras dentro de la aplicación.",
      sectionTitle: "Para quién es este plan",
      bestForLabel: "Recomendado para",
      differenceLabel: "Diferencia principal frente a otros planes",
      availabilityLabel: "Antes de suscribirte",
      sourceLabel: "Planes oficiales de Kimi",
      plans: {
        moderato: {
          bestFor:
            "Personas que han superado el nivel gratuito y necesitan una capacidad más estable para conversaciones, documentos e investigación habitual, sin requerir el nivel más alto.",
          difference:
            "La ayuda oficial de Kimi presenta Moderato como una mejora de productividad. Las ventajas y los límites dinámicos de la compra en App Store deben confirmarse en la cuenta actual.",
          availabilityNote:
            "Los planes disponibles en la web y en App Store pueden ser distintos. Comprueba las funciones, los límites y el precio de renovación dentro de la aplicación antes de suscribirte.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        allegretto: {
          bestFor:
            "Usuarios profesionales que realizan con frecuencia investigación profunda, análisis de documentos largos, presentaciones o programación y necesitan más capacidad que Moderato.",
          difference:
            "La ayuda oficial sitúa Allegretto como el nivel profesional, normalmente con más capacidad. La asignación concreta de App Store puede variar según la cuenta y el canal.",
          availabilityNote:
            "No supongas que las ventajas de la web y App Store son idénticas solo por compartir nombre; revisa la pantalla de compra actual dentro de la aplicación.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        allegro: {
          bestFor:
            "Personas que usan Kimi como herramienta central de trabajo intensivo y han confirmado que necesitan una mayor capacidad de modelos y tareas.",
          difference:
            "La ayuda oficial presenta Allegro como el nivel premium más completo y con más capacidad que Allegretto. Las ventajas y límites dinámicos de App Store requieren una comprobación independiente.",
          availabilityNote:
            "El consumo se mide según el uso real y puede cambiar. Confirma funciones, límites y precio de renovación en la pantalla actual del plan dentro de la aplicación.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        vivace: {
          bestFor:
            "Solo para quienes todavía ven Vivace en la pantalla de suscripción de App Store y han confirmado que sus ventajas actuales justifican un uso intensivo.",
          difference:
            "Vivace es el nivel mensual recurrente más caro del conjunto actual de App Store de GeoSub, pero la ayuda pública vigente de Kimi no compara sus ventajas, por lo que no se pueden inferir funciones ni cuotas fijas.",
          availabilityNote:
            "Vivace puede reflejar una diferencia de canal o un plan anterior. Si la ficha dentro de la aplicación no es clara, un precio mayor no demuestra por sí solo que incluya más funciones.",
          sourceUrl:
            "https://apps.apple.com/us/app/kimi-kimi-k3-is-live/id6474233312",
        },
      },
    },
  },
  tr: {
    kimi: {
      summary:
        "Kimi, Moonshot AI tarafından sunulan; sohbet, belge işleme, derin araştırma, sunum ve kodlama görevlerini destekleyen bir yapay zekâ asistanıdır. GeoSub, Apple App Store'da doğrulanabilen yinelenen aylık Moderato, Allegretto, Allegro ve Vivace aboneliklerini karşılaştırır. Kimi'nin web ve App Store paketleri farklı olabileceğinden web paketlerinin avantajları uygulama içi satın alımlara otomatik olarak aktarılmaz.",
      sectionTitle: "Bu paket kimler için uygun",
      bestForLabel: "Uygun olduğu kullanıcılar",
      differenceLabel: "Diğer paketlerden temel farkı",
      availabilityLabel: "Abone olmadan önce",
      sourceLabel: "Kimi resmi paketleri",
      plans: {
        moderato: {
          bestFor:
            "Ücretsiz kullanım sınırını aşan; günlük sohbet, belge ve olağan araştırma işleri için daha istikrarlı kapasite isteyen ancak en yüksek seviyeye ihtiyaç duymayan bireysel kullanıcılar.",
          difference:
            "Kimi'nin resmi yardım sayfası Moderato'yu bir üretkenlik yükseltmesi olarak konumlandırır. App Store avantajları ve dinamik sınırlar mevcut hesap ekranından doğrulanmalıdır.",
          availabilityNote:
            "Web ve App Store'da sunulan paketler farklı olabilir. Abone olmadan önce uygulama içindeki özellikleri, sınırları ve yenileme fiyatını kontrol edin.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        allegretto: {
          bestFor:
            "Sık sık derin araştırma, uzun belge analizi, sunum veya kodlama yapan ve Moderato'dan daha yüksek kullanıma ihtiyaç duyan profesyonel kullanıcılar.",
          difference:
            "Resmi yardım sayfası Allegretto'yu profesyonel seviye olarak tanımlar ve genellikle daha yüksek kapasite sunar. App Store'daki kesin sınırlar hesaba ve kanala göre değişebilir.",
          availabilityNote:
            "Yalnızca paket adına bakarak web ve App Store avantajlarının aynı olduğunu varsaymayın; güncel uygulama içi satın alma ekranını kontrol edin.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        allegro: {
          bestFor:
            "Kimi'yi yoğun iş akışlarının merkezinde kullanan ve daha yüksek model ile görev kapasitesine ihtiyaç duyduğunu doğrulamış bireysel kullanıcılar.",
          difference:
            "Resmi yardım sayfası Allegro'yu Allegretto'dan daha yüksek kapasiteli kapsamlı üst seviye paket olarak konumlandırır. App Store avantajları ve dinamik sınırlar ayrıca doğrulanmalıdır.",
          availabilityNote:
            "Kullanım gerçek tüketime göre ölçülür ve değişebilir. Abone olmadan önce mevcut uygulama içi paket ekranında özellikleri, sınırları ve yenileme fiyatını doğrulayın.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        vivace: {
          bestFor:
            "Yalnızca App Store abonelik ekranında Vivace'ı hâlâ gören ve mevcut avantajlarının yoğun kullanım ihtiyacını karşıladığını doğrulayan kullanıcılar.",
          difference:
            "Vivace, GeoSub'ın mevcut App Store yinelenen aylık veri setindeki en pahalı seviyedir; ancak Kimi'nin güncel açık yardım sayfası avantaj karşılaştırması sunmadığından sabit özellik veya kota çıkarılamaz.",
          availabilityNote:
            "Vivace kanal veya eski paket farkını yansıtabilir. Uygulama içi açıklama net değilse daha yüksek fiyat tek başına daha fazla özellik kanıtı değildir.",
          sourceUrl:
            "https://apps.apple.com/us/app/kimi-kimi-k3-is-live/id6474233312",
        },
      },
    },
  },
  ar: {
    kimi: {
      summary:
        "Kimi هو مساعد ذكاء اصطناعي من Moonshot AI للمحادثة ومعالجة المستندات والبحث المتعمق والعروض التقديمية والبرمجة. تقارن GeoSub اشتراكات Moderato، Allegretto، Allegro وVivace الشهرية المتكررة التي يمكن التحقق منها في Apple App Store. قد تختلف باقات Kimi على الويب عن باقات App Store، لذلك لا تُنسب مزايا باقات الويب تلقائياً إلى عمليات الشراء داخل التطبيق.",
      sectionTitle: "لمن تناسب هذه الباقة",
      bestForLabel: "الأنسب لـ",
      differenceLabel: "الفرق الرئيسي عن الباقات الأخرى",
      availabilityLabel: "قبل الاشتراك",
      sourceLabel: "باقات Kimi الرسمية",
      plans: {
        moderato: {
          bestFor:
            "المستخدمون الأفراد الذين تجاوزوا المستوى المجاني ويحتاجون إلى سعة أكثر استقراراً للمحادثات اليومية والمستندات والبحث المعتاد من دون الحاجة إلى أعلى مستوى.",
          difference:
            "يصف مركز مساعدة Kimi الرسمي Moderato بأنه ترقية للإنتاجية. يجب التحقق من المزايا والحدود المتغيرة لاشتراك App Store في شاشة الحساب الحالية.",
          availabilityNote:
            "قد تختلف الباقات المتاحة على الويب وفي App Store. تحقّق من الميزات والحدود وسعر التجديد داخل التطبيق قبل الاشتراك.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        allegretto: {
          bestFor:
            "المستخدمون المحترفون الذين يجرون أبحاثاً متعمقة أو يحللون مستندات طويلة أو ينشئون عروضاً أو يبرمجون بانتظام ويحتاجون إلى سعة أعلى من Moderato.",
          difference:
            "يضع الدليل الرسمي Allegretto في المستوى المهني بسعة أعلى عادةً. وقد تختلف السعة الفعلية في App Store باختلاف الحساب وقناة البيع.",
          availabilityNote:
            "لا تفترض تطابق مزايا الويب وApp Store اعتماداً على اسم الباقة فقط؛ راجع شاشة الشراء الحالية داخل التطبيق.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        allegro: {
          bestFor:
            "الأفراد الذين يستخدمون Kimi أداة أساسية للعمل المكثف وتأكدوا من حاجتهم إلى سعة أكبر للنماذج والمهام.",
          difference:
            "يصف الدليل الرسمي Allegro بأنه المستوى المتكامل الأعلى وبسعة أكبر من Allegretto. ويجب التحقق بصورة مستقلة من مزايا App Store وحدوده المتغيرة.",
          availabilityNote:
            "يُقاس الاستخدام بحسب الاستهلاك الفعلي وقد يتغير. تحقّق من الميزات والحدود وسعر التجديد في شاشة الباقة الحالية داخل التطبيق قبل الاشتراك.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        vivace: {
          bestFor:
            "فقط لمن ما زال يرى Vivace في شاشة اشتراك App Store وتحقق من أن مزاياه الحالية تبرر استخدامه المكثف المطلوب.",
          difference:
            "Vivace هو أعلى مستوى سعراً ضمن بيانات GeoSub الحالية للاشتراكات الشهرية المتكررة في App Store، لكن مركز مساعدة Kimi العام الحالي لا يقدم مقارنة لمزاياه، لذلك لا يمكن استنتاج ميزات أو حصص ثابتة.",
          availabilityNote:
            "قد يعكس Vivace اختلافاً في قناة البيع أو باقة قديمة. إذا لم تكن التفاصيل داخل التطبيق واضحة، فالسعر الأعلى وحده لا يثبت وجود مزايا إضافية.",
          sourceUrl:
            "https://apps.apple.com/us/app/kimi-kimi-k3-is-live/id6474233312",
        },
      },
    },
  },
  fr: {
    kimi: {
      summary:
        "Kimi est l'assistant IA de Moonshot AI pour la conversation, le traitement de documents, la recherche approfondie, les présentations et le développement. GeoSub compare les abonnements mensuels récurrents Moderato, Allegretto, Allegro et Vivace vérifiables dans l'Apple App Store. Les offres web et App Store de Kimi peuvent différer ; les avantages des offres web ne sont donc pas attribués automatiquement aux achats intégrés.",
      sectionTitle: "À qui s'adresse cette offre",
      bestForLabel: "Recommandé pour",
      differenceLabel: "Principale différence avec les autres offres",
      availabilityLabel: "Avant de s'abonner",
      sourceLabel: "Offres officielles Kimi",
      plans: {
        moderato: {
          bestFor:
            "Les personnes qui dépassent le niveau gratuit et souhaitent une capacité plus stable pour les conversations, les documents et la recherche courante, sans avoir besoin du niveau le plus élevé.",
          difference:
            "L'aide officielle de Kimi présente Moderato comme une amélioration de productivité. Les avantages et limites dynamiques de l'achat App Store doivent être vérifiés dans le compte actuel.",
          availabilityNote:
            "Les offres disponibles sur le web et dans l'App Store peuvent différer. Vérifiez les fonctions, les limites et le prix de renouvellement dans l'application avant de vous abonner.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        allegretto: {
          bestFor:
            "Les professionnels qui effectuent fréquemment des recherches approfondies, analysent de longs documents, créent des présentations ou programment et ont besoin de plus de capacité que Moderato.",
          difference:
            "L'aide officielle place Allegretto au niveau professionnel, généralement avec une capacité supérieure. L'allocation App Store exacte peut varier selon le compte et le canal.",
          availabilityNote:
            "Ne supposez pas que les avantages du web et de l'App Store sont identiques sur la seule base du nom ; consultez l'écran d'achat intégré actuel.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        allegro: {
          bestFor:
            "Les personnes qui utilisent Kimi comme outil central pour des tâches intensives et ont confirmé leur besoin d'une capacité supérieure pour les modèles et les tâches.",
          difference:
            "L'aide officielle présente Allegro comme l'offre premium complète, avec une capacité supérieure à Allegretto. Les avantages et limites dynamiques de l'App Store doivent être vérifiés séparément.",
          availabilityNote:
            "L'utilisation est mesurée selon la consommation réelle et peut évoluer. Vérifiez les fonctions, les limites et le prix de renouvellement dans l'écran actuel de l'offre intégrée.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        vivace: {
          bestFor:
            "Uniquement les personnes qui voient encore Vivace dans l'écran d'abonnement App Store et ont confirmé que ses avantages actuels justifient leur usage intensif.",
          difference:
            "Vivace est le niveau mensuel récurrent le plus cher dans les données App Store actuelles de GeoSub, mais l'aide publique actuelle de Kimi ne compare pas ses avantages ; aucune fonction ni aucun quota fixe ne peut donc être déduit.",
          availabilityNote:
            "Vivace peut refléter une différence de canal ou une ancienne offre. Si la fiche intégrée manque de clarté, un prix supérieur ne prouve pas à lui seul l'existence d'avantages supplémentaires.",
          sourceUrl:
            "https://apps.apple.com/us/app/kimi-kimi-k3-is-live/id6474233312",
        },
      },
    },
  },
  it: {
    kimi: {
      summary:
        "Kimi è l'assistente IA di Moonshot AI per conversazioni, documenti, ricerca approfondita, presentazioni e programmazione. GeoSub confronta gli abbonamenti mensili ricorrenti Moderato, Allegretto, Allegro e Vivace verificabili nell'Apple App Store. Le offerte Kimi sul web e nell'App Store possono differire, quindi i vantaggi dei piani web non vengono attribuiti automaticamente agli acquisti in-app.",
      sectionTitle: "A chi è adatto questo piano",
      bestForLabel: "Ideale per",
      differenceLabel: "Differenza principale rispetto agli altri piani",
      availabilityLabel: "Prima dell'abbonamento",
      sourceLabel: "Piani ufficiali Kimi",
      plans: {
        moderato: {
          bestFor:
            "Chi ha superato il livello gratuito e desidera una capacità più stabile per conversazioni, documenti e ricerche ordinarie senza aver bisogno del livello più alto.",
          difference:
            "La guida ufficiale di Kimi presenta Moderato come un miglioramento della produttività. I vantaggi e i limiti dinamici dell'acquisto App Store devono essere verificati nell'account attuale.",
          availabilityNote:
            "I piani disponibili sul web e nell'App Store possono essere diversi. Prima di abbonarti, controlla funzioni, limiti e prezzo di rinnovo all'interno dell'app.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        allegretto: {
          bestFor:
            "Professionisti che svolgono spesso ricerche approfondite, analizzano documenti lunghi, creano presentazioni o programmano e necessitano di più capacità rispetto a Moderato.",
          difference:
            "La guida ufficiale colloca Allegretto nel livello professionale, in genere con capacità maggiore. La disponibilità effettiva nell'App Store può variare in base all'account e al canale.",
          availabilityNote:
            "Non presumere che i vantaggi web e App Store coincidano solo perché il nome del piano è uguale; verifica la schermata di acquisto in-app attuale.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        allegro: {
          bestFor:
            "Chi usa Kimi come strumento centrale per attività intensive e ha confermato la necessità di una capacità maggiore per modelli e attività.",
          difference:
            "La guida ufficiale presenta Allegro come il livello premium completo, con capacità superiore ad Allegretto. I vantaggi e i limiti dinamici dell'App Store richiedono una verifica separata.",
          availabilityNote:
            "L'utilizzo è misurato in base al consumo effettivo e può cambiare. Controlla funzioni, limiti e prezzo di rinnovo nella schermata del piano in-app prima dell'abbonamento.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        vivace: {
          bestFor:
            "Solo per chi vede ancora Vivace nella schermata di abbonamento dell'App Store e ha verificato che i vantaggi attuali giustifichino l'uso intensivo richiesto.",
          difference:
            "Vivace è il livello mensile ricorrente più costoso nei dati App Store attuali di GeoSub, ma la guida pubblica attuale di Kimi non confronta i suoi vantaggi; non è quindi possibile dedurre funzioni o quote fisse.",
          availabilityNote:
            "Vivace può riflettere una differenza di canale o un piano precedente. Se la schermata in-app non è chiara, il prezzo più alto non dimostra da solo la presenza di vantaggi aggiuntivi.",
          sourceUrl:
            "https://apps.apple.com/us/app/kimi-kimi-k3-is-live/id6474233312",
        },
      },
    },
  },
  de: {
    kimi: {
      summary:
        "Kimi ist der KI-Assistent von Moonshot AI für Gespräche, Dokumente, vertiefte Recherche, Präsentationen und Programmierung. GeoSub vergleicht die wiederkehrenden monatlichen Abonnements Moderato, Allegretto, Allegro und Vivace, die im Apple App Store überprüfbar sind. Das Web- und App-Store-Angebot von Kimi kann abweichen; Vorteile der Web-Tarife werden daher nicht automatisch In-App-Käufen zugeordnet.",
      sectionTitle: "Für wen dieser Tarif geeignet ist",
      bestForLabel: "Geeignet für",
      differenceLabel: "Wichtigster Unterschied zu anderen Tarifen",
      availabilityLabel: "Vor dem Abonnieren",
      sourceLabel: "Kimi-Mitgliedschaft",
      plans: {
        moderato: {
          bestFor:
            "Personen, denen der kostenlose Umfang nicht mehr genügt und die stabilere Kapazität für tägliche Gespräche, Dokumente und allgemeine Recherche benötigen, aber keinen Höchsttarif brauchen.",
          difference:
            "Die offizielle Kimi-Hilfe beschreibt Moderato als Produktivitäts-Upgrade. Leistungen und dynamische Grenzen des App-Store-Kaufs müssen im aktuellen Konto geprüft werden.",
          availabilityNote:
            "Die verfügbaren Web- und App-Store-Tarife können sich unterscheiden. Prüfen Sie vor dem Abonnement Funktionen, Grenzen und Verlängerungspreis in der App.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        allegretto: {
          bestFor:
            "Professionelle Nutzer, die häufig vertieft recherchieren, lange Dokumente analysieren, Präsentationen erstellen oder programmieren und mehr Kapazität als bei Moderato benötigen.",
          difference:
            "Die offizielle Hilfe positioniert Allegretto als professionellen Tarif mit in der Regel höherer Kapazität. Die genaue App-Store-Zuteilung kann je nach Konto und Kanal variieren.",
          availabilityNote:
            "Gehen Sie nicht allein aufgrund des Namens von identischen Web- und App-Store-Leistungen aus; prüfen Sie die aktuelle In-App-Kaufansicht.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        allegro: {
          bestFor:
            "Personen, die Kimi intensiv als zentrales Arbeitswerkzeug einsetzen und bestätigt haben, dass sie höhere Modell- und Aufgabenkapazität benötigen.",
          difference:
            "Die offizielle Hilfe beschreibt Allegro als umfassenden Premium-Tarif mit höherer Kapazität als Allegretto. App-Store-Leistungen und dynamische Grenzen müssen separat geprüft werden.",
          availabilityNote:
            "Die Nutzung wird nach tatsächlichem Verbrauch gemessen und kann sich ändern. Prüfen Sie Funktionen, Grenzen und Verlängerungspreis vor dem Abonnement im aktuellen In-App-Tarifbildschirm.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        vivace: {
          bestFor:
            "Nur für Personen, denen Vivace noch im App-Store-Abonnementbildschirm angezeigt wird und die geprüft haben, dass die aktuellen Leistungen ihren intensiven Einsatz rechtfertigen.",
          difference:
            "Vivace ist der teuerste wiederkehrende Monatstarif im aktuellen App-Store-Datensatz von GeoSub. Die derzeitige öffentliche Kimi-Hilfe vergleicht seine Leistungen jedoch nicht, sodass keine festen Funktionen oder Kontingente abgeleitet werden können.",
          availabilityNote:
            "Vivace kann einen Kanal- oder Altvertragsunterschied widerspiegeln. Sind die In-App-Angaben unklar, beweist ein höherer Preis allein keine zusätzlichen Leistungen.",
          sourceUrl:
            "https://apps.apple.com/us/app/kimi-kimi-k3-is-live/id6474233312",
        },
      },
    },
  },
  pt: {
    kimi: {
      summary:
        "Kimi é o assistente de IA da Moonshot AI para conversação, documentos, pesquisa aprofundada, apresentações e programação. A GeoSub compara as subscrições mensais recorrentes Moderato, Allegretto, Allegro e Vivace verificáveis na Apple App Store. As ofertas web e App Store da Kimi podem ser diferentes, pelo que os benefícios dos planos web não são atribuídos automaticamente às compras na aplicação.",
      sectionTitle: "A quem se destina este plano",
      bestForLabel: "Indicado para",
      differenceLabel: "Principal diferença face aos outros planos",
      availabilityLabel: "Antes de subscrever",
      sourceLabel: "Planos oficiais Kimi",
      plans: {
        moderato: {
          bestFor:
            "Pessoas que ultrapassaram o nível gratuito e precisam de capacidade mais estável para conversas, documentos e pesquisa corrente, sem necessitarem do nível mais elevado.",
          difference:
            "A ajuda oficial da Kimi apresenta o Moderato como uma melhoria de produtividade. Os benefícios e limites dinâmicos da compra na App Store devem ser confirmados na conta atual.",
          availabilityNote:
            "Os planos disponíveis na web e na App Store podem ser diferentes. Confirme as funcionalidades, os limites e o preço de renovação dentro da aplicação antes de subscrever.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        allegretto: {
          bestFor:
            "Profissionais que fazem frequentemente pesquisa aprofundada, analisam documentos longos, criam apresentações ou programam e precisam de mais capacidade do que o Moderato.",
          difference:
            "A ajuda oficial posiciona o Allegretto como nível profissional, geralmente com maior capacidade. A disponibilidade concreta na App Store pode variar conforme a conta e o canal.",
          availabilityNote:
            "Não pressuponha que os benefícios web e App Store são iguais apenas pelo nome do plano; consulte o ecrã atual de compra na aplicação.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        allegro: {
          bestFor:
            "Pessoas que utilizam o Kimi como ferramenta central em trabalho intensivo e confirmaram que precisam de maior capacidade para modelos e tarefas.",
          difference:
            "A ajuda oficial apresenta o Allegro como o nível premium completo, com capacidade superior ao Allegretto. Os benefícios e limites dinâmicos da App Store exigem confirmação separada.",
          availabilityNote:
            "A utilização é medida pelo consumo real e pode mudar. Confirme as funcionalidades, os limites e o preço de renovação no ecrã atual do plano dentro da aplicação.",
          sourceUrl: "https://www.kimi.com/en/help/membership/membership-pricing",
        },
        vivace: {
          bestFor:
            "Apenas para quem ainda vê o Vivace no ecrã de subscrição da App Store e confirmou que os benefícios atuais justificam a utilização intensiva pretendida.",
          difference:
            "O Vivace é o nível mensal recorrente mais caro nos dados atuais da App Store da GeoSub, mas a ajuda pública atual da Kimi não compara os seus benefícios; por isso, não é possível inferir funcionalidades ou quotas fixas.",
          availabilityNote:
            "O Vivace pode refletir uma diferença de canal ou um plano antigo. Se a descrição na aplicação não for clara, um preço superior não prova, por si só, a existência de benefícios adicionais.",
          sourceUrl:
            "https://apps.apple.com/us/app/kimi-kimi-k3-is-live/id6474233312",
        },
      },
    },
  },
};

export const expandedEditorialContent = { zh, en };

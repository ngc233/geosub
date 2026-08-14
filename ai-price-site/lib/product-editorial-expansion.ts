import type { ProductEditorialContent } from "./product-editorial-content";

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

export const expandedEditorialContent = { zh, en };

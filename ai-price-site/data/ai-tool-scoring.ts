export type AiToolScoreKey =
  | "capability"
  | "benchmark"
  | "freeAccess"
  | "value"
  | "regionalPricing"
  | "stability"
  | "risk";

export type AiToolScoreDimension = {
  key: AiToolScoreKey;
  weight: number;
  labelZh: string;
  labelEn: string;
  descriptionZh: string;
  descriptionEn: string;
};

export type AiToolCategoryScoringProfile = {
  key: string;
  labelZh: string;
  labelEn: string;
  descriptionZh: string;
  descriptionEn: string;
  weights: Record<AiToolScoreKey, number>;
};

export type AiToolScoringReference = {
  label: string;
  href: string;
  useZh: string;
  useEn: string;
};

export type GeoSubQualityScorePillar = {
  key: AiToolScoreKey;
  code: string;
  labelZh: string;
  labelEn: string;
  questionZh: string;
  questionEn: string;
  evidenceZh: string[];
  evidenceEn: string[];
};

export const geoSubQualityScore = {
  version: "GQS v0.1",
  labelZh: "GeoSub Quality Score",
  labelEn: "GeoSub Quality Score",
  summaryZh:
    "GQS 不是单纯模型跑分，而是把外部能力基准、真实场景适配、订阅价格、地区购买力、可用性、稳定性和风险放到同一套购买决策框架里。",
  summaryEn:
    "GQS is not a pure model benchmark. It combines external capability anchors, use-case fit, subscription value, regional affordability, availability, stability, and risk into one purchase-decision framework.",
  principlesZh: [
    "不照搬任何单一外部榜单。",
    "所有场景使用不同权重，避免通用模型通吃。",
    "价格、税费和地区购买力由 GeoSub 自己采集和计算。",
    "有数据缺口时降权，并在页面标明待接入或待核验。",
  ],
  principlesEn: [
    "Do not copy any single external leaderboard.",
    "Use different weights per scenario to avoid one general model winning every list.",
    "Use GeoSub's own collection for pricing, taxes, and regional affordability.",
    "Penalize and label missing data as pending or needs verification.",
  ],
};

export const geoSubQualityScorePillars: GeoSubQualityScorePillar[] = [
  {
    key: "benchmark",
    code: "GQS-1",
    labelZh: "外部能力锚点",
    labelEn: "External capability anchor",
    questionZh: "模型在独立基准和人类偏好中是否有稳定表现？",
    questionEn: "Does the model perform consistently in independent benchmarks and human preference tests?",
    evidenceZh: ["Artificial Analysis", "Chatbot Arena", "HELM / VHELM / HEIM"],
    evidenceEn: ["Artificial Analysis", "Chatbot Arena", "HELM / VHELM / HEIM"],
  },
  {
    key: "capability",
    code: "GQS-2",
    labelZh: "任务能力覆盖",
    labelEn: "Task capability coverage",
    questionZh: "它能否覆盖写作、推理、代码、多模态和工具工作流？",
    questionEn: "Can it cover writing, reasoning, coding, multimodal tasks, and tool workflows?",
    evidenceZh: ["公开产品能力", "实际场景表现", "多模态/上下文/工具支持"],
    evidenceEn: ["Public product capabilities", "Observed use-case fit", "Multimodal/context/tool support"],
  },
  {
    key: "value",
    code: "GQS-3",
    labelZh: "订阅价值",
    labelEn: "Subscription value",
    questionZh: "同样价格下，它给用户的额度、能力和限制是否划算？",
    questionEn: "At the same price point, are its limits, capability, and included features worthwhile?",
    evidenceZh: ["套餐价格", "额度限制", "API/点数/会员权益"],
    evidenceEn: ["Plan price", "Usage limits", "API/credit/membership value"],
  },
  {
    key: "regionalPricing",
    code: "GQS-4",
    labelZh: "地区价格与购买力",
    labelEn: "Regional pricing and affordability",
    questionZh: "在不同国家订阅是否更便宜，税费和本地购买力是否友好？",
    questionEn: "Is it cheaper in some regions, and how do taxes and local affordability change the value?",
    evidenceZh: ["GeoSub App Store 价格", "税费资料", "汇率和本地购买力"],
    evidenceEn: ["GeoSub App Store prices", "Tax profiles", "Exchange rates and local affordability"],
  },
  {
    key: "freeAccess",
    code: "GQS-5",
    labelZh: "免费可用性",
    labelEn: "Free access",
    questionZh: "普通用户是否能低门槛试用，免费额度是否足够日常判断？",
    questionEn: "Can normal users try it with low friction, and is the free allowance meaningful?",
    evidenceZh: ["免费入口", "登录门槛", "免费额度和地区限制"],
    evidenceEn: ["Free entry points", "Login friction", "Free limits and regional restrictions"],
  },
  {
    key: "stability",
    code: "GQS-6",
    labelZh: "产品稳定性",
    labelEn: "Product stability",
    questionZh: "产品、套餐、平台支持和服务可用性是否稳定？",
    questionEn: "Are the product, plans, platform support, and service availability stable?",
    evidenceZh: ["产品成熟度", "套餐变化频率", "平台和生态支持"],
    evidenceEn: ["Product maturity", "Plan-change frequency", "Platform and ecosystem support"],
  },
  {
    key: "risk",
    code: "GQS-7",
    labelZh: "可信风险",
    labelEn: "Trust and risk",
    questionZh: "隐私、安全、内容风险和来源透明度是否足以支撑推荐？",
    questionEn: "Are privacy, safety, content risk, and source transparency strong enough to recommend it?",
    evidenceZh: ["AILuminate 风险思想", "隐私和数据政策", "来源透明度和人工复核"],
    evidenceEn: ["AILuminate-style risk thinking", "Privacy/data policies", "Source transparency and review status"],
  },
];

export const aiToolScoreDimensions: AiToolScoreDimension[] = [
  {
    key: "capability",
    weight: 0.18,
    labelZh: "能力覆盖",
    labelEn: "Capability",
    descriptionZh: "覆盖多任务能力、推理、写作、代码、多模态和工具生态，不只看单一跑分。",
    descriptionEn:
      "Covers multi-task ability, reasoning, writing, coding, multimodality, and ecosystem breadth.",
  },
  {
    key: "benchmark",
    weight: 0.16,
    labelZh: "独立基准",
    labelEn: "Independent benchmark",
    descriptionZh: "参考 Artificial Analysis、Arena、HELM 等外部基准，避免 GeoSub 自己凭印象判断模型能力。",
    descriptionEn:
      "References external benchmarks such as Artificial Analysis, Arena, and HELM to reduce product-impression bias.",
  },
  {
    key: "freeAccess",
    weight: 0.12,
    labelZh: "免费可用性",
    labelEn: "Free access",
    descriptionZh: "比较免费入口、额度、登录门槛和普通用户日常可用性。",
    descriptionEn:
      "Compares free access, limits, login friction, and everyday usability.",
  },
  {
    key: "value",
    weight: 0.18,
    labelZh: "订阅性价比",
    labelEn: "Subscription value",
    descriptionZh: "比较套餐价格、核心功能、使用限制和同价位替代工具。",
    descriptionEn:
      "Compares price, core features, usage limits, and alternatives at similar price points.",
  },
  {
    key: "regionalPricing",
    weight: 0.18,
    labelZh: "地区价格友好度",
    labelEn: "Regional pricing",
    descriptionZh: "使用 GeoSub 的地区价格、税费、价差和数据可信度；未接入价格页会降权。",
    descriptionEn:
      "Uses GeoSub regional prices, taxes, gaps, and confidence; tools without price data are penalized.",
  },
  {
    key: "stability",
    weight: 0.15,
    labelZh: "稳定性 / 生态",
    labelEn: "Stability",
    descriptionZh: "比较产品成熟度、平台支持、更新节奏、故障风险和工作流适配。",
    descriptionEn:
      "Compares product maturity, platform support, update pace, reliability, and workflow fit.",
  },
  {
    key: "risk",
    weight: 0.12,
    labelZh: "风险与可信度",
    labelEn: "Risk and trust",
    descriptionZh: "参考安全、隐私、内容风险、来源透明度和人工复核状态。",
    descriptionEn:
      "Reflects safety, privacy, content risk, source transparency, and review status.",
  },
];

export const aiToolCategoryScoringProfiles: Record<
  string,
  AiToolCategoryScoringProfile
> = {
  overall: {
    key: "overall",
    labelZh: "综合权重",
    labelEn: "Overall weights",
    descriptionZh: "面向大多数用户的默认综合比较。",
    descriptionEn: "Default comparison for most users.",
    weights: {
      capability: 0.16,
      benchmark: 0.18,
      freeAccess: 0.1,
      value: 0.16,
      regionalPricing: 0.16,
      stability: 0.12,
      risk: 0.12,
    },
  },
  free: {
    key: "free",
    labelZh: "免费 AI 权重",
    labelEn: "Free AI weights",
    descriptionZh: "免费入口和日常可用性优先，避免付费能力把免费榜带偏。",
    descriptionEn: "Prioritizes free access and everyday availability.",
    weights: {
      capability: 0.12,
      benchmark: 0.08,
      freeAccess: 0.34,
      value: 0.16,
      regionalPricing: 0.1,
      stability: 0.1,
      risk: 0.1,
    },
  },
  coding: {
    key: "coding",
    labelZh: "编程 AI 权重",
    labelEn: "Coding weights",
    descriptionZh: "能力、项目工作流和稳定性优先。",
    descriptionEn: "Prioritizes coding capability, workflow fit, and stability.",
    weights: {
      capability: 0.3,
      benchmark: 0.12,
      freeAccess: 0.05,
      value: 0.14,
      regionalPricing: 0.06,
      stability: 0.21,
      risk: 0.12,
    },
  },
  writing: {
    key: "writing",
    labelZh: "写作办公权重",
    labelEn: "Writing weights",
    descriptionZh: "文本质量、长文档能力、稳定性和价格共同决定。",
    descriptionEn: "Balances text quality, long-document work, stability, and price.",
    weights: {
      capability: 0.25,
      benchmark: 0.18,
      freeAccess: 0.08,
      value: 0.15,
      regionalPricing: 0.09,
      stability: 0.15,
      risk: 0.1,
    },
  },
  image: {
    key: "image",
    labelZh: "图片生成权重",
    labelEn: "Image weights",
    descriptionZh: "图片生成质量和控制力优先。",
    descriptionEn: "Prioritizes image quality and creative control.",
    weights: {
      capability: 0.38,
      benchmark: 0.04,
      freeAccess: 0.08,
      value: 0.16,
      regionalPricing: 0.06,
      stability: 0.16,
      risk: 0.12,
    },
  },
  video: {
    key: "video",
    labelZh: "视频生成权重",
    labelEn: "Video weights",
    descriptionZh: "视频质量、工作流稳定性和点数性价比优先。",
    descriptionEn: "Prioritizes video quality, workflow stability, and credit value.",
    weights: {
      capability: 0.38,
      benchmark: 0.04,
      freeAccess: 0.06,
      value: 0.16,
      regionalPricing: 0.06,
      stability: 0.18,
      risk: 0.12,
    },
  },
  search: {
    key: "search",
    labelZh: "AI 搜索权重",
    labelEn: "AI search weights",
    descriptionZh: "来源可核验和答案可信度更重要。",
    descriptionEn: "Prioritizes citations, source checking, and answer reliability.",
    weights: {
      capability: 0.2,
      benchmark: 0.14,
      freeAccess: 0.11,
      value: 0.13,
      regionalPricing: 0.07,
      stability: 0.13,
      risk: 0.22,
    },
  },
  local: {
    key: "local",
    labelZh: "本地 / 开源权重",
    labelEn: "Local / open weights",
    descriptionZh: "隐私、可控性、免费可用性和本地部署优先。",
    descriptionEn: "Prioritizes privacy, control, free access, and local deployment.",
    weights: {
      capability: 0.12,
      benchmark: 0.08,
      freeAccess: 0.2,
      value: 0.16,
      regionalPricing: 0.04,
      stability: 0.12,
      risk: 0.28,
    },
  },
};

export const aiToolScoringReferences: AiToolScoringReference[] = [
  {
    label: "Artificial Analysis",
    href: "https://artificialanalysis.ai/leaderboards/models",
    useZh: "作为模型能力、价格、速度、延迟和上下文窗口的外部锚点，避免本站凭品牌印象打能力分。",
    useEn: "Used as an external anchor for model intelligence, price, speed, latency, and context window.",
  },
  {
    label: "Stanford HELM",
    href: "https://arxiv.org/abs/2211.09110",
    useZh: "采用多维评价思想，避免只看单一准确率或主观偏好。",
    useEn: "Uses a multi-metric evaluation mindset instead of relying on one score.",
  },
  {
    label: "Chatbot Arena",
    href: "https://arxiv.org/abs/2403.04132",
    useZh: "参考人类偏好和成对比较思想，但 GeoSub 不直接照搬 Arena 排名。",
    useEn: "Inspires human preference and pairwise comparison without copying Arena ranks.",
  },
  {
    label: "MLCommons AILuminate",
    href: "https://arxiv.org/abs/2503.05731",
    useZh: "参考风险与可靠性分级思想，把安全和可信度作为独立维度。",
    useEn: "Inspires a separate risk and reliability dimension.",
  },
  {
    label: "VHELM",
    href: "https://arxiv.org/abs/2410.07112",
    useZh: "提醒多模态工具不能只看文本能力，应覆盖视觉、鲁棒性和安全因素。",
    useEn: "Reminds us that multimodal tools should cover vision, robustness, and safety.",
  },
];

export function getAiToolWeightedScore(
  scores: Record<AiToolScoreKey, number>,
  weights: Record<AiToolScoreKey, number> = aiToolCategoryScoringProfiles.overall.weights,
) {
  return Math.round(
    Object.entries(weights).reduce(
      (total, [key, weight]) => total + scores[key as AiToolScoreKey] * weight,
      0,
    ),
  );
}

export function getAiToolScoreTotal(scores: Record<AiToolScoreKey, number>) {
  return getAiToolWeightedScore(scores);
}

export function getAiToolCategoryScore(
  scores: Record<AiToolScoreKey, number>,
  categoryKey: string,
) {
  const profile =
    aiToolCategoryScoringProfiles[categoryKey] ??
    aiToolCategoryScoringProfiles.overall;

  return getAiToolWeightedScore(scores, profile.weights);
}

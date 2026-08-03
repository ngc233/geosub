const legacyPricingPlanAliases: Record<string, Record<string, string>> = {
  chatgpt: {
    go: "go",
    plus: "plus",
    "pro-5x": "pro-5x",
    "pro-20x": "pro",
    pro: "pro",
  },
  claude: {
    pro: "pro",
    "max-5x": "max-5x",
    "max-20x": "max-20x",
  },
  gemini: {
    plus: "plus",
    pro: "pro",
    ultra: "ultra",
  },
  grok: {
    "super-lite": "super-lite",
    super: "super",
    "super-heavy": "super-heavy",
  },
  manus: {
    basic: "basic",
    pro: "pro",
    plus: "plus",
  },
  perplexity: {
    pro: "pro",
    max: "max",
  },
  suno: {
    basic: "basic",
    pro: "pro",
    "premier-plan": "premier-plan",
  },
  netflix: {
    basic: "basic",
    standard: "standard",
    premium: "premium",
  },
  disney: {
    "standard-with-ads": "standard-with-ads",
    standard: "standard",
    premium: "premium",
  },
  "hbo-max": {
    "basic-with-ads": "basic-with-ads",
    standard: "standard",
    premium: "premium",
  },
};

export function resolveLegacyPricingPlanSlug(
  productSlug: string,
  planSlug: string,
) {
  return legacyPricingPlanAliases[productSlug]?.[planSlug] || null;
}

export function getPlanDisplayName(productName: string, planName: string) {
  const cleanProductName = productName.trim();
  const cleanPlanName = planName.trim();

  if (!cleanProductName) return cleanPlanName;
  if (!cleanPlanName) return cleanProductName;

  if (cleanPlanName.toLowerCase().startsWith(cleanProductName.toLowerCase())) {
    return cleanPlanName;
  }

  // Gemini subscriptions are officially named "Google AI ...". Treat that
  // family as a complete plan name instead of producing "Gemini Google AI ...".
  if (
    cleanProductName.toLowerCase() === "gemini" &&
    cleanPlanName.toLowerCase().startsWith("google ai ")
  ) {
    return cleanPlanName;
  }

  return `${cleanProductName} ${cleanPlanName}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getPlanTabLabel(productName: string, planName: string) {
  const cleanProductName = productName.trim();
  const cleanPlanName = planName.trim();
  const familyNames = [
    cleanProductName,
    ...(cleanProductName.toLowerCase() === "gemini" ? ["Google AI"] : []),
  ].filter(Boolean);

  let shortened = cleanPlanName;
  for (const familyName of familyNames) {
    shortened = shortened.replace(
      new RegExp(`^${escapeRegExp(familyName)}\\s+`, "i"),
      "",
    );
  }

  shortened = shortened.replace(/\s+Subscription$/i, "").trim();
  return shortened || cleanPlanName;
}

/** Chinese rebuilt pages only. Keep stored Chinese labels and branded tiers;
 * translate only the six generic terms approved on 2026-11-06. Legacy/locked
 * pages continue to use getPlanDisplayName without changing their copy. */
export function getChinesePlanDisplayName(productName: string, planName: string) {
  const product = productName.trim(), plan = planName.trim();
  if (/\p{Script=Han}/u.test(plan) || plan.toLowerCase() === product.toLowerCase()) return getPlanDisplayName(product, plan);
  const prefix = `${product} `;
  const tier = product && plan.toLowerCase().startsWith(prefix.toLowerCase()) ? plan.slice(prefix.length) : plan;
  const generic: Readonly<Record<string, string>> = {
    individual: "个人版", standard: "标准版", premium: "高级版",
    family: "家庭版", basic: "基础版", monthly: "月度会员",
  };
  const translated = tier.replace(/\b(Individual|Standard|Premium|Family|Basic|Monthly)\b/gi, word => generic[word.toLowerCase()]);
  return getPlanDisplayName(product, translated);
}

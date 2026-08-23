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

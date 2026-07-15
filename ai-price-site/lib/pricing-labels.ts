export function getPlanDisplayName(productName: string, planName: string) {
  const cleanProductName = productName.trim();
  const cleanPlanName = planName.trim();

  if (!cleanProductName) return cleanPlanName;
  if (!cleanPlanName) return cleanProductName;

  if (cleanPlanName.toLowerCase().startsWith(cleanProductName.toLowerCase())) {
    return cleanPlanName;
  }

  return `${cleanProductName} ${cleanPlanName}`;
}

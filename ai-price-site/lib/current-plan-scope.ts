// Historical renewal evidence remains usable when no current offer is available.
export function selectCurrentOrLegacyPlans<T>(plans: T[], isCurrent: (plan: T) => boolean): T[] {
  const current = plans.filter(isCurrent);
  return current.length > 0 ? current : plans;
}

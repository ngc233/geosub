export const englishPlanCanvasPath = "/en/ai-pricing/chatgpt/go";

/** Keep the Chinese Plus shell separate from the rollout; all other /zh and /en routes use the unified public style. */
export function usesUnifiedPublicStyle(pathname: string): boolean {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "");
  if (path === "/zh/ai-pricing/chatgpt/plus") return false;
  return path === "/zh" || path.startsWith("/zh/") || path === "/en" || path.startsWith("/en/");
}

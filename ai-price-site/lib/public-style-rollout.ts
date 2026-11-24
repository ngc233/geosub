export const englishPlanCanvasPath = "/en/ai-pricing/chatgpt/go";

const englishCanvasPaths = new Set(["/en", "/en/ai-pricing", englishPlanCanvasPath]);

/** Keep the Chinese Plus shell separate from the rollout. */
export function usesUnifiedPublicStyle(pathname: string): boolean {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "");
  if (path === "/zh/ai-pricing/chatgpt/plus") return false;
  return path === "/zh" || path.startsWith("/zh/") || englishCanvasPaths.has(path);
}

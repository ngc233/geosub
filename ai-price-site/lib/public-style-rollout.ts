/** V2 activates only Chinese chrome. Remove the Plus exception in V8. */
export function usesUnifiedPublicStyle(pathname: string): boolean {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "");
  if (path === "/zh/ai-pricing/chatgpt/plus") return false;
  return path === "/zh" || path.startsWith("/zh/");
}

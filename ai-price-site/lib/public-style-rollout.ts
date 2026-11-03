/** Explicit, staged rollout of the owner-approved public components. */
export function usesUnifiedPublicStyle(pathname: string) {
  const path = pathname.replace(/\/+$/, "");
  // All launched Chinese templates now share the approved style, including their 404s.
  // This affects presentation only: route publication and indexing remain authoritative.
  return path === "/style-preview/codex-reset"
    || ((path === "/zh" || path.startsWith("/zh/"))
      && path !== "/zh/tools/codex-reset/rss.xml");
}

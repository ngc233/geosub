export const unreleasedPublicPaths = [
  "/ai-rankings",
  "/software-subscriptions",
  "/gaming-steam",
  "/gift-cards",
  "/vpn",
] as const;

export const internalTestPaths = ["/cms-test", "/tracking-test"] as const;

export const launchedMirroredStaticPaths = new Set([
  "/",
  "/about",
  "/ai-pricing",
  "/data-sources",
  "/guides",
  "/guides/gift-card-guide",
  "/guides/methodology",
  "/guides/payment-account",
  "/guides/price-guide",
  "/guides/tool-review",
  "/privacy",
  "/streaming-pricing",
  "/terms",
]);

function normalizePublicPath(pathname: string) {
  const withoutQuery = pathname.split(/[?#]/, 1)[0] || "/";
  const withoutLocale =
    withoutQuery.replace(/^\/(?:zh|en|ja|ko|es|tr|ar|fr|it|de|pt)(?=\/|$)/, "") || "/";
  return withoutLocale.length > 1
    ? withoutLocale.replace(/\/+$/, "")
    : withoutLocale;
}

function matchesPathList(pathname: string, paths: readonly string[]) {
  const normalized = normalizePublicPath(pathname);
  return paths.some(
    (path) => normalized === path || normalized.startsWith(`${path}/`),
  );
}

export function isUnreleasedPublicPath(pathname: string) {
  return matchesPathList(pathname, unreleasedPublicPaths);
}

export function isInternalTestPath(pathname: string) {
  return matchesPathList(pathname, internalTestPaths);
}

export function shouldHideFromPublicNavigation(pathname: string) {
  return isUnreleasedPublicPath(pathname) || isInternalTestPath(pathname);
}

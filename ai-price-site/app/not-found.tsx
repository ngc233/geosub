import { headers } from "next/headers";
import FrameworkNotFound from "next/dist/client/components/builtin/not-found";
import AuxiliaryNotFound from "../components/AuxiliaryNotFound";
import { unifiedPublicLocales } from "../lib/public-style-rollout";

/** Unmatched unified URLs (/zh, /en, /zh-tw, /ja, /ko, /es) use the real root 404, not a throwing catch-all page. */
export default async function NotFound() {
  const pathname = (await headers()).get("x-pathname") || "";
  const matchedLocale = unifiedPublicLocales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (matchedLocale) {
    return <AuxiliaryNotFound locale={matchedLocale} />;
  }
  return <FrameworkNotFound />;
}

import { headers } from "next/headers";
import FrameworkNotFound from "next/dist/client/components/builtin/not-found";
import ChineseNotFound from "./zh/not-found";
import EnglishNotFound from "./en/not-found";

/** Unmatched unified URLs (/zh and /en) use the real root 404, not a throwing catch-all page. */
export default async function NotFound() {
  const pathname = (await headers()).get("x-pathname") || "";
  if (pathname === "/zh" || pathname.startsWith("/zh/")) {
    return <ChineseNotFound />;
  }
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return <EnglishNotFound />;
  }
  return <FrameworkNotFound />;
}

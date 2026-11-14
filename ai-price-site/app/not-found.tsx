import { headers } from "next/headers";
import FrameworkNotFound from "next/dist/client/components/builtin/not-found";
import ChineseNotFound from "./zh/not-found";

/** Unmatched Chinese URLs use the real root 404, not a throwing catch-all page. */
export default async function NotFound() {
  const pathname = (await headers()).get("x-pathname") || "";
  return pathname === "/zh" || pathname.startsWith("/zh/")
    ? <ChineseNotFound/>
    : <FrameworkNotFound/>;
}

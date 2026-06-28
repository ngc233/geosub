import { headers } from "next/headers";
import Header from "./Header";
import {
  getSiteNavigation,
  type SiteNavigationItem,
} from "../lib/site-navigation";

async function getCurrentLocale() {
  const headerList = await headers();
  const locale = headerList.get("x-geosub-locale");

  return locale === "en" ? "en" : "zh";
}

export default async function HeaderShell() {
  const locale = await getCurrentLocale();
  let navItems: SiteNavigationItem[] = [];

  try {
    navItems = await getSiteNavigation({
      locale,
      position: "HEADER",
    });
  } catch {
    navItems = [];
  }

  return <Header initialNavItems={navItems} />;
}
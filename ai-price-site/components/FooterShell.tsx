import { headers } from "next/headers";
import Footer from "./Footer";
import {
  getSiteNavigation,
  type SiteNavigationItem,
} from "../lib/site-navigation";

async function getCurrentLocale() {
  const headerList = await headers();
  const locale = headerList.get("x-geosub-locale");

  return locale === "en" ? "en" : "zh";
}

export default async function FooterShell() {
  const locale = await getCurrentLocale();
  let navItems: SiteNavigationItem[] = [];

  try {
    navItems = await getSiteNavigation({
      locale,
      position: "FOOTER",
    });
  } catch {
    navItems = [];
  }

  return <Footer navItems={navItems} locale={locale} />;
}
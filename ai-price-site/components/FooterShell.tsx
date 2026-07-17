import Footer from "./Footer";
import {
  getSiteNavigationByLocale,
  type SiteNavigationByLocale,
} from "../lib/site-navigation";

export default async function FooterShell() {
  let navItemsByLocale: SiteNavigationByLocale = {};

  try {
    navItemsByLocale = await getSiteNavigationByLocale("FOOTER");
  } catch {
    navItemsByLocale = {};
  }

  return <Footer navItemsByLocale={navItemsByLocale} />;
}

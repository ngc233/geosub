import { filterPublicNavigation } from "../lib/public-navigation-filter";
import Header from "./Header";
import {
  getSiteNavigationByLocale,
  type SiteNavigationByLocale,
} from "../lib/site-navigation";

export default async function HeaderShell() {
  let navItemsByLocale: SiteNavigationByLocale = {};

  try {
    navItemsByLocale = filterPublicNavigation(await getSiteNavigationByLocale("HEADER"));
  } catch {
    navItemsByLocale = {};
  }

  return <Header initialNavItemsByLocale={navItemsByLocale} />;
}

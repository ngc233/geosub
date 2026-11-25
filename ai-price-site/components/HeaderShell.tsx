import { filterPublicNavigation } from "../lib/public-navigation-filter";
import Header from "./Header";
import {
  getSiteNavigationByLocale,
  isGta6NavigationPublished,
  type SiteNavigationByLocale,
} from "../lib/site-navigation";

export default async function HeaderShell() {
  const [navItemsByLocale, showGameNavigation] = await Promise.all([
    getSiteNavigationByLocale("HEADER")
      .then(filterPublicNavigation)
      .catch((): SiteNavigationByLocale => ({})),
    isGta6NavigationPublished().catch(() => false),
  ]);

  return <Header initialNavItemsByLocale={navItemsByLocale} showGameNavigation={showGameNavigation} />;
}

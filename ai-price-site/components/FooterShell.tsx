import { filterPublicNavigation } from "../lib/public-navigation-filter";
import Footer from "./Footer";
import {
  getSiteNavigationByLocale,
  isGameNavigationPublished,
  type SiteNavigationByLocale,
} from "../lib/site-navigation";

export default async function FooterShell() {
  const [navItemsByLocale, showGameNavigation] = await Promise.all([
    getSiteNavigationByLocale("FOOTER")
      .then(filterPublicNavigation)
      .catch((): SiteNavigationByLocale => ({})),
    isGameNavigationPublished().catch(() => false),
  ]);

  return <Footer navItemsByLocale={navItemsByLocale} showGameNavigation={showGameNavigation} />;
}

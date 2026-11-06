import { shouldHideFromPublicNavigation } from "./public-launch-routes.ts";
import type { SiteNavigationByLocale, SiteNavigationItem } from "./site-navigation";
export function filterPublicNavigation(locales: SiteNavigationByLocale): SiteNavigationByLocale {
  const visible = (item: {href:string}) => !shouldHideFromPublicNavigation(item.href);
  return Object.fromEntries(Object.entries(locales).map(([locale,items])=>[locale,
    (items ?? []).filter(visible).map((item): SiteNavigationItem=>({...item,
      match:item.match?.filter(href=>!shouldHideFromPublicNavigation(href)),
      children:item.children?.filter(visible),
    })),
  ]));
}

import { unstable_cache } from "next/cache";
import { Locale, NavigationPosition, PublishStatus } from "@prisma/client";
import { prisma } from "./prisma";
import {
  getNavigationLocaleByValue,
  getNavigationPositionByValue,
  navigationLocales,
  supportedNavigationLocalePaths,
  type NavigationLocaleValue,
  type NavigationPositionValue,
} from "./navigation-config";

export type SiteNavigationChild = {
  name: string;
  href: string;
  external?: boolean;
  description?: string;
};

export type SiteNavigationItem = {
  name: string;
  href: string;
  external?: boolean;
  match?: string[];
  children?: SiteNavigationChild[];
};

export type SiteNavigationByLocale = Partial<
  Record<NavigationLocaleValue, SiteNavigationItem[]>
>;

type NavigationRow = {
  id: string;
  label: string;
  href: string;
  external: boolean;
  parentId: string | null;
  sortOrder: number;
  createdAt: Date;
};

type LocalizedNavigationRow = NavigationRow & {
  locale: string;
};

const SITE_NAVIGATION_REVALIDATE_SECONDS = 6 * 60 * 60;

const getCachedNavigationRows = unstable_cache(
  async (locale: Locale, position: NavigationPosition) => prisma.navigationItem.findMany({
    where: {
      locale,
      position,
      status: PublishStatus.PUBLISHED,
    },
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
    select: {
      id: true,
      label: true,
      href: true,
      external: true,
      parentId: true,
      sortOrder: true,
      createdAt: true,
    },
  }),
  ["site-navigation-rows"],
  {
    revalidate: SITE_NAVIGATION_REVALIDATE_SECONDS,
    tags: ["site-navigation"],
  },
);

const getCachedNavigationRowsByLocale = unstable_cache(
  async (position: NavigationPosition) => prisma.navigationItem.findMany({
    where: {
      locale: {
        in: navigationLocales.map((locale) => locale.dbValue),
      },
      position,
      status: PublishStatus.PUBLISHED,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      label: true,
      href: true,
      external: true,
      parentId: true,
      sortOrder: true,
      createdAt: true,
      locale: true,
    },
  }),
  ["site-navigation-rows-by-locale"],
  {
    revalidate: SITE_NAVIGATION_REVALIDATE_SECONDS,
    tags: ["site-navigation"],
  },
);

type GetSiteNavigationOptions =
  | string
  | {
      locale?: string;
      position?: NavigationPosition | NavigationPositionValue | string;
    };

function normalizeInternalHref(href: string, external: boolean) {
  if (external) {
    return href;
  }

  const cleanHref = href.startsWith("/") ? href : `/${href}`;
  const parts = cleanHref.split("/");
  const maybeLocale = parts[1];

  if (supportedNavigationLocalePaths.includes(maybeLocale)) {
    const stripped = `/${parts.slice(2).join("/")}`;
    return stripped === "/" || stripped === "" ? "/" : stripped;
  }

  return cleanHref;
}

function buildMatchList(href: string, external: boolean) {
  if (external) {
    return [];
  }

  if (href === "/") {
    return ["/"];
  }

  const cleanHref =
    href.endsWith("/") && href !== "/" ? href.slice(0, -1) : href;

  if (cleanHref === "/guides") {
    return ["/guides", "/articles"];
  }

  return [cleanHref];
}

function normalizeOptions(options: GetSiteNavigationOptions = "zh") {
  if (typeof options === "string") {
    return {
      locale: getNavigationLocaleByValue(options),
      position: getNavigationPositionByValue("header"),
    };
  }

  return {
    locale: getNavigationLocaleByValue(options.locale),
    position: getNavigationPositionByValue(String(options.position || "header")),
  };
}

function buildSiteNavigationItems(items: NavigationRow[]) {
  const parentItems = items.filter((item) => !item.parentId);
  const childItems = items.filter((item) => item.parentId);
  const childrenByParentId = new Map<string, NavigationRow[]>();

  for (const child of childItems) {
    const list = childrenByParentId.get(child.parentId ?? "") ?? [];
    list.push(child);
    childrenByParentId.set(child.parentId ?? "", list);
  }

  return parentItems.map<SiteNavigationItem>((item) => {
    const href = normalizeInternalHref(item.href, item.external);
    const children = childrenByParentId.get(item.id) ?? [];

    return {
      name: item.label,
      href,
      external: item.external,
      match: buildMatchList(href, item.external),
      children: children.map((child) => {
        const childHref = normalizeInternalHref(child.href, child.external);

        return {
          name: child.label,
          href: childHref,
          external: child.external,
        };
      }),
    };
  });
}

export async function getSiteNavigation(
  options: GetSiteNavigationOptions = "zh"
) {
  const normalizedOptions = normalizeOptions(options);
  const items = await getCachedNavigationRows(
    normalizedOptions.locale.dbValue,
    normalizedOptions.position.dbValue,
  );

  return buildSiteNavigationItems(items);
}

export async function getSiteNavigationByLocale(
  position: NavigationPosition | NavigationPositionValue | string,
) {
  const normalizedPosition = getNavigationPositionByValue(String(position));
  const items = await getCachedNavigationRowsByLocale(
    normalizedPosition.dbValue,
  ) as LocalizedNavigationRow[];

  return navigationLocales.reduce<SiteNavigationByLocale>((result, locale) => {
    result[locale.value] = buildSiteNavigationItems(
      items.filter((item) => item.locale === locale.dbValue),
    );
    return result;
  }, {});
}

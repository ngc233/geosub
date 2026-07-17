import type { Locale, NavigationPosition } from "@prisma/client";
import {
  siteLocaleDefinitions,
  type SiteLocale,
} from "./site-locale";

export type NavigationLocaleValue = SiteLocale;

export type NavigationPositionValue = "header" | "footer";

export type NavigationLocaleConfig = {
  label: string;
  value: NavigationLocaleValue;
  dbValue: Locale;
  path: string;
  prefix: string;
};

export type NavigationPositionConfig = {
  label: string;
  value: NavigationPositionValue;
  dbValue: NavigationPosition;
};

export const navigationLocales: NavigationLocaleConfig[] = [
  {
    label: siteLocaleDefinitions.zh.label,
    value: "zh",
    dbValue: "ZH" as Locale,
    path: siteLocaleDefinitions.zh.path,
    prefix: `/${siteLocaleDefinitions.zh.path}/`,
  },
  {
    label: siteLocaleDefinitions.en.label,
    value: "en",
    dbValue: "EN" as Locale,
    path: siteLocaleDefinitions.en.path,
    prefix: `/${siteLocaleDefinitions.en.path}/`,
  },
];

export const navigationPositions: NavigationPositionConfig[] = [
  {
    label: "顶部导航",
    value: "header",
    dbValue: "HEADER" as NavigationPosition,
  },
  {
    label: "底部导航",
    value: "footer",
    dbValue: "FOOTER" as NavigationPosition,
  },
];

export const defaultNavigationLocale = navigationLocales[0];
export const defaultNavigationPosition = navigationPositions[0];

export const supportedNavigationLocalePaths = navigationLocales.map(
  (locale) => locale.path,
);

export function getNavigationLocaleByValue(value?: string) {
  const normalized = String(value || "").toLowerCase();

  return (
    navigationLocales.find((locale) => locale.value === normalized) ||
    defaultNavigationLocale
  );
}

export function getNavigationLocaleByDbValue(value?: Locale | string) {
  const normalized = String(value || "").toUpperCase();

  return (
    navigationLocales.find(
      (locale) => String(locale.dbValue).toUpperCase() === normalized,
    ) || defaultNavigationLocale
  );
}

export function getNavigationPositionByValue(value?: string) {
  const normalized = String(value || "").toLowerCase();

  return (
    navigationPositions.find((position) => position.value === normalized) ||
    defaultNavigationPosition
  );
}

export function getNavigationPositionByDbValue(
  value?: NavigationPosition | string,
) {
  const normalized = String(value || "").toUpperCase();

  return (
    navigationPositions.find(
      (position) => String(position.dbValue).toUpperCase() === normalized,
    ) || defaultNavigationPosition
  );
}

export function isNavigationHomeHref(href: string) {
  const cleanHref = href.split("#")[0].split("?")[0];

  return navigationLocales.some(
    (locale) =>
      cleanHref === `/${locale.path}/` || cleanHref === `/${locale.path}`,
  );
}

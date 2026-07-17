"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  getSiteLocaleDefinition,
  getSiteLocaleFromPath,
} from "../lib/site-locale";

export default function DocumentLocaleSync() {
  const pathname = usePathname();
  const locale = getSiteLocaleFromPath(pathname);
  const definition = getSiteLocaleDefinition(locale);

  useEffect(() => {
    document.documentElement.lang = definition.htmlLang;
    document.documentElement.dir = definition.direction;
  }, [definition.direction, definition.htmlLang]);

  return null;
}

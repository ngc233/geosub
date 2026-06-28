import fs from "node:fs";
import path from "node:path";
import { supportedNavigationLocalePaths } from "./navigation-config";

export type NavigationLinkHealthTone =
  | "success"
  | "warning"
  | "danger"
  | "muted"
  | "info";

export type NavigationLinkHealth = {
  label: string;
  tone: NavigationLinkHealthTone;
  detail: string;
};

function cleanHref(href: string) {
  const withoutHash = href.split("#")[0];
  const withoutQuery = withoutHash.split("?")[0];

  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1);
  }

  return withoutQuery || "/";
}

function routeExists(baseDir: string, segments: string[]): boolean {
  if (!fs.existsSync(baseDir)) {
    return false;
  }

  if (segments.length === 0) {
    return (
      fs.existsSync(path.join(baseDir, "page.tsx")) ||
      fs.existsSync(path.join(baseDir, "route.ts"))
    );
  }

  const [currentSegment, ...restSegments] = segments;
  const exactDir = path.join(baseDir, currentSegment);

  if (fs.existsSync(exactDir) && routeExists(exactDir, restSegments)) {
    return true;
  }

  const dynamicDirs = fs
    .readdirSync(baseDir, {
      withFileTypes: true,
    })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name.startsWith("[") &&
        entry.name.endsWith("]")
    );

  return dynamicDirs.some((entry) =>
    routeExists(path.join(baseDir, entry.name), restSegments)
  );
}

export function getNavigationLinkHealth({
  href,
  external,
  status,
}: {
  href: string;
  external: boolean;
  status: string;
}): NavigationLinkHealth {
  const disabled = status === "DRAFT";

  if (external || href.startsWith("https://") || href.startsWith("http://")) {
    return {
      label: disabled ? "停用外链" : "外链",
      tone: disabled ? "muted" : "info",
      detail: disabled
        ? "该菜单当前已停用，链接类型为外部链接。"
        : "外部链接不检查本地页面是否存在。",
    };
  }

  if (!href.startsWith("/")) {
    return {
      label: disabled ? "停用异常" : "格式异常",
      tone: "danger",
      detail: "内部链接必须以 / 开头。",
    };
  }

  const normalizedHref = cleanHref(href);
  const segments = normalizedHref.split("/").filter(Boolean);
  const localeSegment = segments[0];

  if (!localeSegment || !supportedNavigationLocalePaths.includes(localeSegment)) {
    return {
      label: disabled ? "停用异常" : "路径异常",
      tone: "danger",
      detail:
        "内部链接必须以当前已启用的语言路径开头，例如 /zh/ 或 /en/。",
    };
  }

  const appDir = path.join(process.cwd(), "app");
  const exists = routeExists(appDir, segments);

  if (exists) {
    return {
      label: disabled ? "已停用" : "页面正常",
      tone: disabled ? "muted" : "success",
      detail: disabled
        ? "该菜单当前已停用，但链接本身有对应页面。"
        : "该链接在 app 路由中有对应页面。",
    };
  }

  return {
    label: disabled ? "停用 · 404" : "404 风险",
    tone: "danger",
    detail: disabled
      ? "该菜单当前已停用，但链接没有对应页面。以后启用前需要先补页面或修改链接。"
      : "该链接没有找到对应页面，发布到前台后可能 404。",
  };
}
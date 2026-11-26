import { getChinesePlanDisplayName, getPlanDisplayName } from "./pricing-labels.ts";
import type { CanvasLocale } from "./canvas-ui-copy.ts";

/** Display only. Ranking and median calculations keep the original ratios. */
export function savingsPercent(value: number) {
  return Math.round((Math.abs(value) + Number.EPSILON) * 100);
}

export function savingsLabel(value: number, locale: CanvasLocale = "zh") {
  const percent = savingsPercent(value);
  switch (locale) {
    case "zh-tw":
      return value === 0 ? "與美國相同" : `比美國${value > 0 ? "低" : "高"} ${percent}%`;
    case "en":
      return value === 0 ? "Same as US" : `${percent}% ${value > 0 ? "cheaper" : "higher"} than US`;
    case "ja":
      return value === 0 ? "米国と同額" : `米国より ${percent}% ${value > 0 ? "安い" : "高い"}`;
    case "ko":
      return value === 0 ? "미국과 동일" : `미국보다 ${percent}% ${value > 0 ? "저렴" : "비쌈"}`;
    case "es":
      return value === 0 ? "Igual que EE. UU." : `${percent}% ${value > 0 ? "más barato" : "más caro"} que EE. UU.`;
    case "zh":
    default:
      if (value === 0) return "与美国相同";
      return `比美国${value > 0 ? "低" : "高"} ${percent}%`;
  }
}

export function toTraditionalChinesePlanText(text: string): string {
  return text
    .replace(/标准/g, "標準")
    .replace(/高级/g, "高級")
    .replace(/会员/g, "會員")
    .replace(/个人/g, "個人")
    .replace(/无广告/g, "無廣告")
    .replace(/广告/g, "廣告")
    .replace(/学生/g, "學生")
    .replace(/基础/g, "基礎")
    .replace(/专业/g, "專業")
    .replace(/旗舰/g, "旗艦")
    .replace(/轻量/g, "輕量")
    .replace(/无限/g, "無限")
    .replace(/订阅/g, "訂閱")
    .replace(/套餐/g, "方案")
    .replace(/移动端/g, "行動版")
    .replace(/移动/g, "行動")
    .replace(/团队/g, "團隊")
    .replace(/企业/g, "企業")
    .replace(/单人/g, "單人")
    .replace(/双人/g, "雙人")
    .replace(/连续/g, "連續")
    .replace(/畅享/g, "暢享")
    .replace(/优享/g, "優享")
    .replace(/尊享/g, "尊享")
    .replace(/独立/g, "獨立");
}

/** Never leak Simplified Chinese plan suffixes into en, ja, ko, es or zh-tw. */
export function getCanvasPlanDisplayName(
  productName: string,
  planName: string,
  locale: CanvasLocale = "zh",
): string {
  if (locale === "zh") {
    return getChinesePlanDisplayName(productName, planName);
  }
  if (locale === "zh-tw") {
    return toTraditionalChinesePlanText(getChinesePlanDisplayName(productName, planName));
  }
  return getPlanDisplayName(productName, planName);
}

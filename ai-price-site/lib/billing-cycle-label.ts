import type { ProductPlan } from "./public-pricing-model";
import type { SiteLocale } from "./site-locale";

type BillingCycle = ProductPlan["billing"];

const labels: Record<
  BillingCycle,
  Partial<Record<SiteLocale, { label: string; suffix: string }>> & {
    en: { label: string; suffix: string };
  }
> = {
  monthly: {
    en: { label: "Monthly", suffix: "/mo" },
    zh: { label: "月付", suffix: "/月" },
    "zh-tw": { label: "月付", suffix: "/月" },
    ja: { label: "月額", suffix: "/月" },
    ko: { label: "월간", suffix: "/월" },
    es: { label: "Mensual", suffix: "/mes" },
    tr: { label: "Aylik", suffix: "/ay" },
    ar: { label: "شهري", suffix: "/شهر" },
    fr: { label: "Mensuel", suffix: "/mois" },
    it: { label: "Mensile", suffix: "/mese" },
    de: { label: "Monatlich", suffix: "/Monat" },
    pt: { label: "Mensal", suffix: "/mes" },
  },
  yearly: {
    en: { label: "Yearly", suffix: "/yr" },
    zh: { label: "年付", suffix: "/年" },
    "zh-tw": { label: "年付", suffix: "/年" },
    ja: { label: "年額", suffix: "/年" },
    ko: { label: "연간", suffix: "/년" },
    es: { label: "Anual", suffix: "/ano" },
    tr: { label: "Yillik", suffix: "/yil" },
    ar: { label: "سنوي", suffix: "/سنة" },
    fr: { label: "Annuel", suffix: "/an" },
    it: { label: "Annuale", suffix: "/anno" },
    de: { label: "Jahrlich", suffix: "/Jahr" },
    pt: { label: "Anual", suffix: "/ano" },
  },
  weekly: {
    en: { label: "Weekly", suffix: "/wk" },
    zh: { label: "周付", suffix: "/周" },
    "zh-tw": { label: "週付", suffix: "/週" },
    ja: { label: "週額", suffix: "/週" },
    ko: { label: "주간", suffix: "/주" },
    es: { label: "Semanal", suffix: "/semana" },
    tr: { label: "Haftalik", suffix: "/hafta" },
    ar: { label: "أسبوعي", suffix: "/أسبوع" },
    fr: { label: "Hebdomadaire", suffix: "/semaine" },
    it: { label: "Settimanale", suffix: "/settimana" },
    de: { label: "Wochentlich", suffix: "/Woche" },
    pt: { label: "Semanal", suffix: "/semana" },
  },
  quarterly: {
    en: { label: "Quarterly", suffix: "/quarter" },
    zh: { label: "季付", suffix: "/季" },
    "zh-tw": { label: "季付", suffix: "/季" },
  },
  one_time: {
    en: { label: "One-time", suffix: "" },
    zh: { label: "一次性", suffix: "" },
    "zh-tw": { label: "一次性", suffix: "" },
  },
  lifetime: {
    en: { label: "Lifetime", suffix: "" },
    zh: { label: "终身", suffix: "" },
    "zh-tw": { label: "終身", suffix: "" },
  },
  unknown: {
    en: { label: "Billing varies", suffix: "" },
    zh: { label: "周期待核", suffix: "" },
    "zh-tw": { label: "週期待核", suffix: "" },
  },
};

function getCopy(cycle: BillingCycle, locale: SiteLocale) {
  const cycleCopy = labels[cycle] || labels.unknown;
  return cycleCopy[locale] || cycleCopy.en;
}

export function getBillingCycleLabel(cycle: BillingCycle, locale: SiteLocale) {
  return getCopy(cycle, locale).label;
}

export function getBillingCycleSuffix(cycle: BillingCycle, locale: SiteLocale) {
  return getCopy(cycle, locale).suffix;
}

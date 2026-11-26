export type PublicDateLabel = { text: string; dateTime: string };
export type PublicDateLocale = "zh" | "en" | "zh-tw" | "ja" | "ko" | "es";

const calendar = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const EN_SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const ES_SHORT_MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
] as const;

function calendarDate(value: Date | string): string | null {
  // Date-only evidence must keep its recorded calendar day, independent of TZ.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
      ? value
      : null;
  }
  // Reject locale-dependent strings rather than interpreting them differently on a server.
  if (
    typeof value === "string" &&
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  ) {
    return null;
  }
  if (typeof value === "string" && !calendarDate(value.slice(0, 10))) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = calendar.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Deterministic calendar label across unified locales without client/server timezone drift. */
export function formatPublicDate(
  value: Date | string | null | undefined,
  now: Date = new Date(),
  locale: PublicDateLocale = "zh",
): PublicDateLabel | null {
  if (value == null || value === "") return null;
  const day = calendarDate(value);
  const today = calendarDate(now);
  if (!day || !today) return null;
  const [year, month, date] = day.split("-");
  const sameYear = year === today.slice(0, 4);
  const m = Number(month);
  const d = Number(date);

  if (locale === "en") {
    const monthName = EN_SHORT_MONTHS[m - 1] ?? month;
    return {
      text: sameYear ? `${monthName} ${d}` : `${monthName} ${d}, ${year}`,
      dateTime: day,
    };
  }
  if (locale === "es") {
    const monthName = ES_SHORT_MONTHS[m - 1] ?? month;
    return {
      text: sameYear ? `${d} ${monthName}` : `${d} ${monthName} ${year}`,
      dateTime: day,
    };
  }
  if (locale === "ko") {
    return {
      text: sameYear ? `${m}월 ${d}일` : `${year}년 ${m}월 ${d}일`,
      dateTime: day,
    };
  }
  // zh, zh-tw, ja all share M月D日 / YYYY年M月D日
  const yearLabel = sameYear ? "" : `${year}年`;
  return { text: `${yearLabel}${m}月${d}日`, dateTime: day };
}

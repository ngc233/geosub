export type PublicDateLabel = { text: string; dateTime: string };

const calendar = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
});

function calendarDate(value: Date | string): string | null {
  // Date-only evidence must keep its recorded calendar day, independent of TZ.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
  }
  // Reject locale-dependent strings rather than interpreting them differently on a server.
  if (typeof value === "string" && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  if (typeof value === "string" && !calendarDate(value.slice(0, 10))) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = calendar.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Future callers render <time dateTime={label.dateTime}>{label.text}</time>.
 * No existing page consumes this helper in U1. Missing/invalid dates stay absent.
 */
export function formatPublicDate(value: Date | string | null | undefined, now: Date = new Date()): PublicDateLabel | null {
  if (value == null || value === "") return null;
  const day = calendarDate(value);
  const today = calendarDate(now);
  if (!day || !today) return null;
  const [year, month, date] = day.split("-");
  const yearLabel = year === today.slice(0, 4) ? "" : `${year}年`;
  return { text: `${yearLabel}${Number(month)}月${Number(date)}日`, dateTime: day };
}

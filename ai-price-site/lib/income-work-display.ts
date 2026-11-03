export function incomeWorkSource(rows: { source: string | null; year: number | null }[], english = false) {
  const sources = [...new Set(rows.map(row => row.source).filter((source): source is string => Boolean(source)))];
  const years = rows.map(row => row.year).filter((year): year is number => year !== null && Number.isFinite(year));
  if (!sources.length || !years.length) return "";
  const first = Math.min(...years), last = Math.max(...years);
  return `${sources.join(english ? ", " : "、")} · ${english ? "GNI per capita (Atlas, current US$)" : "人均国民总收入（Atlas，现价美元）"} · ${first === last ? first : `${first}–${last}`}`;
}

export function workDurationParts(hours: number) {
  if (!Number.isFinite(hours) || hours < 0) return null;
  const minutes = Math.round(hours * 60);
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60, underMinute: minutes === 0 };
}

export function workSquareColumns(width: number, minimumSize: number, gap: number, maximum: number) {
  if (![width, minimumSize, gap, maximum].every(Number.isFinite) || minimumSize <= 0 || maximum < 1 || gap < 0) return 1;
  return Math.max(1, Math.min(Math.floor(maximum), Math.floor((width + gap) / (minimumSize + gap))));
}

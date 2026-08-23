const REQUIRED_COLUMNS = [
  "date",
  "iso_a3",
  "currency_code",
  "local_price",
  "dollar_price",
];

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((value) => value.trim());
  for (const column of REQUIRED_COLUMNS) {
    if (!headers.includes(column)) throw new Error(`Big Mac CSV is missing ${column}.`);
  }

  return rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

export function selectLatestBigMacRows(text) {
  const latest = new Map();

  for (const raw of parseCsv(text)) {
    const iso3 = String(raw.iso_a3 || "").trim().toUpperCase();
    const observedOn = String(raw.date || "").trim();
    const localPrice = Number(raw.local_price);
    const priceUsd = Number(raw.dollar_price);
    const currency = String(raw.currency_code || "").trim().toUpperCase();

    if (
      !/^[A-Z]{3}$/.test(iso3) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(observedOn) ||
      !currency ||
      !Number.isFinite(localPrice) ||
      localPrice <= 0 ||
      !Number.isFinite(priceUsd) ||
      priceUsd <= 0
    ) {
      continue;
    }

    const candidate = { iso3, observedOn, currency, localPrice, priceUsd };
    const existing = latest.get(iso3);
    if (!existing || candidate.observedOn > existing.observedOn) latest.set(iso3, candidate);
  }

  return latest;
}

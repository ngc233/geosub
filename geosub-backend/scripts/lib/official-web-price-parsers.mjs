const APPLE_MUSIC_MARKETS = {
  US: {
    anchor: ["Choose the plan"],
    end: ["Questions? Answers."],
    plans: {
      individual: ["Individual"],
      family: ["Family"],
      student: ["Student"]
    },
    excluded: ["Apple One"]
  },
  BR: {
    anchor: ["Escolha o plano"],
    end: ["Perguntas? Nós temos as respostas."],
    plans: {
      individual: ["Individual"],
      family: ["Família"],
      student: ["Universitária"]
    },
    excluded: ["Apple One"]
  },
  TR: {
    anchor: ["Size en uygun aboneliği seçin"],
    end: ["Sorularınız varsa cevaplar burada"],
    plans: {
      individual: ["Bireysel"],
      family: ["Aile"],
      student: ["Öğrenci"]
    },
    excluded: ["Apple One"]
  },
  JP: {
    anchor: ["あなたにぴったりのプランを選べます"],
    end: ["もっと知りたいですか"],
    plans: {
      individual: ["個人"],
      family: ["ファミリー"],
      student: ["学生"]
    },
    excluded: ["Apple One"]
  },
  DE: {
    anchor: ["Wähl ein Abo"],
    end: ["Fragen? Antworten."],
    plans: {
      individual: ["Einzelperson"],
      family: ["Familie"],
      student: ["Studierende"]
    },
    excluded: ["Apple One"]
  }
};

const PARSER_VERSIONS = {
  apple_music: "apple-music-official-web-v1"
};

const PLAN_NAMES = {
  individual: "Apple Music Individual",
  family: "Apple Music Family",
  student: "Apple Music Student"
};

export function normalizeOfficialWebText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\p{Cf}+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedIndexOf(text, aliases, fromIndex = 0) {
  const lowerText = text.toLocaleLowerCase();
  let best = -1;

  for (const alias of aliases) {
    const normalizedAlias = normalizeOfficialWebText(alias).toLocaleLowerCase();
    const index = lowerText.indexOf(normalizedAlias, fromIndex);
    if (index >= 0 && (best < 0 || index < best)) best = index;
  }

  return best;
}

function parseLocalizedNumber(rawValue, currency) {
  let value = String(rawValue ?? "").replace(/\s+/g, "").replace(/[^\d.,]/g, "");
  if (!value) return null;

  if (currency === "JPY") {
    value = value.replace(/[.,]/g, "");
  } else {
    const comma = value.lastIndexOf(",");
    const dot = value.lastIndexOf(".");
    const separator = Math.max(comma, dot);

    if (separator >= 0) {
      const fractionalDigits = value.length - separator - 1;
      if (fractionalDigits === 2) {
        value = `${value.slice(0, separator).replace(/[.,]/g, "")}.${value.slice(separator + 1)}`;
      } else {
        value = value.replace(/[.,]/g, "");
      }
    }
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function currencyPattern(currency) {
  const numeric = "([0-9][0-9.,]*)";
  switch (currency) {
    case "USD":
      return new RegExp(`(?:US\\$|\\$)\\s*${numeric}`, "giu");
    case "BRL":
      return new RegExp(`R\\$\\s*${numeric}`, "giu");
    case "TRY":
      return new RegExp(`(?:₺\\s*${numeric}|${numeric}\\s*(?:TL|₺))`, "giu");
    case "JPY":
      return new RegExp(`(?:(?:¥|￥)\\s*${numeric}|${numeric}\\s*円)`, "giu");
    case "EUR":
      return new RegExp(`(?:€\\s*${numeric}|${numeric}\\s*€)`, "giu");
    default:
      throw new Error(`Unsupported official Web currency: ${currency}.`);
  }
}

function findPrices(text, currency) {
  const matches = [];
  const pattern = currencyPattern(currency);

  for (const match of text.matchAll(pattern)) {
    const numericGroup = match.slice(1).find((value) => value !== undefined);
    const rawPrice = parseLocalizedNumber(numericGroup, currency);
    if (rawPrice === null) continue;
    matches.push({
      raw_price: rawPrice,
      observed_price_text: normalizeOfficialWebText(match[0])
    });
  }

  const byPrice = new Map();
  for (const match of matches) {
    if (!byPrice.has(match.raw_price)) byPrice.set(match.raw_price, match);
  }
  return [...byPrice.values()];
}

function parseAppleMusic({ text, countryCode, currency }) {
  const normalizedText = normalizeOfficialWebText(text);
  const code = String(countryCode ?? "").toUpperCase();
  const market = APPLE_MUSIC_MARKETS[code];
  const issues = [];

  if (!market) {
    return {
      parser_key: "apple_music",
      parser_version: PARSER_VERSIONS.apple_music,
      complete: false,
      candidates: [],
      issues: [`unsupported_market:${code || "unknown"}`]
    };
  }

  const anchorIndex = normalizedIndexOf(normalizedText, market.anchor);
  if (anchorIndex < 0) {
    return {
      parser_key: "apple_music",
      parser_version: PARSER_VERSIONS.apple_music,
      complete: false,
      candidates: [],
      issues: ["plan_section_missing"]
    };
  }

  let section = normalizedText.slice(anchorIndex);
  const endIndex = normalizedIndexOf(section, market.end, 1);
  if (endIndex > 0) section = section.slice(0, endIndex);

  const boundaries = [];
  for (const [planSlug, aliases] of Object.entries(market.plans)) {
    const index = normalizedIndexOf(section, aliases);
    if (index < 0) {
      issues.push(`plan_heading_missing:${planSlug}`);
    } else {
      boundaries.push({ kind: "plan", planSlug, index });
    }
  }
  for (const alias of market.excluded) {
    const index = normalizedIndexOf(section, [alias]);
    if (index >= 0) boundaries.push({ kind: "excluded", index });
  }
  boundaries.sort((left, right) => left.index - right.index);

  const candidates = [];
  for (let index = 0; index < boundaries.length; index += 1) {
    const boundary = boundaries[index];
    if (boundary.kind !== "plan") continue;

    const nextBoundary = boundaries[index + 1];
    const block = section.slice(boundary.index, nextBoundary?.index ?? section.length);
    const prices = findPrices(block, currency);
    if (prices.length === 0) {
      issues.push(`price_missing:${boundary.planSlug}`);
      continue;
    }
    if (prices.length > 1) {
      issues.push(`ambiguous_prices:${boundary.planSlug}`);
      continue;
    }

    const price = prices[0];
    candidates.push({
      plan_slug: boundary.planSlug,
      plan_name: PLAN_NAMES[boundary.planSlug],
      raw_price: price.raw_price,
      currency,
      billing_cycle: "monthly",
      price_type: "list_price",
      observed_price_text: price.observed_price_text,
      evidence_text: block.slice(0, 280)
    });
  }

  const candidatePlans = new Set(candidates.map((candidate) => candidate.plan_slug));
  for (const requiredPlan of Object.keys(market.plans)) {
    if (!candidatePlans.has(requiredPlan) && !issues.some((issue) => issue.endsWith(`:${requiredPlan}`))) {
      issues.push(`candidate_missing:${requiredPlan}`);
    }
  }

  return {
    parser_key: "apple_music",
    parser_version: PARSER_VERSIONS.apple_music,
    complete: issues.length === 0 && candidates.length === 3,
    candidates,
    issues
  };
}

export function parseOfficialWebPriceText({ parserKey, text, countryCode, currency }) {
  if (parserKey === "apple_music") {
    return parseAppleMusic({ text, countryCode, currency });
  }

  return {
    parser_key: parserKey,
    parser_version: null,
    complete: false,
    candidates: [],
    issues: [`unsupported_parser:${parserKey || "unknown"}`]
  };
}

export function getOfficialWebParserVersion(parserKey) {
  return PARSER_VERSIONS[parserKey] ?? null;
}

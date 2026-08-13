function normalizeRateDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  }
  return String(value ?? "").trim().slice(0, 10);
}

function normalizeExpectedRow(row) {
  return {
    quote: String(row.quote ?? row.quote_currency ?? "").trim().toUpperCase(),
    rate: Number(row.rate),
    rateDate: normalizeRateDate(row.rateDate ?? row.rate_date),
    source: String(row.source || "").trim(),
  };
}

function rateMatches(expected, actual, tolerance) {
  if (!Number.isFinite(expected) || !Number.isFinite(actual)) return false;
  const scale = Math.max(Math.abs(expected), Math.abs(actual), 1);
  return Math.abs(expected - actual) <= tolerance * scale;
}

export function compareExchangeRateShadow({
  expectedRun,
  expectedRows,
  shadowPlan,
  rateTolerance = 1e-12,
}) {
  const mismatches = [];
  const normalizedExpected = expectedRows.map(normalizeExpectedRow);
  const expectedByQuote = new Map(normalizedExpected.map((row) => [row.quote, row]));
  const shadowByQuote = new Map(shadowPlan.rows.map((row) => [row.quote, row]));

  if (expectedRun.status !== shadowPlan.status) {
    mismatches.push({
      kind: "status",
      expected: expectedRun.status,
      actual: shadowPlan.status,
    });
  }
  if (Number(expectedRun.rowCount) !== shadowPlan.rows.length) {
    mismatches.push({
      kind: "row-count",
      expected: Number(expectedRun.rowCount),
      actual: shadowPlan.rows.length,
    });
  }

  for (const [quote, expected] of expectedByQuote) {
    const actual = shadowByQuote.get(quote);
    if (!actual) {
      mismatches.push({ kind: "missing-in-shadow", quote });
      continue;
    }
    if (!rateMatches(expected.rate, actual.rate, rateTolerance)) {
      mismatches.push({
        kind: "rate",
        quote,
        expected: expected.rate,
        actual: actual.rate,
      });
    }
    if (expected.rateDate !== actual.rateDate) {
      mismatches.push({
        kind: "rate-date",
        quote,
        expected: expected.rateDate,
        actual: actual.rateDate,
      });
    }
    if (expected.source !== actual.source) {
      mismatches.push({
        kind: "source",
        quote,
        expected: expected.source,
        actual: actual.source,
      });
    }
  }

  for (const quote of shadowByQuote.keys()) {
    if (!expectedByQuote.has(quote)) {
      mismatches.push({ kind: "unexpected-in-shadow", quote });
    }
  }

  return {
    passed: mismatches.length === 0,
    expectedStatus: expectedRun.status,
    shadowStatus: shadowPlan.status,
    expectedRowCount: normalizedExpected.length,
    shadowRowCount: shadowPlan.rows.length,
    mismatches,
  };
}

export function createRecordedProviderFetch(rows) {
  const payloadByProvider = new Map();

  for (const row of rows) {
    const source = String(row.source || "").trim();
    if (!source || payloadByProvider.has(source)) continue;
    let payload = row.providerPayload ?? row.provider_payload;
    if (typeof payload === "string") payload = JSON.parse(payload);
    if (payload && typeof payload === "object") {
      payloadByProvider.set(source, payload);
    }
  }

  return async (_url, provider) => {
    const payload = payloadByProvider.get(provider);
    if (!payload) {
      throw new Error(`Recorded legacy run has no ${provider} provider payload.`);
    }
    return payload;
  };
}

export function summarizeExchangeRateShadowEvidence({
  entries,
  requiredCycles = 3,
}) {
  if (!Number.isInteger(requiredCycles) || requiredCycles < 1) {
    throw new Error("requiredCycles must be a positive integer.");
  }

  const validEntries = entries
    .filter(
      (entry) =>
        entry &&
        typeof entry.legacyRunId === "string" &&
        entry.legacyRunId.length > 0 &&
        Number.isFinite(Date.parse(entry.checkedAt)) &&
        typeof entry.comparison?.passed === "boolean",
    )
    .sort((left, right) => Date.parse(left.checkedAt) - Date.parse(right.checkedAt));

  const latestByRun = new Map();
  for (const entry of validEntries) latestByRun.set(entry.legacyRunId, entry);
  const distinctRuns = [...latestByRun.values()].sort(
    (left, right) => Date.parse(left.checkedAt) - Date.parse(right.checkedAt),
  );

  let consecutivePassed = 0;
  for (let index = distinctRuns.length - 1; index >= 0; index -= 1) {
    if (!distinctRuns[index].comparison.passed) break;
    consecutivePassed += 1;
  }

  const latest = distinctRuns.at(-1) || null;
  return {
    ready: consecutivePassed >= requiredCycles,
    requiredCycles,
    consecutivePassed,
    remainingCycles: Math.max(requiredCycles - consecutivePassed, 0),
    attemptCount: validEntries.length,
    distinctRunCount: distinctRuns.length,
    passedRunCount: distinctRuns.filter((entry) => entry.comparison.passed).length,
    failedRunCount: distinctRuns.filter((entry) => !entry.comparison.passed).length,
    latestRunId: latest?.legacyRunId || null,
    latestCheckedAt: latest?.checkedAt || null,
    latestPassed: latest?.comparison.passed ?? null,
  };
}

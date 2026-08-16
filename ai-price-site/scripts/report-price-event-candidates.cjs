#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { Client } = require("pg");

const DEFAULT_LOOKBACK_DAYS = 90;
const DEFAULT_BASELINE_DAYS = 365;
const DEFAULT_LIMIT = 50;
const DEFAULT_STATEMENT_TIMEOUT_MS = 15_000;

const PRICE_EVENT_QUERY = `
SELECT
  observation.id,
  observation.product_id,
  product.slug AS product_slug,
  product.name AS product_name,
  observation.plan_id,
  plan.slug AS plan_slug,
  plan.name AS plan_name,
  plan.billing_cycle::text AS billing_cycle,
  observation.country_id,
  country.code AS country_code,
  COALESCE(country.name_zh, country.name_en, country.code) AS country_name,
  observation.source_id,
  source.name AS source_name,
  source.type::text AS source_type,
  observation.source_level::text AS source_level,
  observation.raw_price::text AS raw_price,
  observation.currency,
  observation.converted_usd::text AS converted_usd,
  observation.observed_at,
  observation.source_url,
  observation.billing_platform::text AS billing_platform,
  observation.price_type::text AS price_type,
  observation.confidence_score,
  observation.anomaly_flag,
  observation.anomaly_reason,
  observation.status::text AS observation_status,
  observation.raw_payload ->> 'auto_review_reason_code' AS review_reason_code,
  observation.raw_payload ->> 'item_name' AS observed_item_name,
  observation.raw_payload ->> 'observed_price_text' AS observed_price_text,
  observation.raw_payload #>> '{raw_snapshot,planSpecSlug}' AS observed_plan_spec_slug,
  observation.raw_payload #>> '{raw_snapshot,originalObservedPriceText}' AS original_observed_price_text,
  observation.raw_payload #>> '{raw_snapshot,priceSelection,variantCount}' AS price_variant_count,
  observation.raw_payload #>> '{raw_snapshot,priceSelection,selectedCount}' AS selected_price_count,
  observation.raw_payload #>> '{raw_snapshot,priceSelection,runnerUpCount}' AS runner_up_price_count,
  observation.parser_version,
  formal_price.local_price::text AS formal_local_price,
  formal_price.currency AS formal_currency,
  formal_price.status::text AS formal_status,
  formal_price.data_quality::text AS formal_data_quality,
  formal_price.primary_source_id::text AS formal_primary_source_id,
  formal_price.last_checked_at AS formal_last_checked_at
FROM price_observations observation
JOIN products product ON product.id = observation.product_id
JOIN plans plan ON plan.id = observation.plan_id
JOIN countries country ON country.id = observation.country_id
LEFT JOIN price_sources source ON source.id = observation.source_id
LEFT JOIN region_prices formal_price
  ON formal_price.plan_id = observation.plan_id
  AND formal_price.country_id = observation.country_id
  AND formal_price.billing_platform = observation.billing_platform
  AND formal_price.price_type = observation.price_type
WHERE observation.observed_at >= NOW() - ($1::int * INTERVAL '1 day')
  AND product.status = 'published'::publish_status
  AND plan.status = 'published'::publish_status
  AND ($2::text IS NULL OR product.slug = $2::text)
ORDER BY
  product.slug,
  plan.slug,
  country.code,
  observation.source_id,
  observation.billing_platform,
  observation.price_type,
  observation.currency,
  observation.observed_at;
`;

function loadEnvironment(rootDir = process.cwd()) {
  for (const fileName of [".env.local", ".env"]) {
    const filePath = path.join(rootDir, fileName);
    if (fs.existsSync(filePath)) {
      dotenv.config({ path: filePath, override: false, quiet: true });
    }
  }
}

function parseBoundedInteger(value, label, { min, max }) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

function parseArguments(argv) {
  const options = {
    days: DEFAULT_LOOKBACK_DAYS,
    baselineDays: DEFAULT_BASELINE_DAYS,
    limit: DEFAULT_LIMIT,
    product: null,
    json: false,
    statementTimeoutMs: DEFAULT_STATEMENT_TIMEOUT_MS,
  };

  for (const argument of argv) {
    if (argument === "--json") {
      options.json = true;
    } else if (argument.startsWith("--days=")) {
      options.days = parseBoundedInteger(argument.slice(7), "days", {
        min: 1,
        max: 365,
      });
    } else if (argument.startsWith("--baseline-days=")) {
      options.baselineDays = parseBoundedInteger(
        argument.slice(16),
        "baseline-days",
        { min: 2, max: 730 },
      );
    } else if (argument.startsWith("--limit=")) {
      options.limit = parseBoundedInteger(argument.slice(8), "limit", {
        min: 1,
        max: 500,
      });
    } else if (argument.startsWith("--product=")) {
      const product = argument.slice(10).trim().toLowerCase();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product)) {
        throw new Error("product must be a valid product slug.");
      }
      options.product = product;
    } else if (argument.startsWith("--timeout-ms=")) {
      options.statementTimeoutMs = parseBoundedInteger(
        argument.slice(13),
        "timeout-ms",
        { min: 1_000, max: 120_000 },
      );
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (options.baselineDays < options.days) {
    throw new Error("baseline-days must be greater than or equal to days.");
  }

  return options;
}

function decimalToMinorUnits(value) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) return null;

  const sign = match[1] === "-" ? -1 : 1;
  const whole = Number(match[2]);
  const fractionText = (match[3] || "").padEnd(3, "0");
  const fraction = Number(fractionText.slice(0, 2));
  const roundDigit = Number(fractionText[2] || "0");
  const minorUnits = whole * 100 + fraction + (roundDigit >= 5 ? 1 : 0);
  return sign * minorUnits;
}

function formatMinorUnits(value) {
  const absolute = Math.abs(value);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${value < 0 ? "-" : ""}${whole}.${fraction}`;
}

function toUtcDay(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeEvidenceText(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/\s+/g, " ");
}

function isReviewableObservation(row) {
  return ["pending", "approved"].includes(
    normalizeStatus(row.observation_status),
  );
}

const OFFICIAL_SOURCE_TYPES = new Set([
  "official_page",
  "help_center",
  "api",
  "app_store",
  "google_play",
]);

function isHighTrustOfficialRow(row) {
  return (
    String(row.source_level || "").toUpperCase() === "A" &&
    OFFICIAL_SOURCE_TYPES.has(normalizeStatus(row.source_type)) &&
    normalizeStatus(row.observation_status) === "approved" &&
    Number(row.confidence_score || 0) >= 80
  );
}

function isIndependentSingleEvidence(row) {
  return isHighTrustOfficialRow(row) && !row.review_reason_code;
}

function buildIdentity(row) {
  const values = [
    row.product_id,
    row.plan_id,
    row.country_id,
    row.source_id,
    row.billing_platform,
    row.price_type,
    row.currency,
    row.billing_cycle,
  ];
  if (values.some((value) => value === null || value === undefined || value === "")) {
    return null;
  }
  return values.map((value) => String(value).toLowerCase()).join("|");
}

function pickLatestRow(rows) {
  return [...rows].sort(
    (left, right) =>
      new Date(right.observed_at).getTime() - new Date(left.observed_at).getTime(),
  )[0];
}

function buildRounds(rows) {
  const byDay = new Map();
  for (const row of rows) {
    const day = toUtcDay(row.observed_at);
    if (!day) continue;
    const bucket = byDay.get(day) || [];
    bucket.push(row);
    byDay.set(day, bucket);
  }

  return [...byDay.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([day, dayRows]) => {
      const priceValues = new Set(
        dayRows
          .map((row) => decimalToMinorUnits(row.raw_price))
          .filter((value) => value !== null),
      );
      return {
        day,
        rows: dayRows,
        priceValues: [...priceValues],
        latestRow: pickLatestRow(dayRows),
      };
    });
}

function hasFxOnlyMovement(rows) {
  const localPrices = new Set(
    rows
      .map((row) => decimalToMinorUnits(row.raw_price))
      .filter((value) => value !== null),
  );
  const convertedPrices = new Set(
    rows
      .map((row) => decimalToMinorUnits(row.converted_usd))
      .filter((value) => value !== null),
  );
  return localPrices.size === 1 && convertedPrices.size > 1;
}

function getFormalBaseline(latestRow, currentPrice) {
  const formalPrice = decimalToMinorUnits(latestRow.formal_local_price);
  if (formalPrice === null || formalPrice <= 0 || formalPrice === currentPrice) {
    return null;
  }
  if (normalizeStatus(latestRow.formal_status) !== "published") return null;
  if (
    String(latestRow.formal_currency || "").toUpperCase() !==
    String(latestRow.currency || "").toUpperCase()
  ) {
    return null;
  }
  if (
    latestRow.formal_primary_source_id &&
    String(latestRow.formal_primary_source_id) !== String(latestRow.source_id)
  ) {
    return null;
  }
  return formalPrice;
}

function evaluatePlanEvidence({ latestRow, previousRound, currentStreak }) {
  const currentItemNames = [
    ...new Set(
      currentStreak
        .flatMap((round) => round.rows)
        .map((row) => normalizeEvidenceText(row.observed_item_name))
        .filter(Boolean),
    ),
  ];
  const planSpecSlug = normalizeEvidenceText(latestRow.observed_plan_spec_slug);
  const expectedPlanSlug = normalizeEvidenceText(latestRow.plan_slug);

  if (planSpecSlug && planSpecSlug !== expectedPlanSlug) {
    return {
      status: "plan_spec_mismatch",
      currentItemNames,
      previousItemNames: [],
    };
  }
  if (currentItemNames.length === 0) {
    return {
      status: "missing_current_item_name",
      currentItemNames,
      previousItemNames: [],
    };
  }
  if (currentItemNames.length > 1) {
    return {
      status: "multiple_current_item_names",
      currentItemNames,
      previousItemNames: [],
    };
  }
  if (Number(latestRow.price_variant_count || 0) > 1) {
    return {
      status: "ambiguous_current_price_variants",
      currentItemNames,
      previousItemNames: [],
    };
  }
  if (!previousRound) {
    return {
      status: "official_single_evidence",
      currentItemNames,
      previousItemNames: [],
    };
  }

  const previousItemNames = [
    ...new Set(
      previousRound.rows
        .map((row) => normalizeEvidenceText(row.observed_item_name))
        .filter(Boolean),
    ),
  ];
  if (previousItemNames.length === 0) {
    return {
      status: "missing_previous_item_name",
      currentItemNames,
      previousItemNames,
    };
  }
  if (
    previousItemNames.length !== 1 ||
    previousItemNames[0] !== currentItemNames[0]
  ) {
    return {
      status: "item_name_changed",
      currentItemNames,
      previousItemNames,
    };
  }
  return {
    status: "exact_item_match",
    currentItemNames,
    previousItemNames,
  };
}

function createEmptySummary(totalRows) {
  return {
    observationRows: totalRows,
    usableRows: 0,
    identityGroups: 0,
    eligibleCandidates: 0,
    detectedCandidates: 0,
    eventGroups: 0,
    eligibleEventGroups: 0,
    excludedAnomalyRows: 0,
    excludedNonReviewableStatusRows: 0,
    excludedInvalidPriceRows: 0,
    excludedMissingIdentityRows: 0,
    conflictingIdentityGroups: 0,
    fxOnlyIdentityGroups: 0,
    insufficientBaselineGroups: 0,
    outsideLookbackGroups: 0,
    insufficientTrustedBaselineGroups: 0,
    planEvidenceReviewCandidates: 0,
  };
}

function buildEventGroups(candidates) {
  const buckets = new Map();
  for (const candidate of candidates) {
    const key = [
      candidate.productSlug,
      candidate.type,
      candidate.firstSeenAt,
      candidate.billingPlatform,
      candidate.priceType,
      candidate.billingCycle,
      candidate.sourceName,
    ].join("|");
    const bucket = buckets.get(key) || [];
    bucket.push(candidate);
    buckets.set(key, bucket);
  }

  const groups = [];
  for (const [bucketKey, bucket] of buckets.entries()) {
    const parents = bucket.map((_, index) => index);
    const find = (index) => {
      let root = index;
      while (parents[root] !== root) root = parents[root];
      while (parents[index] !== index) {
        const next = parents[index];
        parents[index] = root;
        index = next;
      }
      return root;
    };
    const union = (left, right) => {
      const leftRoot = find(left);
      const rightRoot = find(right);
      if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot;
    };
    const firstByPlan = new Map();
    const firstByCountry = new Map();
    bucket.forEach((candidate, index) => {
      if (firstByPlan.has(candidate.planSlug)) {
        union(index, firstByPlan.get(candidate.planSlug));
      } else {
        firstByPlan.set(candidate.planSlug, index);
      }
      if (firstByCountry.has(candidate.countryCode)) {
        union(index, firstByCountry.get(candidate.countryCode));
      } else {
        firstByCountry.set(candidate.countryCode, index);
      }
    });

    const components = new Map();
    bucket.forEach((candidate, index) => {
      const root = find(index);
      const component = components.get(root) || [];
      component.push(candidate);
      components.set(root, component);
    });

    for (const component of components.values()) {
      const planSlugs = [...new Set(component.map((item) => item.planSlug))].sort();
      const countryCodes = [
        ...new Set(component.map((item) => item.countryCode)),
      ].sort();
      const eligibleCount = component.filter(
        (item) => item.status === "eligible",
      ).length;
      const blockers = [
        ...new Set(component.flatMap((item) => item.blockers || [])),
      ].sort();
      groups.push({
        id: `${bucketKey}|${planSlugs.join(",")}|${countryCodes.join(",")}`,
        status: eligibleCount === component.length ? "eligible" : "detected",
        type: component[0].type,
        productSlug: component[0].productSlug,
        productName: component[0].productName,
        sourceName: component[0].sourceName,
        firstSeenAt: component[0].firstSeenAt,
        lastSeenAt: component.reduce(
          (latest, item) => (item.lastSeenAt > latest ? item.lastSeenAt : latest),
          component[0].lastSeenAt,
        ),
        planSlugs,
        countryCodes,
        planCount: planSlugs.length,
        regionCount: countryCodes.length,
        candidateCount: component.length,
        eligibleCandidateCount: eligibleCount,
        blockers,
        nextAction:
          blockers.length === 0
            ? "replay_official_source_before_editorial_use"
            : "resolve_candidate_blockers",
        evidenceSamples: component.slice(0, 5).map((item) => ({
          planSlug: item.planSlug,
          countryCode: item.countryCode,
          previousLocalPrice: item.previousLocalPrice,
          currentLocalPrice: item.currentLocalPrice,
          currency: item.currency,
          previousItemNames: item.previousItemNames,
          currentItemNames: item.currentItemNames,
          sourceUrl: item.sourceUrl,
        })),
      });
    }
  }

  return groups.sort((left, right) => {
    if (left.status !== right.status) return left.status === "eligible" ? -1 : 1;
    if (left.candidateCount !== right.candidateCount) {
      return right.candidateCount - left.candidateCount;
    }
    return right.firstSeenAt.localeCompare(left.firstSeenAt);
  });
}

function buildPriceEventCandidateReport(
  rows,
  {
    days = DEFAULT_LOOKBACK_DAYS,
    baselineDays = DEFAULT_BASELINE_DAYS,
    limit = DEFAULT_LIMIT,
    product = null,
    now = new Date(),
  } = {},
) {
  const summary = createEmptySummary(rows.length);
  const groups = new Map();
  const rejections = [];
  const lookbackStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  for (const row of rows) {
    if (row.anomaly_flag) {
      summary.excludedAnomalyRows += 1;
      continue;
    }
    if (!isReviewableObservation(row)) {
      summary.excludedNonReviewableStatusRows += 1;
      continue;
    }
    const price = decimalToMinorUnits(row.raw_price);
    if (price === null || price <= 0) {
      summary.excludedInvalidPriceRows += 1;
      continue;
    }
    const identity = buildIdentity(row);
    if (!identity) {
      summary.excludedMissingIdentityRows += 1;
      continue;
    }
    summary.usableRows += 1;
    const group = groups.get(identity) || [];
    group.push(row);
    groups.set(identity, group);
  }

  summary.identityGroups = groups.size;
  const candidates = [];

  for (const [identity, groupRows] of groups.entries()) {
    const convertedUsdMovedWithoutLocalMovement = hasFxOnlyMovement(groupRows);
    const rounds = buildRounds(groupRows);
    const conflictRound = rounds.find((round) => round.priceValues.length !== 1);
    if (conflictRound) {
      summary.conflictingIdentityGroups += 1;
      const sample = conflictRound.latestRow;
      rejections.push({
        identity,
        reason: "conflicting_local_prices_in_same_utc_day",
        day: conflictRound.day,
        productSlug: sample.product_slug,
        planSlug: sample.plan_slug,
        countryCode: sample.country_code,
      });
      continue;
    }
    if (rounds.length === 0) continue;

    const latestRound = rounds[rounds.length - 1];
    const latestRow = latestRound.latestRow;
    const currentPrice = latestRound.priceValues[0];
    let streakStartIndex = rounds.length - 1;
    while (
      streakStartIndex > 0 &&
      rounds[streakStartIndex - 1].priceValues[0] === currentPrice
    ) {
      streakStartIndex -= 1;
    }

    const currentStreak = rounds.slice(streakStartIndex);
    const previousRound = streakStartIndex > 0 ? rounds[streakStartIndex - 1] : null;
    const formalBaseline = getFormalBaseline(latestRow, currentPrice);
    const previousPrice = previousRound
      ? previousRound.priceValues[0]
      : formalBaseline;

    if (previousPrice === null || previousPrice === currentPrice) {
      if (convertedUsdMovedWithoutLocalMovement) {
        summary.fxOnlyIdentityGroups += 1;
      }
      summary.insufficientBaselineGroups += 1;
      continue;
    }

    const previousRoundIsTrusted = Boolean(
      previousRound?.rows.some(isHighTrustOfficialRow),
    );
    const formalBaselineIsTrusted = formalBaseline === previousPrice;
    if (!previousRoundIsTrusted && !formalBaselineIsTrusted) {
      summary.insufficientTrustedBaselineGroups += 1;
      rejections.push({
        identity,
        reason: "previous_local_price_lacks_trusted_evidence",
        productSlug: latestRow.product_slug,
        planSlug: latestRow.plan_slug,
        countryCode: latestRow.country_code,
      });
      continue;
    }

    const firstSeenAt = new Date(`${currentStreak[0].day}T00:00:00.000Z`);
    if (firstSeenAt < lookbackStart) {
      summary.outsideLookbackGroups += 1;
      continue;
    }

    const latestStatus = normalizeStatus(latestRow.observation_status);
    const highTrustSingleEvidence = isIndependentSingleEvidence(latestRow);
    const hasStableRounds = currentStreak.length >= 2;
    const planEvidence = evaluatePlanEvidence({
      latestRow,
      previousRound,
      currentStreak,
    });
    const planEvidenceIsComplete = [
      "exact_item_match",
      "official_single_evidence",
    ].includes(planEvidence.status);
    if (!planEvidenceIsComplete) summary.planEvidenceReviewCandidates += 1;
    const evidenceThresholdMet = hasStableRounds || highTrustSingleEvidence;
    const blockers = [];
    if (!evidenceThresholdMet) blockers.push("insufficient_independent_evidence");
    if (!planEvidenceIsComplete) {
      blockers.push(`plan_evidence:${planEvidence.status}`);
    }
    const status =
      evidenceThresholdMet && planEvidenceIsComplete ? "eligible" : "detected";
    const delta = currentPrice - previousPrice;
    const percentChange = Number(((delta / previousPrice) * 100).toFixed(2));

    candidates.push({
      identity,
      status,
      type: delta > 0 ? "local_price_increase" : "local_price_decrease",
      productSlug: latestRow.product_slug,
      productName: latestRow.product_name,
      planSlug: latestRow.plan_slug,
      planName: latestRow.plan_name,
      countryCode: latestRow.country_code,
      countryName: latestRow.country_name,
      sourceName: latestRow.source_name,
      sourceType: latestRow.source_type,
      sourceLevel: latestRow.source_level,
      billingPlatform: latestRow.billing_platform,
      priceType: latestRow.price_type,
      billingCycle: latestRow.billing_cycle,
      currency: latestRow.currency,
      previousLocalPrice: formatMinorUnits(previousPrice),
      currentLocalPrice: formatMinorUnits(currentPrice),
      localChange: formatMinorUnits(delta),
      percentChange,
      stableRoundCount: currentStreak.length,
      evidenceRule: hasStableRounds
        ? "two_or_more_distinct_utc_collection_days"
        : highTrustSingleEvidence
          ? "single_approved_high_trust_observation"
          : "insufficient_independent_evidence",
      blockers,
      planEvidenceStatus: planEvidence.status,
      currentItemNames: planEvidence.currentItemNames,
      previousItemNames: planEvidence.previousItemNames,
      sourceUrl: latestRow.source_url || null,
      observedPriceText:
        latestRow.original_observed_price_text ||
        latestRow.observed_price_text ||
        null,
      parserVersion: latestRow.parser_version || null,
      priceVariantCount: Number(latestRow.price_variant_count || 0),
      selectedPriceCount: Number(latestRow.selected_price_count || 0),
      runnerUpPriceCount: Number(latestRow.runner_up_price_count || 0),
      firstSeenAt: currentStreak[0].day,
      lastSeenAt: latestRound.day,
      latestObservationStatus: latestStatus,
      latestConfidenceScore: Number(latestRow.confidence_score || 0),
      reviewReasonCode: latestRow.review_reason_code || null,
    });
  }

  candidates.sort((left, right) => {
    if (left.status !== right.status) return left.status === "eligible" ? -1 : 1;
    const changeDifference = Math.abs(right.percentChange) - Math.abs(left.percentChange);
    if (changeDifference !== 0) return changeDifference;
    return right.lastSeenAt.localeCompare(left.lastSeenAt);
  });

  summary.eligibleCandidates = candidates.filter(
    (candidate) => candidate.status === "eligible",
  ).length;
  summary.detectedCandidates = candidates.filter(
    (candidate) => candidate.status === "detected",
  ).length;
  const eventGroups = buildEventGroups(candidates);
  summary.eventGroups = eventGroups.length;
  summary.eligibleEventGroups = eventGroups.filter(
    (group) => group.status === "eligible",
  ).length;

  return {
    generatedAt: now.toISOString(),
    readOnly: true,
    filters: { days, baselineDays, product, limit },
    summary,
    eventGroups: eventGroups.slice(0, limit),
    candidates: candidates.slice(0, limit),
    rejections: rejections.slice(0, limit),
  };
}

function maskDatabaseTarget(url) {
  try {
    const parsed = new URL(url);
    const database = parsed.pathname.replace(/^\//, "") || "postgres";
    return `${parsed.hostname}:${parsed.port || "5432"}/${database}`;
  } catch {
    return "invalid DATABASE_URL";
  }
}

function printHumanReport(report, databaseTarget) {
  console.log("GeoSub price event candidate dry run");
  console.log(`Database: ${databaseTarget}`);
  console.log(`Read-only transaction: ${report.readOnly ? "yes" : "no"}`);
  console.log(
    `Window: ${report.filters.days} days (baseline search: ${report.filters.baselineDays} days)`,
  );
  if (report.filters.product) console.log(`Product: ${report.filters.product}`);
  console.log("");
  console.log(
    `Observations ${report.summary.observationRows}; usable ${report.summary.usableRows}; identities ${report.summary.identityGroups}`,
  );
  console.log(
    `Candidates: eligible ${report.summary.eligibleCandidates}; detected ${report.summary.detectedCandidates}; grouped events ${report.summary.eventGroups} (${report.summary.eligibleEventGroups} mechanically complete)`,
  );
  console.log(
    `Excluded: anomaly rows ${report.summary.excludedAnomalyRows}; ignored/rejected rows ${report.summary.excludedNonReviewableStatusRows}; invalid prices ${report.summary.excludedInvalidPriceRows}; missing identity ${report.summary.excludedMissingIdentityRows}`,
  );
  console.log(
    `Diagnostics: FX-only identities ${report.summary.fxOnlyIdentityGroups}; conflicting identities ${report.summary.conflictingIdentityGroups}; no baseline ${report.summary.insufficientBaselineGroups}; outside window ${report.summary.outsideLookbackGroups}`,
  );
  console.log(
    `Evidence gaps: untrusted previous local price ${report.summary.insufficientTrustedBaselineGroups}`,
  );
  console.log(
    `Plan identity checks: ${report.summary.planEvidenceReviewCandidates} candidate${report.summary.planEvidenceReviewCandidates === 1 ? "" : "s"} need item-name or plan-spec review`,
  );
  console.log("");

  if (report.eventGroups.length === 0) {
    console.log("No price event candidates matched the current rules.");
  } else {
    console.log("Top grouped events:");
    for (const group of report.eventGroups) {
      console.log(
        `[${group.status}] ${group.productSlug} ${group.type}; ${group.planCount} plan${group.planCount === 1 ? "" : "s"}; ${group.regionCount} region${group.regionCount === 1 ? "" : "s"}; first seen ${group.firstSeenAt}; next ${group.nextAction}${group.blockers.length > 0 ? ` (${group.blockers.join(", ")})` : ""}`,
      );
    }
  }
  console.log("");
  console.log("No data was written. The transaction has been rolled back.");
}

async function runDatabaseReport(options) {
  loadEnvironment();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is missing.");

  const client = new Client({
    connectionString: databaseUrl,
    application_name: "geosub-price-event-candidate-dry-run",
    connectionTimeoutMillis: 5_000,
  });
  let transactionStarted = false;

  try {
    await client.connect();
    await client.query("BEGIN TRANSACTION READ ONLY");
    transactionStarted = true;
    await client.query(
      `SET LOCAL statement_timeout = '${options.statementTimeoutMs}ms'`,
    );
    const result = await client.query(PRICE_EVENT_QUERY, [
      options.baselineDays,
      options.product,
    ]);
    const report = buildPriceEventCandidateReport(result.rows, options);
    return { report, databaseTarget: maskDatabaseTarget(databaseUrl) };
  } finally {
    if (transactionStarted) {
      await client.query("ROLLBACK").catch(() => undefined);
    }
    await client.end().catch(() => undefined);
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const { report, databaseTarget } = await runDatabaseReport(options);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report, databaseTarget);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Price event candidate dry run failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  PRICE_EVENT_QUERY,
  buildEventGroups,
  buildPriceEventCandidateReport,
  buildIdentity,
  decimalToMinorUnits,
  formatMinorUnits,
  evaluatePlanEvidence,
  isHighTrustOfficialRow,
  isIndependentSingleEvidence,
  isReviewableObservation,
  parseArguments,
};

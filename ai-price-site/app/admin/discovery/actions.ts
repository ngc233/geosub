"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/admin-auth";
import { prisma } from "../../../lib/prisma";

function cleanText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function cleanOptionalText(value: FormDataEntryValue | null) {
  const text = cleanText(value);
  return text.length > 0 ? text : null;
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function parseCategory(value: FormDataEntryValue | null) {
  const category = cleanText(value).toLowerCase();

  if (
    category === "ai" ||
    category === "streaming" ||
    category === "software" ||
    category === "game" ||
    category === "gift_card" ||
    category === "vpn" ||
    category === "payment" ||
    category === "other"
  ) {
    return category;
  }

  return "ai";
}

function parseSourceType(value: FormDataEntryValue | null) {
  const sourceType = cleanText(value);

  if (
    sourceType === "manual_tip" ||
    sourceType === "official_site" ||
    sourceType === "app_store" ||
    sourceType === "google_play" ||
    sourceType === "rss" ||
    sourceType === "search" ||
    sourceType === "competitor" ||
    sourceType === "social" ||
    sourceType === "other"
  ) {
    return sourceType;
  }

  return "other";
}

function parseDiscoveryStrategy(value: FormDataEntryValue | null) {
  const strategy = cleanText(value);

  if (
    strategy === "auto" ||
    strategy === "pricing_page" ||
    strategy === "announcement_feed" ||
    strategy === "marketplace" ||
    strategy === "competitor_page" ||
    strategy === "search_result"
  ) {
    return strategy;
  }

  return "auto";
}

function parseNumber(value: FormDataEntryValue | null, fallback: number, min: number, max: number) {
  const number = Number(value || fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function getCandidateId(formData: FormData) {
  const id = cleanText(formData.get("id"));

  if (!id) {
    throw new Error("Missing candidate id.");
  }

  return id;
}

function getReviewNote(formData: FormData) {
  const note = cleanText(formData.get("reviewNote"));
  return note || null;
}

export async function createManualCandidate(formData: FormData) {
  const admin = await requireAdmin();

  const name = cleanText(formData.get("name"));
  const suggestedSlug = normalizeSlug(cleanText(formData.get("suggestedSlug")) || name);
  const suggestedCategory = parseCategory(formData.get("suggestedCategory"));
  const sourceType = parseSourceType(formData.get("sourceType"));
  const confidenceScore = parseNumber(formData.get("confidenceScore"), 65, 0, 100);

  if (!name || !suggestedSlug) {
    throw new Error("Candidate name is required.");
  }

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO product_discovery_candidates (
      id,
      name,
      suggested_slug,
      suggested_category,
      provider,
      official_url,
      app_store_url,
      app_store_id,
      google_play_url,
      google_play_package,
      pricing_url,
      source_type,
      source_name,
      source_url,
      discovery_reason,
      confidence_score,
      status,
      raw_payload,
      first_seen_at,
      last_seen_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${name},
      ${suggestedSlug},
      ${suggestedCategory}::product_category,
      ${cleanOptionalText(formData.get("provider"))},
      ${cleanOptionalText(formData.get("officialUrl"))},
      ${cleanOptionalText(formData.get("appStoreUrl"))},
      ${cleanOptionalText(formData.get("appStoreId"))},
      ${cleanOptionalText(formData.get("googlePlayUrl"))},
      ${cleanOptionalText(formData.get("googlePlayPackage"))},
      ${cleanOptionalText(formData.get("pricingUrl"))},
      ${sourceType}::discovery_candidate_source_type,
      ${cleanOptionalText(formData.get("sourceName"))},
      ${cleanOptionalText(formData.get("sourceUrl"))},
      ${cleanOptionalText(formData.get("discoveryReason"))},
      ${confidenceScore},
      'new'::discovery_candidate_status,
      jsonb_build_object(
        'created_from', 'admin_discovery_manual_form',
        'created_by', ${admin.id}::uuid
      ),
      NOW(),
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING
    RETURNING id::text
  `;

  const candidateId = rows[0]?.id || null;

  await prisma.$queryRaw`
    INSERT INTO audit_logs (
      id,
      actor_id,
      action,
      target_type,
      target_id,
      new_value,
      note,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      ${admin.id}::uuid,
      'create',
      'product_discovery_candidate',
      ${candidateId}::uuid,
      jsonb_build_object(
        'name', ${name}::text,
        'slug', ${suggestedSlug}::text
      ),
      'Created manual discovery candidate.',
      NOW()
    )
  `;

  revalidatePath("/admin/discovery");
}

export async function createDiscoverySource(formData: FormData) {
  const admin = await requireAdmin();

  const name = cleanText(formData.get("name"));
  const url = cleanText(formData.get("url"));
  const sourceType = parseSourceType(formData.get("sourceType"));
  const categoryHint = parseCategory(formData.get("categoryHint"));
  const interval = parseNumber(formData.get("scanIntervalHours"), 24, 1, 720);
  const reliability = parseNumber(formData.get("reliabilityScore"), 60, 0, 100);
  const strategy = parseDiscoveryStrategy(formData.get("strategy"));
  const promoteThreshold = parseNumber(formData.get("promoteThreshold"), 60, 0, 100);
  const watchThreshold = parseNumber(formData.get("watchThreshold"), 40, 0, 100);

  if (!name || !url) {
    throw new Error("Discovery source name and URL are required.");
  }

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO discovery_sources (
      id,
      name,
      source_type,
      url,
      category_hint,
      query,
      scan_interval_hours,
      status,
      reliability_score,
      strategy,
      promote_threshold,
      watch_threshold,
      note,
      raw_config,
      created_by,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${name},
      ${sourceType}::discovery_candidate_source_type,
      ${url},
      ${categoryHint}::product_category,
      ${cleanOptionalText(formData.get("query"))},
      ${interval},
      'active'::discovery_source_status,
      ${reliability},
      ${strategy},
      ${promoteThreshold},
      ${watchThreshold},
      ${cleanOptionalText(formData.get("note"))},
      jsonb_build_object('created_from', 'admin_discovery_source_form'),
      ${admin.id}::uuid,
      NOW(),
      NOW()
    )
    ON CONFLICT (url)
    DO UPDATE SET
      name = EXCLUDED.name,
      source_type = EXCLUDED.source_type,
      category_hint = EXCLUDED.category_hint,
      query = EXCLUDED.query,
      scan_interval_hours = EXCLUDED.scan_interval_hours,
      status = 'active'::discovery_source_status,
      reliability_score = EXCLUDED.reliability_score,
      strategy = EXCLUDED.strategy,
      promote_threshold = EXCLUDED.promote_threshold,
      watch_threshold = EXCLUDED.watch_threshold,
      note = EXCLUDED.note,
      updated_at = NOW()
    RETURNING id::text
  `;

  const sourceId = rows[0]?.id || null;

  await prisma.$queryRaw`
    INSERT INTO audit_logs (
      id,
      actor_id,
      action,
      target_type,
      target_id,
      new_value,
      note,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      ${admin.id}::uuid,
      'upsert',
      'discovery_source',
      ${sourceId}::uuid,
      jsonb_build_object(
        'name', ${name}::text,
        'url', ${url}::text,
        'source_type', ${sourceType}::text,
        'strategy', ${strategy}::text
      ),
      'Created or updated discovery source.',
      NOW()
    )
  `;

  revalidatePath("/admin/discovery");
}

export async function watchCandidate(formData: FormData) {
  const admin = await requireAdmin();
  const id = getCandidateId(formData);
  const reviewNote = getReviewNote(formData);

  await prisma.$queryRaw`
    UPDATE product_discovery_candidates
    SET
      status = 'watching'::discovery_candidate_status,
      reviewed_by = ${admin.id}::uuid,
      reviewed_at = NOW(),
      review_note = COALESCE(${reviewNote}, 'Marked as watching from discovery center.')
    WHERE id = ${id}::uuid
  `;

  await prisma.$queryRaw`
    INSERT INTO audit_logs (
      id,
      actor_id,
      action,
      target_type,
      target_id,
      note,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      ${admin.id}::uuid,
      'watch',
      'product_discovery_candidate',
      ${id}::uuid,
      COALESCE(${reviewNote}, 'Marked discovery candidate as watching.'),
      NOW()
    )
  `;

  revalidatePath("/admin/discovery");
}

export async function ignoreCandidate(formData: FormData) {
  const admin = await requireAdmin();
  const id = getCandidateId(formData);
  const reviewNote = getReviewNote(formData);

  await prisma.$queryRaw`
    UPDATE product_discovery_candidates
    SET
      status = 'ignored'::discovery_candidate_status,
      reviewed_by = ${admin.id}::uuid,
      reviewed_at = NOW(),
      review_note = COALESCE(${reviewNote}, 'Ignored from discovery center.')
    WHERE id = ${id}::uuid
  `;

  await prisma.$queryRaw`
    INSERT INTO audit_logs (
      id,
      actor_id,
      action,
      target_type,
      target_id,
      note,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      ${admin.id}::uuid,
      'ignore',
      'product_discovery_candidate',
      ${id}::uuid,
      COALESCE(${reviewNote}, 'Ignored discovery candidate.'),
      NOW()
    )
  `;

  revalidatePath("/admin/discovery");
}

export async function promoteCandidate(formData: FormData) {
  const admin = await requireAdmin();
  const id = getCandidateId(formData);
  const reviewNote = getReviewNote(formData);

  const rows = await prisma.$queryRaw<Array<{ promoted_product_id: string | null; matched_product_id: string | null }>>`
    WITH candidate AS (
      SELECT *
      FROM product_discovery_candidates
      WHERE id = ${id}::uuid
      LIMIT 1
    ),
    existing AS (
      SELECT p.id
      FROM products p
      JOIN candidate c ON p.slug = COALESCE(NULLIF(c.suggested_slug, ''), lower(regexp_replace(c.name, '[^a-zA-Z0-9]+', '-', 'g')))
      LIMIT 1
    ),
    inserted AS (
      INSERT INTO products (
        id,
        slug,
        name,
        category,
        provider,
        logo_url,
        description,
        official_url,
        status,
        featured,
        sort_order,
        created_at,
        updated_at
      )
      SELECT
        gen_random_uuid(),
        COALESCE(NULLIF(c.suggested_slug, ''), lower(regexp_replace(c.name, '[^a-zA-Z0-9]+', '-', 'g'))),
        c.name,
        c.suggested_category,
        c.provider,
        NULL,
        c.discovery_reason,
        c.official_url,
        'review'::publish_status,
        FALSE,
        999,
        NOW(),
        NOW()
      FROM candidate c
      WHERE NOT EXISTS (SELECT 1 FROM existing)
      RETURNING id
    ),
    updated AS (
      UPDATE product_discovery_candidates c
      SET
        status = CASE
          WHEN EXISTS (SELECT 1 FROM inserted) THEN 'promoted'::discovery_candidate_status
          ELSE 'merged'::discovery_candidate_status
        END,
        promoted_product_id = (SELECT id FROM inserted LIMIT 1),
        matched_product_id = (SELECT id FROM existing LIMIT 1),
        reviewed_by = ${admin.id}::uuid,
        reviewed_at = NOW(),
        review_note = COALESCE(${reviewNote}, 'Promoted or merged from discovery center.')
      WHERE c.id = ${id}::uuid
      RETURNING promoted_product_id, matched_product_id
    )
    SELECT
      promoted_product_id::text,
      matched_product_id::text
    FROM updated
  `;

  const result = rows[0];
  const targetProductId = result?.promoted_product_id || result?.matched_product_id || null;

  if (targetProductId) {
    await prisma.$queryRaw`
      WITH candidate AS (
        SELECT *
        FROM product_discovery_candidates
        WHERE id = ${id}::uuid
        LIMIT 1
      ),
      source_inputs AS (
        SELECT
          'official'::text AS kind,
          'official_page'::text AS source_type,
          c.official_url AS url,
          c.name || ' official site' AS source_name,
          c.confidence_score AS reliability,
          jsonb_build_object('url', c.official_url, 'collector_kind', 'official_site') AS config
        FROM candidate c
        WHERE c.official_url IS NOT NULL AND c.official_url <> ''

        UNION ALL

        SELECT
          'pricing'::text AS kind,
          'official_page'::text AS source_type,
          c.pricing_url AS url,
          c.name || ' pricing page' AS source_name,
          GREATEST(c.confidence_score, 70) AS reliability,
          jsonb_build_object('url', c.pricing_url, 'collector_kind', 'pricing_page') AS config
        FROM candidate c
        WHERE c.pricing_url IS NOT NULL
          AND c.pricing_url <> ''
          AND (c.official_url IS NULL OR c.pricing_url <> c.official_url)

        UNION ALL

        SELECT
          'app-store'::text AS kind,
          'app_store'::text AS source_type,
          c.app_store_url AS url,
          c.name || ' App Store' AS source_name,
          GREATEST(c.confidence_score, 75) AS reliability,
          jsonb_build_object(
            'url', c.app_store_url,
            'app_store_id', c.app_store_id,
            'collector_kind', 'app_store'
          ) AS config
        FROM candidate c
        WHERE c.app_store_url IS NOT NULL AND c.app_store_url <> ''

        UNION ALL

        SELECT
          'google-play'::text AS kind,
          'google_play'::text AS source_type,
          c.google_play_url AS url,
          c.name || ' Google Play' AS source_name,
          GREATEST(c.confidence_score, 70) AS reliability,
          jsonb_build_object(
            'url', c.google_play_url,
            'google_play_package', c.google_play_package,
            'collector_kind', 'google_play'
          ) AS config
        FROM candidate c
        WHERE c.google_play_url IS NOT NULL AND c.google_play_url <> ''
      ),
      upserted_sources AS (
        INSERT INTO price_sources (
          id,
          source_key,
          name,
          source_level,
          type,
          provider,
          base_url,
          requires_javascript,
          requires_account,
          requires_geo,
          terms_risk,
          reliability_score,
          status,
          note,
          created_at,
          updated_at
        )
        SELECT
          gen_random_uuid(),
          'discovery-' || ${id}::text || '-' || si.kind,
          si.source_name,
          CASE
            WHEN si.source_type = 'official_page' THEN 'B'
            WHEN si.source_type = 'app_store' THEN 'B'
            ELSE 'C'
          END::source_level,
          si.source_type::price_source_type,
          c.provider,
          si.url,
          CASE WHEN si.source_type = 'official_page' THEN TRUE ELSE FALSE END,
          FALSE,
          CASE WHEN si.source_type IN ('app_store', 'google_play') THEN TRUE ELSE FALSE END,
          'low'::risk_level,
          LEAST(100, GREATEST(0, si.reliability)),
          'active'::source_status,
          'Created from discovery candidate promotion.',
          NOW(),
          NOW()
        FROM source_inputs si
        CROSS JOIN candidate c
        ON CONFLICT (source_key)
        DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          provider = EXCLUDED.provider,
          base_url = EXCLUDED.base_url,
          reliability_score = EXCLUDED.reliability_score,
          status = 'active',
          updated_at = NOW()
        RETURNING id, source_key
      ),
      source_configs AS (
        SELECT
          us.id AS source_id,
          si.kind,
          si.config
        FROM source_inputs si
        JOIN upserted_sources us ON us.source_key = 'discovery-' || ${id}::text || '-' || si.kind
      )
      INSERT INTO collector_jobs (
        id,
        source_id,
        product_id,
        discovery_candidate_id,
        job_type,
        schedule,
        status,
        next_run_at,
        job_config,
        priority,
        created_at,
        updated_at
      )
      SELECT
        gen_random_uuid(),
        sc.source_id,
        ${targetProductId}::uuid,
        ${id}::uuid,
        'ai_pricing',
        'daily',
        'active',
        NOW(),
        jsonb_build_object(
          'created_from', 'discovery_promotion',
          'source_kind', sc.kind,
          'candidate_id', ${id}::uuid,
          'product_id', ${targetProductId}::uuid
        ) || sc.config,
        CASE
          WHEN sc.kind = 'pricing' THEN 90
          WHEN sc.kind = 'app-store' THEN 85
          WHEN sc.kind = 'google-play' THEN 75
          ELSE 70
        END,
        NOW(),
        NOW()
      FROM source_configs sc
      WHERE NOT EXISTS (
        SELECT 1
        FROM collector_jobs existing
        WHERE existing.product_id = ${targetProductId}::uuid
          AND existing.source_id = sc.source_id
          AND existing.job_type = 'ai_pricing'
          AND existing.status <> 'archived'
      )
    `;
  }

  await prisma.$queryRaw`
    INSERT INTO audit_logs (
      id,
      actor_id,
      action,
      target_type,
      target_id,
      new_value,
      note,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      ${admin.id}::uuid,
      'promote',
      'product_discovery_candidate',
      ${id}::uuid,
      jsonb_build_object(
        'product_id', ${targetProductId}::uuid,
        'result', CASE WHEN ${targetProductId}::uuid IS NULL THEN 'unknown' ELSE 'promoted_or_merged' END
      ),
      COALESCE(${reviewNote}, 'Promoted discovery candidate to product library or merged with existing product.'),
      NOW()
    )
  `;

  revalidatePath("/admin/discovery");
  revalidatePath("/admin/products");
}

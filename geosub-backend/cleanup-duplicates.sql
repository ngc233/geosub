-- 清理 FAQ 重复项，只保留最早的一条
WITH ranked_faqs AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY product_id, COALESCE(plan_id, '00000000-0000-0000-0000-000000000000'::uuid), locale, question
      ORDER BY created_at ASC
    ) AS rn
  FROM faqs
)
DELETE FROM faqs
USING ranked_faqs
WHERE faqs.id = ranked_faqs.id
  AND ranked_faqs.rn > 1;

-- 清理 SEO 重复项，只保留最早的一条
WITH ranked_seo AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY product_id, COALESCE(plan_id, '00000000-0000-0000-0000-000000000000'::uuid), locale
      ORDER BY created_at ASC
    ) AS rn
  FROM seo_meta
)
DELETE FROM seo_meta
USING ranked_seo
WHERE seo_meta.id = ranked_seo.id
  AND ranked_seo.rn > 1;

-- 清理 Affiliate 重复项，只保留最早的一条
WITH ranked_affiliate AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY product_id, locale, title, url, placement
      ORDER BY created_at ASC
    ) AS rn
  FROM affiliate_links
)
DELETE FROM affiliate_links
USING ranked_affiliate
WHERE affiliate_links.id = ranked_affiliate.id
  AND ranked_affiliate.rn > 1;

-- 防止后续再次重复
CREATE UNIQUE INDEX IF NOT EXISTS uniq_faqs_product_plan_locale_question
ON faqs (
  product_id,
  COALESCE(plan_id, '00000000-0000-0000-0000-000000000000'::uuid),
  locale,
  question
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_seo_meta_product_plan_locale
ON seo_meta (
  product_id,
  COALESCE(plan_id, '00000000-0000-0000-0000-000000000000'::uuid),
  locale
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_affiliate_product_locale_title_url_placement
ON affiliate_links (
  product_id,
  locale,
  title,
  url,
  placement
);
-- GeoSub backfill migration. Split from sql/014_product_discovery_candidates.sql; see migration-layout.json.

INSERT INTO product_discovery_candidates (
  name,
  suggested_slug,
  suggested_category,
  provider,
  official_url,
  pricing_url,
  source_type,
  source_name,
  source_url,
  discovery_reason,
  confidence_score,
  status,
  raw_payload
)
VALUES (
  'DeepSeek',
  'deepseek',
  'ai',
  'DeepSeek',
  'https://www.deepseek.com/',
  'https://api-docs.deepseek.com/quick_start/pricing',
  'manual_tip'::discovery_candidate_source_type,
  'GeoSub initial candidate',
  'https://www.deepseek.com/',
  'User-mentioned AI service. Add to candidate pool before formal product onboarding.',
  78,
  'new'::discovery_candidate_status,
  jsonb_build_object(
    'seeded_by', '014_product_discovery_candidates.sql',
    'next_step', 'Review official URL, pricing URL, app store sources, then promote to product library.'
  )
)
ON CONFLICT DO NOTHING;

-- GeoSub backfill migration. Split from sql/015_discovery_sources.sql; see migration-layout.json.

INSERT INTO discovery_sources (
  name,
  source_type,
  url,
  category_hint,
  query,
  scan_interval_hours,
  status,
  reliability_score,
  note,
  raw_config
)
VALUES
  (
    'DeepSeek official pricing',
    'official_site'::discovery_candidate_source_type,
    'https://api-docs.deepseek.com/quick_start/pricing',
    'ai',
    'DeepSeek pricing',
    24,
    'active'::discovery_source_status,
    80,
    'Seed source for validating official pricing page monitoring.',
    jsonb_build_object('seeded_by', '015_discovery_sources.sql')
  ),
  (
    'Product Hunt AI products',
    'search'::discovery_candidate_source_type,
    'https://www.producthunt.com/categories/artificial-intelligence',
    'ai',
    'new AI products',
    24,
    'paused'::discovery_source_status,
    55,
    'Candidate discovery source. Keep paused until parser rules are implemented.',
    jsonb_build_object('seeded_by', '015_discovery_sources.sql')
  )
ON CONFLICT (url) DO NOTHING;

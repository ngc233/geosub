-- GeoSub Directus UI polish / relation metadata

-- 1) Register relationship metadata for Directus Studio
INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'plans', 'product_id', 'products', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations WHERE many_collection = 'plans' AND many_field = 'product_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'region_prices', 'product_id', 'products', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations WHERE many_collection = 'region_prices' AND many_field = 'product_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'region_prices', 'plan_id', 'plans', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations WHERE many_collection = 'region_prices' AND many_field = 'plan_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'region_prices', 'country_id', 'countries', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations WHERE many_collection = 'region_prices' AND many_field = 'country_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'region_prices', 'primary_source_id', 'price_sources', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations WHERE many_collection = 'region_prices' AND many_field = 'primary_source_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'price_observations', 'product_id', 'products', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations WHERE many_collection = 'price_observations' AND many_field = 'product_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'price_observations', 'plan_id', 'plans', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations WHERE many_collection = 'price_observations' AND many_field = 'plan_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'price_observations', 'country_id', 'countries', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations WHERE many_collection = 'price_observations' AND many_field = 'country_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'price_observations', 'source_id', 'price_sources', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations WHERE many_collection = 'price_observations' AND many_field = 'source_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'source_evidence', 'observation_id', 'price_observations', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations WHERE many_collection = 'source_evidence' AND many_field = 'observation_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'seo_meta', 'product_id', 'products', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations WHERE many_collection = 'seo_meta' AND many_field = 'product_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'seo_meta', 'plan_id', 'plans', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations WHERE many_collection = 'seo_meta' AND many_field = 'plan_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'faqs', 'product_id', 'products', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations WHERE many_collection = 'faqs' AND many_field = 'product_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'faqs', 'plan_id', 'plans', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations WHERE many_collection = 'faqs' AND many_field = 'plan_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'affiliate_links', 'product_id', 'products', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations WHERE many_collection = 'affiliate_links' AND many_field = 'product_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'collector_jobs', 'source_id', 'price_sources', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations WHERE many_collection = 'collector_jobs' AND many_field = 'source_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'collector_jobs', 'product_id', 'products', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations WHERE many_collection = 'collector_jobs' AND many_field = 'product_id'
);

INSERT INTO directus_relations (
  many_collection,
  many_field,
  one_collection,
  one_field,
  one_collection_field,
  junction_field,
  sort_field,
  one_deselect_action
)
SELECT 'parser_rules', 'source_id', 'price_sources', NULL, NULL, NULL, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations WHERE many_collection = 'parser_rules' AND many_field = 'source_id'
);

-- 2) Collection display templates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'directus_collections'
    AND column_name = 'display_template'
  ) THEN
    UPDATE directus_collections SET display_template = '{{name_zh}} ({{code}})' WHERE collection = 'countries';
    UPDATE directus_collections SET display_template = '{{name}}' WHERE collection = 'products';
    UPDATE directus_collections SET display_template = '{{name}}' WHERE collection = 'plans';
    UPDATE directus_collections SET display_template = '{{name}}' WHERE collection = 'price_sources';
    UPDATE directus_collections SET display_template = '{{title}}' WHERE collection = 'seo_meta';
    UPDATE directus_collections SET display_template = '{{question}}' WHERE collection = 'faqs';
    UPDATE directus_collections SET display_template = '{{title}}' WHERE collection = 'affiliate_links';
    UPDATE directus_collections SET display_template = '{{name}}' WHERE collection = 'ad_slots';
    UPDATE directus_collections SET display_template = '{{event_name}}' WHERE collection = 'tracking_events';
  END IF;
END $$;

-- 3) Hide technical ID fields in the UI
INSERT INTO directus_fields (
  collection,
  field,
  hidden,
  readonly,
  sort,
  width
)
SELECT collection_name, 'id', true, true, 999, 'half'
FROM (
  VALUES
    ('countries'),
    ('products'),
    ('plans'),
    ('region_prices'),
    ('price_sources'),
    ('price_observations'),
    ('source_evidence'),
    ('review_queue'),
    ('exchange_rates'),
    ('seo_meta'),
    ('faqs'),
    ('affiliate_links'),
    ('ad_slots'),
    ('collector_jobs'),
    ('parser_rules'),
    ('audit_logs'),
    ('tracking_events')
) AS c(collection_name)
ON CONFLICT (collection, field) DO UPDATE SET
  hidden = EXCLUDED.hidden,
  readonly = EXCLUDED.readonly,
  sort = EXCLUDED.sort,
  width = EXCLUDED.width;

-- 4) Make relation fields use relation dropdowns
INSERT INTO directus_fields (
  collection,
  field,
  interface,
  options,
  display,
  display_options,
  sort,
  width
)
VALUES
  ('plans', 'product_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 10, 'half'),

  ('region_prices', 'product_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 10, 'half'),
  ('region_prices', 'plan_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 20, 'half'),
  ('region_prices', 'country_id', 'select-dropdown-m2o', '{"template":"{{code}} - {{name_zh}}"}', 'related-values', '{"template":"{{code}} - {{name_zh}}"}', 30, 'half'),
  ('region_prices', 'primary_source_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 120, 'half'),

  ('price_observations', 'product_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 10, 'half'),
  ('price_observations', 'plan_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 20, 'half'),
  ('price_observations', 'country_id', 'select-dropdown-m2o', '{"template":"{{code}} - {{name_zh}}"}', 'related-values', '{"template":"{{code}} - {{name_zh}}"}', 30, 'half'),
  ('price_observations', 'source_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 40, 'half'),

  ('source_evidence', 'observation_id', 'select-dropdown-m2o', '{"template":"{{observed_at}}"}', 'related-values', '{"template":"{{observed_at}}"}', 10, 'half'),

  ('seo_meta', 'product_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 10, 'half'),
  ('seo_meta', 'plan_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 20, 'half'),

  ('faqs', 'product_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 10, 'half'),
  ('faqs', 'plan_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 20, 'half'),

  ('affiliate_links', 'product_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 10, 'half'),

  ('collector_jobs', 'source_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 10, 'half'),
  ('collector_jobs', 'product_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 20, 'half'),

  ('parser_rules', 'source_id', 'select-dropdown-m2o', '{"template":"{{name}}"}', 'related-values', '{"template":"{{name}}"}', 10, 'half')
ON CONFLICT (collection, field) DO UPDATE SET
  interface = EXCLUDED.interface,
  options = EXCLUDED.options,
  display = EXCLUDED.display,
  display_options = EXCLUDED.display_options,
  sort = EXCLUDED.sort,
  width = EXCLUDED.width;

-- 5) Basic field ordering for the most used collections
INSERT INTO directus_fields (collection, field, sort, width)
VALUES
  ('products', 'name', 10, 'half'),
  ('products', 'slug', 20, 'half'),
  ('products', 'category', 30, 'half'),
  ('products', 'provider', 40, 'half'),
  ('products', 'description', 50, 'full'),
  ('products', 'official_url', 60, 'full'),
  ('products', 'status', 70, 'half'),
  ('products', 'featured', 80, 'half'),

  ('countries', 'code', 10, 'half'),
  ('countries', 'name_zh', 20, 'half'),
  ('countries', 'name_en', 30, 'half'),
  ('countries', 'currency', 40, 'half'),
  ('countries', 'region', 50, 'half'),
  ('countries', 'is_reference', 60, 'half'),

  ('region_prices', 'local_price', 40, 'half'),
  ('region_prices', 'currency', 50, 'half'),
  ('region_prices', 'price_usd', 60, 'half'),
  ('region_prices', 'us_base_price', 70, 'half'),
  ('region_prices', 'diff_vs_us_percent', 80, 'half'),
  ('region_prices', 'confidence_score', 90, 'half'),
  ('region_prices', 'data_quality', 100, 'half'),
  ('region_prices', 'status', 110, 'half'),
  ('region_prices', 'tax_note', 130, 'full'),
  ('region_prices', 'availability_note', 140, 'full'),

  ('seo_meta', 'locale', 30, 'half'),
  ('seo_meta', 'title', 40, 'full'),
  ('seo_meta', 'description', 50, 'full'),
  ('seo_meta', 'h1', 60, 'full'),
  ('seo_meta', 'status', 70, 'half'),

  ('faqs', 'locale', 30, 'half'),
  ('faqs', 'question', 40, 'full'),
  ('faqs', 'answer', 50, 'full'),
  ('faqs', 'sort_order', 60, 'half'),
  ('faqs', 'status', 70, 'half')
ON CONFLICT (collection, field) DO UPDATE SET
  sort = EXCLUDED.sort,
  width = EXCLUDED.width;
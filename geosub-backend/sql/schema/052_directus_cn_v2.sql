-- GeoSub schema migration. Split from directus-cn-v2.sql; see migration-layout.json.

-- GeoSub Directus 中文运营后台 v2
-- 不修改真实数据库字段名，只修改 Directus 后台显示名称、字段顺序、默认隐藏字段

CREATE OR REPLACE FUNCTION geosub_set_collection_label(
  p_collection TEXT,
  p_label TEXT
)
RETURNS VOID AS $$
DECLARE
  v_json_type TEXT;
  v_payload TEXT;
BEGIN
  SELECT udt_name
  INTO v_json_type
  FROM information_schema.columns
  WHERE table_name = 'directus_collections'
    AND column_name = 'translations';

  IF v_json_type IS NOT NULL THEN
    v_payload := json_build_array(
      json_build_object('language', 'zh-CN', 'translation', p_label)
    )::TEXT;

    EXECUTE format(
      'UPDATE directus_collections SET translations = %L::%s WHERE collection = %L',
      v_payload,
      v_json_type,
      p_collection
    );
  END IF;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION geosub_set_field_label(
  p_collection TEXT,
  p_field TEXT,
  p_label TEXT
)
RETURNS VOID AS $$
DECLARE
  v_json_type TEXT;
  v_payload TEXT;
BEGIN
  SELECT udt_name
  INTO v_json_type
  FROM information_schema.columns
  WHERE table_name = 'directus_fields'
    AND column_name = 'translations';

  IF v_json_type IS NOT NULL THEN
    v_payload := json_build_array(
      json_build_object('language', 'zh-CN', 'translation', p_label)
    )::TEXT;

    EXECUTE format(
      '
      INSERT INTO directus_fields (collection, field, translations)
      VALUES (%L, %L, %L::%s)
      ON CONFLICT (collection, field) DO UPDATE SET
        translations = EXCLUDED.translations
      ',
      p_collection,
      p_field,
      v_payload,
      v_json_type
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

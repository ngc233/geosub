-- Additive metadata only. SQL schema and Prisma entrypoints share identical bytes.
-- No business rows are changed. All version writes share the publishing transaction.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = pg_catalog, public, pg_temp;
LOCK TABLE public.countries, public.plans, public.price_sources, public.products, public.region_prices
  IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE IF NOT EXISTS public.price_dataset_versions (
  revision BIGINT PRIMARY KEY,
  recorded_at TIMESTAMPTZ NOT NULL,
  fingerprint TEXT NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  price_count BIGINT NOT NULL,
  product_count BIGINT NOT NULL,
  ios_count BIGINT NOT NULL,
  web_count BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.price_dataset_version_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  revision BIGINT NOT NULL DEFAULT 0,
  fingerprint TEXT,
  last_transaction BIGINT,
  base_revision BIGINT,
  base_fingerprint TEXT,
  last_marker BIGINT
);
INSERT INTO price_dataset_version_state(singleton) VALUES(TRUE) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.record_formal_price_version()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE
  current_state public.price_dataset_version_state%ROWTYPE;
  content_hash TEXT;
  prices BIGINT;
  products BIGINT;
  ios BIGINT;
  web BIGINT;
  marker BIGINT := COALESCE(NULLIF(current_setting('geosub.price_version_marker',TRUE),''),'0')::BIGINT;
  starting_revision BIGINT;
  base_hash TEXT;
BEGIN
  SELECT * INTO STRICT current_state
  FROM price_dataset_version_state WHERE singleton FOR UPDATE;
  IF current_state.last_transaction = txid_current() AND current_state.last_marker = marker THEN
    RETURN;
  END IF;
  IF current_state.last_transaction = txid_current() THEN
    starting_revision := current_state.base_revision;
    base_hash := current_state.base_fingerprint;
  ELSE
    starting_revision := current_state.revision;
    base_hash := current_state.fingerprint;
  END IF;

  -- Compare final committed publication fields, not observation time or collector runs.
  -- UTC normalization makes timestamp/date-independent representations deterministic.
  SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(body ORDER BY price_id)::text, '[]'), 'UTF8')), 'hex'),
    COUNT(*), COUNT(DISTINCT product_id),
    COUNT(*) FILTER (WHERE billing_platform = 'ios'),
    COUNT(*) FILTER (WHERE billing_platform = 'web')
  INTO content_hash, prices, products, ios, web
  FROM (
    SELECT rp.id AS price_id, rp.product_id, rp.billing_platform::text,
      jsonb_build_object(
        'price', to_jsonb(rp) - ARRAY[
          'created_at','updated_at','last_checked_at','published_at','reviewed_at','fx_rate_date'
        ],
        'product', jsonb_build_array(p.id,p.slug,p.name,p.category),
        'plan', jsonb_build_array(pl.id,pl.slug,pl.name,pl.billing_cycle),
        'country', jsonb_build_array(c.id,c.code,c.name_zh,c.name_en,c.currency),
        'source', jsonb_build_array(s.id,s.name,s.base_url)
      ) AS body
    FROM region_prices rp
    JOIN products p ON p.id=rp.product_id AND p.status='published' AND p.category IN ('ai','streaming')
    JOIN plans pl ON pl.id=rp.plan_id AND pl.product_id=p.id AND pl.status='published'
    JOIN countries c ON c.id=rp.country_id
    LEFT JOIN price_sources s ON s.id=rp.primary_source_id
    WHERE rp.status='published'
  ) formal;

  IF base_hash IS DISTINCT FROM content_hash THEN
    INSERT INTO price_dataset_versions
      (revision,recorded_at,fingerprint,price_count,product_count,ios_count,web_count)
    VALUES
      (starting_revision+1,clock_timestamp(),content_hash,prices,products,ios,web)
    ON CONFLICT (revision) DO UPDATE SET
      recorded_at=EXCLUDED.recorded_at,fingerprint=EXCLUDED.fingerprint,
      price_count=EXCLUDED.price_count,product_count=EXCLUDED.product_count,
      ios_count=EXCLUDED.ios_count,web_count=EXCLUDED.web_count;
    UPDATE price_dataset_version_state
    SET revision=starting_revision+1,fingerprint=content_hash WHERE singleton;
  ELSE
    -- Explicit early checks / immediate constraints may have observed an intermediate value.
    DELETE FROM price_dataset_versions WHERE revision=starting_revision+1;
    UPDATE price_dataset_version_state
    SET revision=starting_revision,fingerprint=base_hash WHERE singleton;
  END IF;
  UPDATE price_dataset_version_state
  SET last_transaction=txid_current(),base_revision=starting_revision,
    base_fingerprint=base_hash,last_marker=marker WHERE singleton;
END $$;

CREATE OR REPLACE FUNCTION public.mark_formal_price_version_dirty()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
  -- Avoid ledger locks and full scans for freshness-only / editorial updates.
  IF TG_OP='UPDATE' THEN
    CASE TG_TABLE_NAME
      WHEN 'region_prices' THEN
        IF (to_jsonb(OLD)-ARRAY['created_at','updated_at','last_checked_at','published_at','reviewed_at','fx_rate_date'])
          IS NOT DISTINCT FROM
          (to_jsonb(NEW)-ARRAY['created_at','updated_at','last_checked_at','published_at','reviewed_at','fx_rate_date'])
        THEN RETURN NEW; END IF;
      WHEN 'products' THEN
        IF ROW(OLD.id,OLD.slug,OLD.name,OLD.category,OLD.status)
          IS NOT DISTINCT FROM ROW(NEW.id,NEW.slug,NEW.name,NEW.category,NEW.status)
        THEN RETURN NEW; END IF;
      WHEN 'plans' THEN
        IF ROW(OLD.id,OLD.product_id,OLD.slug,OLD.name,OLD.billing_cycle,OLD.status)
          IS NOT DISTINCT FROM ROW(NEW.id,NEW.product_id,NEW.slug,NEW.name,NEW.billing_cycle,NEW.status)
        THEN RETURN NEW; END IF;
      WHEN 'countries' THEN
        IF ROW(OLD.id,OLD.code,OLD.name_zh,OLD.name_en,OLD.currency)
          IS NOT DISTINCT FROM ROW(NEW.id,NEW.code,NEW.name_zh,NEW.name_en,NEW.currency)
        THEN RETURN NEW; END IF;
      WHEN 'price_sources' THEN
        IF ROW(OLD.id,OLD.name,OLD.base_url) IS NOT DISTINCT FROM ROW(NEW.id,NEW.name,NEW.base_url)
        THEN RETURN NEW; END IF;
      ELSE NULL;
    END CASE;
  END IF;
  PERFORM set_config('geosub.price_version_marker',
    (COALESCE(NULLIF(current_setting('geosub.price_version_marker',TRUE),''),'0')::BIGINT+1)::TEXT,TRUE);
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE target TEXT;
BEGIN
  FOREACH target IN ARRAY ARRAY['region_prices','products','plans','countries','price_sources'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS mark_formal_price_version_dirty ON %I',target);
    EXECUTE format(
      'CREATE TRIGGER mark_formal_price_version_dirty BEFORE INSERT OR UPDATE OR DELETE ON %I '
      'FOR EACH ROW EXECUTE FUNCTION mark_formal_price_version_dirty()',target
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.capture_formal_price_version()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
  IF COALESCE(NULLIF(current_setting('geosub.price_version_marker',TRUE),''),'0')::BIGINT=0 THEN
    RETURN NULL;
  END IF;
  PERFORM record_formal_price_version();
  RETURN NULL;
END $$;

-- Deferred triggers see the final transaction, coalesce rows, and roll back with its prices.
DROP TRIGGER IF EXISTS formal_price_version ON region_prices;
CREATE CONSTRAINT TRIGGER formal_price_version
AFTER INSERT OR UPDATE OR DELETE ON region_prices
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION capture_formal_price_version();

DROP TRIGGER IF EXISTS formal_product_version ON products;
CREATE CONSTRAINT TRIGGER formal_product_version
AFTER UPDATE OR DELETE ON products
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION capture_formal_price_version();

DROP TRIGGER IF EXISTS formal_plan_version ON plans;
CREATE CONSTRAINT TRIGGER formal_plan_version
AFTER UPDATE OR DELETE ON plans
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION capture_formal_price_version();

DROP TRIGGER IF EXISTS formal_country_version ON countries;
CREATE CONSTRAINT TRIGGER formal_country_version
AFTER UPDATE OR DELETE ON countries
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION capture_formal_price_version();

DROP TRIGGER IF EXISTS formal_source_version ON price_sources;
CREATE CONSTRAINT TRIGGER formal_source_version
AFTER UPDATE OR DELETE ON price_sources
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION capture_formal_price_version();

-- First baseline is the actual present state, never reconstructed historical releases.
REVOKE ALL ON public.price_dataset_version_state FROM PUBLIC;
REVOKE ALL ON public.price_dataset_versions FROM PUBLIC;
GRANT SELECT ON public.price_dataset_versions TO PUBLIC;
REVOKE ALL ON FUNCTION public.record_formal_price_version() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.capture_formal_price_version() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_formal_price_version_dirty() FROM PUBLIC;
SELECT record_formal_price_version();
COMMIT;

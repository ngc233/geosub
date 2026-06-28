-- Exchange rate sync system.
-- Keeps currency conversion extensible: one base currency can sync many quote currencies,
-- and every sync attempt is auditable.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS exchange_rate_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  base_currency TEXT NOT NULL,
  quote_currencies TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN (
    'running',
    'succeeded',
    'partial',
    'failed'
  )),
  requested_url TEXT,
  row_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE exchange_rates
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_latest BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sync_run_id UUID,
  ADD COLUMN IF NOT EXISTS provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'exchange_rates_sync_run_id_fkey'
  ) THEN
    ALTER TABLE exchange_rates
      ADD CONSTRAINT exchange_rates_sync_run_id_fkey
      FOREIGN KEY (sync_run_id)
      REFERENCES exchange_rate_sync_runs(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair_date
  ON exchange_rates(base_currency, quote_currency, rate_date DESC);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_latest
  ON exchange_rates(base_currency, quote_currency, source)
  WHERE is_latest;

CREATE INDEX IF NOT EXISTS idx_exchange_rate_sync_runs_started_at
  ON exchange_rate_sync_runs(started_at DESC);

DROP TRIGGER IF EXISTS trg_exchange_rate_sync_runs_updated_at ON exchange_rate_sync_runs;
CREATE TRIGGER trg_exchange_rate_sync_runs_updated_at
  BEFORE UPDATE ON exchange_rate_sync_runs
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION upsert_exchange_rate(
  p_base_currency TEXT,
  p_quote_currency TEXT,
  p_rate NUMERIC,
  p_rate_date DATE,
  p_source TEXT,
  p_fetched_at TIMESTAMPTZ DEFAULT NOW(),
  p_sync_run_id UUID DEFAULT NULL,
  p_provider_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_rate_id UUID;
  v_base_currency TEXT := UPPER(TRIM(p_base_currency));
  v_quote_currency TEXT := UPPER(TRIM(p_quote_currency));
  v_source TEXT := NULLIF(TRIM(p_source), '');
BEGIN
  IF v_base_currency IS NULL OR v_quote_currency IS NULL THEN
    RAISE EXCEPTION 'base_currency and quote_currency are required';
  END IF;

  IF v_base_currency = v_quote_currency THEN
    RAISE EXCEPTION 'base_currency and quote_currency must be different';
  END IF;

  IF p_rate IS NULL OR p_rate <= 0 THEN
    RAISE EXCEPTION 'rate must be greater than zero';
  END IF;

  UPDATE exchange_rates
  SET is_latest = FALSE,
      status = CASE WHEN status = 'active' THEN 'stale' ELSE status END
  WHERE base_currency = v_base_currency
    AND quote_currency = v_quote_currency
    AND COALESCE(source, '') = COALESCE(v_source, '')
    AND is_latest = TRUE;

  INSERT INTO exchange_rates (
    base_currency,
    quote_currency,
    rate,
    source,
    rate_date,
    fetched_at,
    is_latest,
    sync_run_id,
    provider_payload,
    status
  )
  VALUES (
    v_base_currency,
    v_quote_currency,
    p_rate,
    v_source,
    p_rate_date,
    p_fetched_at,
    TRUE,
    p_sync_run_id,
    COALESCE(p_provider_payload, '{}'::jsonb),
    'active'
  )
  ON CONFLICT (base_currency, quote_currency, rate_date, source)
  DO UPDATE SET
    rate = EXCLUDED.rate,
    fetched_at = EXCLUDED.fetched_at,
    is_latest = TRUE,
    sync_run_id = EXCLUDED.sync_run_id,
    provider_payload = EXCLUDED.provider_payload,
    error_message = NULL,
    status = 'active',
    updated_at = NOW()
  RETURNING id INTO v_rate_id;

  UPDATE exchange_rates
  SET is_latest = FALSE,
      status = CASE WHEN status = 'active' THEN 'stale' ELSE status END
  WHERE base_currency = v_base_currency
    AND quote_currency = v_quote_currency
    AND COALESCE(source, '') = COALESCE(v_source, '')
    AND id <> v_rate_id
    AND is_latest = TRUE;

  RETURN v_rate_id;
END;
$$;

CREATE OR REPLACE VIEW latest_exchange_rates AS
SELECT DISTINCT ON (base_currency, quote_currency, source)
  id,
  base_currency,
  quote_currency,
  rate,
  source,
  rate_date,
  fetched_at,
  is_latest,
  status,
  sync_run_id,
  provider_payload,
  created_at,
  updated_at
FROM exchange_rates
WHERE status = 'active'
ORDER BY base_currency, quote_currency, source, is_latest DESC, rate_date DESC, fetched_at DESC;

CREATE OR REPLACE FUNCTION get_latest_exchange_rate(
  p_base_currency TEXT,
  p_quote_currency TEXT,
  p_source TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  base_currency TEXT,
  quote_currency TEXT,
  rate NUMERIC,
  source TEXT,
  rate_date DATE,
  fetched_at TIMESTAMPTZ,
  is_latest BOOLEAN,
  status TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    er.id,
    er.base_currency,
    er.quote_currency,
    er.rate,
    er.source,
    er.rate_date,
    er.fetched_at,
    er.is_latest,
    er.status
  FROM exchange_rates er
  WHERE er.base_currency = UPPER(TRIM(p_base_currency))
    AND er.quote_currency = UPPER(TRIM(p_quote_currency))
    AND er.status = 'active'
    AND (
      p_source IS NULL
      OR COALESCE(er.source, '') = COALESCE(NULLIF(TRIM(p_source), ''), '')
    )
  ORDER BY er.is_latest DESC, er.rate_date DESC, er.fetched_at DESC
  LIMIT 1;
$$;

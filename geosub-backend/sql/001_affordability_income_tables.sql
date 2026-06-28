-- GeoSub affordability foundation
-- Step 1: country income metrics + affordability snapshot tables

ALTER TABLE countries
ADD COLUMN IF NOT EXISTS iso3 TEXT;

UPDATE countries AS c
SET iso3 = v.iso3
FROM (
  VALUES
    ('US','USA'), ('CA','CAN'), ('MX','MEX'), ('BR','BRA'), ('AR','ARG'), ('CL','CHL'), ('CO','COL'), ('PE','PER'),
    ('GB','GBR'), ('IE','IRL'), ('FR','FRA'), ('DE','DEU'), ('ES','ESP'), ('IT','ITA'), ('NL','NLD'), ('BE','BEL'),
    ('CH','CHE'), ('AT','AUT'), ('DK','DNK'), ('SE','SWE'), ('NO','NOR'), ('FI','FIN'), ('PL','POL'), ('PT','PRT'), ('TR','TUR'),
    ('JP','JPN'), ('KR','KOR'), ('CN','CHN'), ('TW','TWN'), ('HK','HKG'), ('SG','SGP'), ('MY','MYS'), ('TH','THA'),
    ('VN','VNM'), ('ID','IDN'), ('PH','PHL'), ('IN','IND'), ('PK','PAK'),
    ('AU','AUS'), ('NZ','NZL'),
    ('EG','EGY'), ('ZA','ZAF'), ('NG','NGA'), ('KE','KEN'),
    ('SA','SAU'), ('AE','ARE'), ('IL','ISR')
) AS v(code, iso3)
WHERE UPPER(c.code) = v.code
  AND (c.iso3 IS NULL OR c.iso3 = '');

CREATE TABLE IF NOT EXISTS country_income_metrics (
  id BIGSERIAL PRIMARY KEY,
  country_code TEXT NOT NULL,
  country_iso3 TEXT NOT NULL,
  metric_type TEXT NOT NULL CHECK (
    metric_type IN ('GNI_PPP', 'GNI_ATLAS', 'GDP_NOMINAL')
  ),
  indicator_code TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 1990 AND year <= 2100),
  annual_value_usd NUMERIC(14, 2) NOT NULL CHECK (annual_value_usd > 0),
  monthly_value_usd NUMERIC(14, 2)
    GENERATED ALWAYS AS (ROUND(annual_value_usd / 12.0, 2)) STORED,
  source TEXT NOT NULL DEFAULT 'World Bank',
  source_url TEXT,
  source_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT country_income_metrics_unique
    UNIQUE (country_code, metric_type, year)
);

CREATE INDEX IF NOT EXISTS idx_country_income_metrics_country
  ON country_income_metrics (country_code);

CREATE INDEX IF NOT EXISTS idx_country_income_metrics_metric_year
  ON country_income_metrics (metric_type, year DESC);

CREATE TABLE IF NOT EXISTS plan_affordability_metrics (
  id BIGSERIAL PRIMARY KEY,
  product_slug TEXT NOT NULL,
  plan_slug TEXT NOT NULL,
  country_code TEXT NOT NULL,
  region_price_id TEXT,
  income_metric_id BIGINT REFERENCES country_income_metrics(id) ON DELETE SET NULL,

  price_usd NUMERIC(12, 2) NOT NULL,
  monthly_income_usd NUMERIC(14, 2) NOT NULL,
  income_share_percent NUMERIC(8, 4) NOT NULL,
  us_income_share_percent NUMERIC(8, 4),
  burden_vs_us NUMERIC(10, 2),
  affordability_level TEXT NOT NULL CHECK (
    affordability_level IN ('LOW', 'MODERATE_LOW', 'MODERATE', 'HIGH', 'VERY_HIGH')
  ),

  data_year INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'World Bank',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT plan_affordability_metrics_unique
    UNIQUE (product_slug, plan_slug, country_code, data_year)
);

CREATE INDEX IF NOT EXISTS idx_plan_affordability_product_plan
  ON plan_affordability_metrics (product_slug, plan_slug);

CREATE INDEX IF NOT EXISTS idx_plan_affordability_country
  ON plan_affordability_metrics (country_code);

CREATE OR REPLACE VIEW latest_country_income_metrics AS
SELECT
  id,
  country_code,
  country_iso3,
  metric_type,
  indicator_code,
  year,
  annual_value_usd,
  monthly_value_usd,
  source,
  source_url,
  source_updated_at,
  created_at,
  updated_at
FROM (
  SELECT
    cim.*,
    ROW_NUMBER() OVER (
      PARTITION BY cim.country_code
      ORDER BY
        CASE cim.metric_type
          WHEN 'GNI_PPP' THEN 1
          WHEN 'GNI_ATLAS' THEN 2
          WHEN 'GDP_NOMINAL' THEN 3
          ELSE 9
        END,
        cim.year DESC
    ) AS income_rank
  FROM country_income_metrics cim
) ranked
WHERE income_rank = 1;

CREATE OR REPLACE FUNCTION geosub_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_country_income_metrics_updated_at ON country_income_metrics;
CREATE TRIGGER trg_country_income_metrics_updated_at
BEFORE UPDATE ON country_income_metrics
FOR EACH ROW
EXECUTE FUNCTION geosub_set_updated_at();

DROP TRIGGER IF EXISTS trg_plan_affordability_metrics_updated_at ON plan_affordability_metrics;
CREATE TRIGGER trg_plan_affordability_metrics_updated_at
BEFORE UPDATE ON plan_affordability_metrics
FOR EACH ROW
EXECUTE FUNCTION geosub_set_updated_at();
-- Discovery change classification.
-- Adds lightweight, explainable classification to source checks.

ALTER TABLE discovery_source_checks
ADD COLUMN IF NOT EXISTS change_kind TEXT NOT NULL DEFAULT 'unknown'
  CHECK (change_kind IN (
    'price_change',
    'new_model_or_plan',
    'product_launch',
    'content_update',
    'no_change',
    'unknown'
  )),
ADD COLUMN IF NOT EXISTS importance_score INTEGER NOT NULL DEFAULT 0
  CHECK (importance_score >= 0 AND importance_score <= 100),
ADD COLUMN IF NOT EXISTS matched_keywords TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS discovery_source_checks_kind_idx
  ON discovery_source_checks (change_kind, importance_score DESC, checked_at DESC);

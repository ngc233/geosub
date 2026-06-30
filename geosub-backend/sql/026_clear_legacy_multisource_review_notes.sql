UPDATE price_observations
SET
  raw_payload = raw_payload - 'review_note',
  updated_at = NOW()
WHERE status = 'pending'::observation_status
  AND raw_payload ->> 'review_note' ILIKE '%不同平台来源%';

UPDATE price_observations
SET
  raw_payload = raw_payload - 'auto_review_reason',
  updated_at = NOW()
WHERE status = 'pending'::observation_status
  AND raw_payload ->> 'auto_review_reason' ILIKE '%不同平台来源%';

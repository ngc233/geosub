SET client_encoding = 'UTF8';

BEGIN;

UPDATE navigation_items
SET status = 'published'::publish_status,
    updated_at = NOW()
WHERE locale = 'en'::locale
  AND position IN ('header'::navigation_position, 'footer'::navigation_position);

COMMIT;
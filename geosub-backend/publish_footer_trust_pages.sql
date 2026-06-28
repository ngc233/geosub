SET client_encoding = 'UTF8';

BEGIN;

UPDATE navigation_items
SET status = 'published'::publish_status,
    updated_at = NOW()
WHERE locale = 'zh'::locale
  AND position = 'footer'::navigation_position
  AND href IN (
    '/zh/about/',
    '/zh/data-sources/',
    '/zh/privacy/',
    '/zh/terms/',
    '/zh/guides/methodology/'
  );

COMMIT;
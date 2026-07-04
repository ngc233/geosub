-- Keep the first beta navigation focused on pages with usable content.

UPDATE navigation_items
SET status = 'draft',
    updated_at = NOW()
WHERE external = FALSE
  AND (
    href LIKE '%/ai-rankings%'
    OR href LIKE '%/software-subscriptions%'
    OR href LIKE '%/gaming-steam%'
    OR href LIKE '%/gift-cards%'
    OR href LIKE '%/vpn%'
  );

INSERT INTO navigation_items (
  id,
  locale,
  label,
  href,
  position,
  parent_id,
  external,
  status,
  sort_order,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  'zh'::locale,
  '流媒体价格',
  '/zh/streaming-pricing',
  'header'::navigation_position,
  NULL,
  FALSE,
  'published',
  25,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM navigation_items
  WHERE locale = 'zh'::locale
    AND position = 'header'::navigation_position
    AND href = '/zh/streaming-pricing'
);

INSERT INTO navigation_items (
  id,
  locale,
  label,
  href,
  position,
  parent_id,
  external,
  status,
  sort_order,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  'en'::locale,
  'Streaming Pricing',
  '/en/streaming-pricing',
  'header'::navigation_position,
  NULL,
  FALSE,
  'published',
  25,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM navigation_items
  WHERE locale = 'en'::locale
    AND position = 'header'::navigation_position
    AND href = '/en/streaming-pricing'
);

SET client_encoding = 'UTF8';
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

DELETE FROM navigation_items
WHERE locale = 'en'::locale
  AND position IN ('header'::navigation_position, 'footer'::navigation_position);

DO $$
DECLARE
  header_guides_id uuid;
  footer_products_id uuid;
  footer_guides_id uuid;
  footer_about_id uuid;
BEGIN
  INSERT INTO navigation_items (
    id, locale, label, href, position, parent_id, icon, external, status, sort_order, created_at, updated_at
  ) VALUES
    (gen_random_uuid(), 'en'::locale, 'Home', '/en/', 'header'::navigation_position, NULL, NULL, false, 'draft'::publish_status, 10, NOW(), NOW()),
    (gen_random_uuid(), 'en'::locale, 'AI Pricing', '/en/ai-pricing/', 'header'::navigation_position, NULL, NULL, false, 'draft'::publish_status, 20, NOW(), NOW()),
    (gen_random_uuid(), 'en'::locale, 'Software Subscriptions', '/en/software-subscriptions/', 'header'::navigation_position, NULL, NULL, false, 'draft'::publish_status, 30, NOW(), NOW()),
    (gen_random_uuid(), 'en'::locale, 'Gaming / Steam', '/en/gaming-steam/', 'header'::navigation_position, NULL, NULL, false, 'draft'::publish_status, 40, NOW(), NOW()),
    (gen_random_uuid(), 'en'::locale, 'Gift Cards', '/en/gift-cards/', 'header'::navigation_position, NULL, NULL, false, 'draft'::publish_status, 50, NOW(), NOW()),
    (gen_random_uuid(), 'en'::locale, 'AI Tools', '/en/ai-rankings/', 'header'::navigation_position, NULL, NULL, false, 'draft'::publish_status, 60, NOW(), NOW());

  INSERT INTO navigation_items (
    id, locale, label, href, position, parent_id, icon, external, status, sort_order, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), 'en'::locale, 'Guides', '/en/guides/', 'header'::navigation_position, NULL, NULL, false, 'draft'::publish_status, 70, NOW(), NOW()
  )
  RETURNING id INTO header_guides_id;

  INSERT INTO navigation_items (
    id, locale, label, href, position, parent_id, icon, external, status, sort_order, created_at, updated_at
  ) VALUES
    (gen_random_uuid(), 'en'::locale, 'All Guides', '/en/guides/', 'header'::navigation_position, header_guides_id, NULL, false, 'draft'::publish_status, 10, NOW(), NOW()),
    (gen_random_uuid(), 'en'::locale, 'Price Guide', '/en/guides/price-guide/', 'header'::navigation_position, header_guides_id, NULL, false, 'draft'::publish_status, 20, NOW(), NOW()),
    (gen_random_uuid(), 'en'::locale, 'Gift Card Guide', '/en/guides/gift-card-guide/', 'header'::navigation_position, header_guides_id, NULL, false, 'draft'::publish_status, 30, NOW(), NOW()),
    (gen_random_uuid(), 'en'::locale, 'Payment & Account', '/en/guides/payment-account/', 'header'::navigation_position, header_guides_id, NULL, false, 'draft'::publish_status, 40, NOW(), NOW()),
    (gen_random_uuid(), 'en'::locale, 'Tool Review', '/en/guides/tool-review/', 'header'::navigation_position, header_guides_id, NULL, false, 'draft'::publish_status, 50, NOW(), NOW());

  INSERT INTO navigation_items (
    id, locale, label, href, position, parent_id, icon, external, status, sort_order, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), 'en'::locale, 'Products', '/en/', 'footer'::navigation_position, NULL, NULL, false, 'draft'::publish_status, 10, NOW(), NOW()
  )
  RETURNING id INTO footer_products_id;

  INSERT INTO navigation_items (
    id, locale, label, href, position, parent_id, icon, external, status, sort_order, created_at, updated_at
  ) VALUES
    (gen_random_uuid(), 'en'::locale, 'AI Pricing', '/en/ai-pricing/', 'footer'::navigation_position, footer_products_id, NULL, false, 'draft'::publish_status, 10, NOW(), NOW()),
    (gen_random_uuid(), 'en'::locale, 'Software Subscriptions', '/en/software-subscriptions/', 'footer'::navigation_position, footer_products_id, NULL, false, 'draft'::publish_status, 20, NOW(), NOW()),
    (gen_random_uuid(), 'en'::locale, 'Gaming / Steam', '/en/gaming-steam/', 'footer'::navigation_position, footer_products_id, NULL, false, 'draft'::publish_status, 30, NOW(), NOW()),
    (gen_random_uuid(), 'en'::locale, 'Gift Cards', '/en/gift-cards/', 'footer'::navigation_position, footer_products_id, NULL, false, 'draft'::publish_status, 40, NOW(), NOW()),
    (gen_random_uuid(), 'en'::locale, 'AI Tools', '/en/ai-rankings/', 'footer'::navigation_position, footer_products_id, NULL, false, 'draft'::publish_status, 50, NOW(), NOW());

  INSERT INTO navigation_items (
    id, locale, label, href, position, parent_id, icon, external, status, sort_order, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), 'en'::locale, 'Guides', '/en/guides/', 'footer'::navigation_position, NULL, NULL, false, 'draft'::publish_status, 20, NOW(), NOW()
  )
  RETURNING id INTO footer_guides_id;

  INSERT INTO navigation_items (
    id, locale, label, href, position, parent_id, icon, external, status, sort_order, created_at, updated_at
  ) VALUES
    (gen_random_uuid(), 'en'::locale, 'Price Guide', '/en/guides/price-guide/', 'footer'::navigation_position, footer_guides_id, NULL, false, 'draft'::publish_status, 10, NOW(), NOW()),
    (gen_random_uuid(), 'en'::locale, 'Gift Card Guide', '/en/guides/gift-card-guide/', 'footer'::navigation_position, footer_guides_id, NULL, false, 'draft'::publish_status, 20, NOW(), NOW()),
    (gen_random_uuid(), 'en'::locale, 'Payment & Account', '/en/guides/payment-account/', 'footer'::navigation_position, footer_guides_id, NULL, false, 'draft'::publish_status, 30, NOW(), NOW()),
    (gen_random_uuid(), 'en'::locale, 'Tool Review', '/en/guides/tool-review/', 'footer'::navigation_position, footer_guides_id, NULL, false, 'draft'::publish_status, 40, NOW(), NOW()),
    (gen_random_uuid(), 'en'::locale, 'Methodology', '/en/guides/methodology/', 'footer'::navigation_position, footer_guides_id, NULL, false, 'draft'::publish_status, 50, NOW(), NOW());

  INSERT INTO navigation_items (
    id, locale, label, href, position, parent_id, icon, external, status, sort_order, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), 'en'::locale, 'About', '/en/about/', 'footer'::navigation_position, NULL, NULL, false, 'draft'::publish_status, 30, NOW(), NOW()
  )
  RETURNING id INTO footer_about_id;

  INSERT INTO navigation_items (
    id, locale, label, href, position, parent_id, icon, external, status, sort_order, created_at, updated_at
  ) VALUES
    (gen_random_uuid(), 'en'::locale, 'About GeoSub', '/en/about/', 'footer'::navigation_position, footer_about_id, NULL, false, 'draft'::publish_status, 10, NOW(), NOW()),
    (gen_random_uuid(), 'en'::locale, 'Data Sources', '/en/data-sources/', 'footer'::navigation_position, footer_about_id, NULL, false, 'draft'::publish_status, 20, NOW(), NOW()),
    (gen_random_uuid(), 'en'::locale, 'Privacy Policy', '/en/privacy/', 'footer'::navigation_position, footer_about_id, NULL, false, 'draft'::publish_status, 30, NOW(), NOW()),
    (gen_random_uuid(), 'en'::locale, 'Terms of Service', '/en/terms/', 'footer'::navigation_position, footer_about_id, NULL, false, 'draft'::publish_status, 40, NOW(), NOW());
END $$;

COMMIT;
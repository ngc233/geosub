-- GeoSub schema migration. Split from sql/073_product_seo_content_quality.sql; see migration-layout.json.

CREATE UNIQUE INDEX IF NOT EXISTS uniq_seo_meta_product_plan_locale
ON seo_meta (
  product_id,
  COALESCE(plan_id, '00000000-0000-0000-0000-000000000000'::uuid),
  locale
);

CREATE OR REPLACE FUNCTION ensure_published_product_seo_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  locale_code TEXT;
  section_slug TEXT;
  default_title TEXT;
  default_description TEXT;
  default_h1 TEXT;
  default_canonical TEXT;
BEGIN
  IF NEW.status <> 'published'::publish_status
     OR NEW.category NOT IN (
       'ai'::product_category,
       'streaming'::product_category
     ) THEN
    RETURN NEW;
  END IF;

  section_slug := CASE
    WHEN NEW.category = 'streaming'::product_category
      THEN 'streaming-pricing'
    ELSE 'ai-pricing'
  END;

  FOREACH locale_code IN ARRAY ARRAY['zh', 'en']
  LOOP
    default_title := CASE locale_code
      WHEN 'zh' THEN NEW.name || '价格：全球各地区与套餐对比'
      ELSE NEW.name || ' pricing by country and plan'
    END;
    default_description := CASE locale_code
      WHEN 'zh' THEN
        '比较 ' || NEW.name ||
        ' 在不同国家和地区的 App Store 订阅价格，查看当地货币、美元折算、税费说明、汇率日期与购买力差异，帮助判断更合适的套餐和订阅地区。'
      ELSE
        'Compare ' || NEW.name ||
        ' App Store subscription prices by country, with local currency, USD conversion, tax notes, exchange-rate dates and purchasing-power context for each plan.'
    END;
    default_h1 := CASE locale_code
      WHEN 'zh' THEN NEW.name || ' 全球订阅价格与套餐对比'
      ELSE NEW.name || ' global subscription pricing by plan'
    END;
    default_canonical :=
      '/' || locale_code || '/' || section_slug || '/' || NEW.slug;

    INSERT INTO seo_meta (
      id,
      product_id,
      plan_id,
      article_id,
      category_id,
      locale,
      title,
      description,
      h1,
      canonical_url,
      status,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      NEW.id,
      NULL,
      NULL,
      NULL,
      locale_code::locale,
      default_title,
      default_description,
      default_h1,
      default_canonical,
      'published'::publish_status,
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;

    UPDATE seo_meta seo
    SET
      title = CASE
        WHEN LENGTH(BTRIM(seo.title)) BETWEEN 10 AND 65
          THEN seo.title
        ELSE default_title
      END,
      description = CASE
        WHEN LENGTH(BTRIM(COALESCE(seo.description, ''))) BETWEEN 70 AND 180
          THEN seo.description
        ELSE default_description
      END,
      h1 = CASE
        WHEN LENGTH(BTRIM(COALESCE(seo.h1, ''))) >= 10
          THEN seo.h1
        ELSE default_h1
      END,
      canonical_url = default_canonical,
      status = 'published'::publish_status,
      updated_at = NOW()
    WHERE seo.product_id = NEW.id
      AND seo.plan_id IS NULL
      AND seo.article_id IS NULL
      AND seo.category_id IS NULL
      AND seo.locale = locale_code::locale;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_ensure_published_seo ON products;
CREATE TRIGGER trg_products_ensure_published_seo
AFTER INSERT OR UPDATE OF name, slug, category, status
ON products
FOR EACH ROW
EXECUTE FUNCTION ensure_published_product_seo_metadata();

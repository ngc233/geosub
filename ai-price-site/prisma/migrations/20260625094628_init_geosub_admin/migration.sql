-- CreateEnum
CREATE TYPE "locale" AS ENUM ('zh', 'en', 'es', 'ja', 'ko', 'de');

-- CreateEnum
CREATE TYPE "publish_status" AS ENUM ('draft', 'review', 'published', 'archived');

-- CreateEnum
CREATE TYPE "article_status" AS ENUM ('draft', 'review', 'published', 'scheduled', 'archived');

-- CreateEnum
CREATE TYPE "product_category" AS ENUM ('ai', 'streaming', 'software', 'game', 'gift_card', 'vpn', 'payment', 'other');

-- CreateEnum
CREATE TYPE "billing_cycle" AS ENUM ('monthly', 'yearly', 'weekly', 'quarterly', 'one_time', 'lifetime', 'unknown');

-- CreateEnum
CREATE TYPE "billing_platform" AS ENUM ('web', 'ios', 'android', 'steam', 'gift_card', 'unknown');

-- CreateEnum
CREATE TYPE "price_type" AS ENUM ('list_price', 'promo_price', 'student_price', 'family_price', 'bundle_price', 'unknown');

-- CreateEnum
CREATE TYPE "data_quality" AS ENUM ('verified', 'estimated', 'stale', 'pending_review');

-- CreateEnum
CREATE TYPE "source_level" AS ENUM ('A', 'B', 'C', 'D', 'E');

-- CreateEnum
CREATE TYPE "price_source_type" AS ENUM ('official_page', 'help_center', 'api', 'app_store', 'google_play', 'crawler', 'third_party', 'manual', 'user_submission');

-- CreateEnum
CREATE TYPE "source_status" AS ENUM ('active', 'paused', 'deprecated');

-- CreateEnum
CREATE TYPE "risk_level" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "observation_status" AS ENUM ('pending', 'approved', 'rejected', 'ignored');

-- CreateEnum
CREATE TYPE "tax_included" AS ENUM ('true', 'false', 'unknown');

-- CreateEnum
CREATE TYPE "evidence_type" AS ENUM ('html', 'json', 'screenshot', 'text_snapshot', 'other');

-- CreateEnum
CREATE TYPE "review_target_type" AS ENUM ('region_price', 'observation', 'product', 'seo', 'affiliate', 'ad_slot', 'article');

-- CreateEnum
CREATE TYPE "review_status" AS ENUM ('pending', 'approved', 'rejected', 'resolved');

-- CreateEnum
CREATE TYPE "severity" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "article_type" AS ENUM ('guide', 'how_to', 'comparison', 'ranking', 'news', 'methodology', 'faq_hub', 'review', 'announcement', 'other');

-- CreateEnum
CREATE TYPE "block_type" AS ENUM ('paragraph', 'heading', 'image', 'table', 'callout', 'quote', 'code', 'price_table', 'product_card', 'country_card', 'affiliate_box', 'ad_slot', 'faq', 'toc', 'related_articles', 'custom_html');

-- CreateEnum
CREATE TYPE "relation_type" AS ENUM ('related_product', 'related_plan', 'related_country', 'related_article', 'recommended_reading', 'source_reference', 'commercial_recommendation');

-- CreateEnum
CREATE TYPE "ad_provider" AS ENUM ('adsense', 'ezoic', 'custom', 'affiliate', 'none');

-- CreateEnum
CREATE TYPE "page_type" AS ENUM ('home', 'category', 'product', 'ranking', 'compare', 'article', 'global');

-- CreateEnum
CREATE TYPE "affiliate_category" AS ENUM ('vpn', 'payment', 'official', 'service', 'gift_card', 'software', 'other');

-- CreateEnum
CREATE TYPE "navigation_position" AS ENUM ('header', 'footer', 'sidebar', 'mobile', 'article_toc', 'other');

-- CreateEnum
CREATE TYPE "structured_data_type" AS ENUM ('Article', 'BlogPosting', 'HowTo', 'FAQPage', 'NewsArticle', 'TechArticle', 'None');

-- CreateEnum
CREATE TYPE "admin_role" AS ENUM ('owner', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "admin_status" AS ENUM ('active', 'disabled');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "role" "admin_role" NOT NULL DEFAULT 'owner',
    "status" "admin_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "original_name" TEXT,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "storage_path" TEXT NOT NULL,
    "public_url" TEXT NOT NULL,
    "alt_text" TEXT,
    "caption" TEXT,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_zh" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_es" TEXT,
    "name_ja" TEXT,
    "currency" TEXT NOT NULL,
    "region" TEXT,
    "is_reference" BOOLEAN NOT NULL DEFAULT false,
    "is_supported" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "product_category" NOT NULL DEFAULT 'ai',
    "provider" TEXT,
    "logo_asset_id" UUID,
    "logo_url" TEXT,
    "description" TEXT,
    "official_url" TEXT,
    "status" "publish_status" NOT NULL DEFAULT 'draft',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billing_cycle" "billing_cycle" NOT NULL DEFAULT 'monthly',
    "description" TEXT,
    "status" "publish_status" NOT NULL DEFAULT 'draft',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "region_prices" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "local_price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "price_usd" DECIMAL(12,2) NOT NULL,
    "us_base_price" DECIMAL(12,2),
    "diff_vs_us_percent" DECIMAL(8,2),
    "billing_platform" "billing_platform" NOT NULL DEFAULT 'web',
    "price_type" "price_type" NOT NULL DEFAULT 'list_price',
    "tax_note" TEXT,
    "availability_note" TEXT,
    "source_summary" TEXT,
    "primary_source_id" UUID,
    "confidence_score" INTEGER NOT NULL DEFAULT 60,
    "data_quality" "data_quality" NOT NULL DEFAULT 'pending_review',
    "status" "publish_status" NOT NULL DEFAULT 'draft',
    "last_checked_at" TIMESTAMPTZ(6),
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "region_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_sources" (
    "id" UUID NOT NULL,
    "source_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source_level" "source_level" NOT NULL DEFAULT 'C',
    "type" "price_source_type" NOT NULL DEFAULT 'manual',
    "provider" TEXT,
    "base_url" TEXT,
    "country_url_pattern" TEXT,
    "requires_javascript" BOOLEAN NOT NULL DEFAULT false,
    "requires_account" BOOLEAN NOT NULL DEFAULT false,
    "requires_geo" BOOLEAN NOT NULL DEFAULT false,
    "terms_risk" "risk_level" NOT NULL DEFAULT 'low',
    "reliability_score" INTEGER NOT NULL DEFAULT 60,
    "status" "source_status" NOT NULL DEFAULT 'active',
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "price_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_observations" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "plan_id" UUID,
    "country_id" UUID,
    "source_id" UUID,
    "source_level" "source_level" NOT NULL DEFAULT 'C',
    "raw_price" DECIMAL(12,2),
    "currency" TEXT,
    "converted_usd" DECIMAL(12,2),
    "observed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_url" TEXT,
    "locale" TEXT,
    "ip_country" TEXT,
    "billing_platform" "billing_platform" NOT NULL DEFAULT 'unknown',
    "price_type" "price_type" NOT NULL DEFAULT 'list_price',
    "tax_included" "tax_included" NOT NULL DEFAULT 'unknown',
    "raw_payload" JSONB,
    "parser_version" TEXT,
    "confidence_score" INTEGER NOT NULL DEFAULT 0,
    "anomaly_flag" BOOLEAN NOT NULL DEFAULT false,
    "anomaly_reason" TEXT,
    "status" "observation_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "price_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_evidence" (
    "id" UUID NOT NULL,
    "observation_id" UUID NOT NULL,
    "evidence_type" "evidence_type" NOT NULL DEFAULT 'html',
    "storage_url" TEXT,
    "content_hash" TEXT,
    "captured_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "http_status" INTEGER,
    "final_url" TEXT,
    "user_agent" TEXT,
    "country_context" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_queue" (
    "id" UUID NOT NULL,
    "target_type" "review_target_type" NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "severity" "severity" NOT NULL DEFAULT 'medium',
    "status" "review_status" NOT NULL DEFAULT 'pending',
    "assigned_to" TEXT,
    "note" TEXT,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "review_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" UUID NOT NULL,
    "base_currency" TEXT NOT NULL,
    "quote_currency" TEXT NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "source" TEXT,
    "rate_date" DATE NOT NULL,
    "fetched_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_meta" (
    "id" UUID NOT NULL,
    "product_id" UUID,
    "plan_id" UUID,
    "article_id" UUID,
    "category_id" UUID,
    "locale" "locale" NOT NULL DEFAULT 'zh',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "h1" TEXT,
    "canonical_url" TEXT,
    "schema_type" "structured_data_type" NOT NULL DEFAULT 'None',
    "status" "publish_status" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "seo_meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" UUID NOT NULL,
    "product_id" UUID,
    "plan_id" UUID,
    "article_id" UUID,
    "locale" "locale" NOT NULL DEFAULT 'zh',
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "publish_status" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_links" (
    "id" UUID NOT NULL,
    "product_id" UUID,
    "category" "affiliate_category" NOT NULL DEFAULT 'official',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "button_text" TEXT,
    "url" TEXT NOT NULL,
    "placement" TEXT NOT NULL DEFAULT 'product_after_map',
    "locale" "locale" NOT NULL DEFAULT 'zh',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "publish_status" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "affiliate_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_slots" (
    "id" UUID NOT NULL,
    "slot_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "page_type" "page_type" NOT NULL DEFAULT 'product',
    "provider" "ad_provider" NOT NULL DEFAULT 'adsense',
    "code" TEXT,
    "status" "publish_status" NOT NULL DEFAULT 'draft',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "show_on_mobile" BOOLEAN NOT NULL DEFAULT true,
    "show_on_desktop" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ad_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "locale" "locale" NOT NULL DEFAULT 'zh',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" UUID,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "status" "publish_status" NOT NULL DEFAULT 'draft',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "article_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "locale" "locale" NOT NULL DEFAULT 'zh',
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "excerpt" TEXT,
    "article_type" "article_type" NOT NULL DEFAULT 'guide',
    "category_id" UUID,
    "cover_asset_id" UUID,
    "cover_image_url" TEXT,
    "author_name" TEXT DEFAULT 'GeoSub 编辑部',
    "body_markdown" TEXT,
    "body_html" TEXT,
    "body_json" JSONB,
    "status" "article_status" NOT NULL DEFAULT 'draft',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "reading_time" INTEGER,
    "published_at" TIMESTAMPTZ(6),
    "scheduled_at" TIMESTAMPTZ(6),
    "canonical_url" TEXT,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "seo_keywords" TEXT,
    "og_title" TEXT,
    "og_description" TEXT,
    "og_asset_id" UUID,
    "og_image_url" TEXT,
    "structured_data_type" "structured_data_type" NOT NULL DEFAULT 'Article',
    "toc_enabled" BOOLEAN NOT NULL DEFAULT true,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "nofollow" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_blocks" (
    "id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "block_type" "block_type" NOT NULL DEFAULT 'paragraph',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "heading_level" INTEGER,
    "title" TEXT,
    "content_markdown" TEXT,
    "content_html" TEXT,
    "content_json" JSONB,
    "image_asset_id" UUID,
    "image_url" TEXT,
    "image_alt" TEXT,
    "image_caption" TEXT,
    "linked_product_id" UUID,
    "linked_plan_id" UUID,
    "linked_country_id" UUID,
    "ad_slot_id" UUID,
    "affiliate_link_id" UUID,
    "status" "publish_status" NOT NULL DEFAULT 'published',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "article_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_tags" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "locale" "locale" NOT NULL DEFAULT 'zh',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "publish_status" NOT NULL DEFAULT 'published',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "article_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_tag_links" (
    "id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_tag_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_relations" (
    "id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "relation_type" "relation_type" NOT NULL DEFAULT 'recommended_reading',
    "product_id" UUID,
    "plan_id" UUID,
    "country_id" UUID,
    "related_article_id" UUID,
    "affiliate_link_id" UUID,
    "title" TEXT,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "publish_status" NOT NULL DEFAULT 'published',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "article_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" UUID NOT NULL,
    "setting_key" TEXT NOT NULL,
    "group_name" TEXT NOT NULL DEFAULT 'general',
    "label" TEXT NOT NULL,
    "value_text" TEXT,
    "value_json" JSONB,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redirects" (
    "id" UUID NOT NULL,
    "source_path" TEXT NOT NULL,
    "target_path" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL DEFAULT 301,
    "locale" "locale",
    "reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "hit_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "redirects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "navigation_items" (
    "id" UUID NOT NULL,
    "locale" "locale" NOT NULL DEFAULT 'zh',
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "position" "navigation_position" NOT NULL DEFAULT 'header',
    "parent_id" UUID,
    "icon" TEXT,
    "external" BOOLEAN NOT NULL DEFAULT false,
    "status" "publish_status" NOT NULL DEFAULT 'published',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "navigation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_links" (
    "id" UUID NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" UUID,
    "target_type" TEXT NOT NULL,
    "target_id" UUID,
    "target_url" TEXT,
    "anchor_text" TEXT NOT NULL,
    "locale" "locale" NOT NULL DEFAULT 'zh',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "publish_status" NOT NULL DEFAULT 'published',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "internal_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_events" (
    "id" UUID NOT NULL,
    "event_key" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collector_jobs" (
    "id" UUID NOT NULL,
    "source_id" UUID,
    "product_id" UUID,
    "job_type" TEXT NOT NULL DEFAULT 'price_check',
    "schedule" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_run_at" TIMESTAMPTZ(6),
    "next_run_at" TIMESTAMPTZ(6),
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "collector_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parser_rules" (
    "id" UUID NOT NULL,
    "source_id" UUID,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1',
    "selector_config" JSONB,
    "regex_config" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "parser_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID,
    "old_value" JSONB,
    "new_value" JSONB,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_token_hash_key" ON "admin_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "admin_sessions_user_id_idx" ON "admin_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE INDEX "countries_code_idx" ON "countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_category_status_idx" ON "products"("category", "status");

-- CreateIndex
CREATE INDEX "plans_product_id_status_idx" ON "plans"("product_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "plans_product_id_slug_key" ON "plans"("product_id", "slug");

-- CreateIndex
CREATE INDEX "region_prices_product_id_idx" ON "region_prices"("product_id");

-- CreateIndex
CREATE INDEX "region_prices_plan_id_country_id_idx" ON "region_prices"("plan_id", "country_id");

-- CreateIndex
CREATE INDEX "region_prices_status_idx" ON "region_prices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "region_prices_plan_id_country_id_billing_platform_price_typ_key" ON "region_prices"("plan_id", "country_id", "billing_platform", "price_type");

-- CreateIndex
CREATE UNIQUE INDEX "price_sources_source_key_key" ON "price_sources"("source_key");

-- CreateIndex
CREATE INDEX "price_observations_product_id_country_id_idx" ON "price_observations"("product_id", "country_id");

-- CreateIndex
CREATE INDEX "price_observations_status_idx" ON "price_observations"("status");

-- CreateIndex
CREATE INDEX "source_evidence_observation_id_idx" ON "source_evidence"("observation_id");

-- CreateIndex
CREATE INDEX "review_queue_status_idx" ON "review_queue"("status");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_base_currency_quote_currency_rate_date_sourc_key" ON "exchange_rates"("base_currency", "quote_currency", "rate_date", "source");

-- CreateIndex
CREATE INDEX "seo_meta_locale_status_idx" ON "seo_meta"("locale", "status");

-- CreateIndex
CREATE INDEX "seo_meta_product_id_idx" ON "seo_meta"("product_id");

-- CreateIndex
CREATE INDEX "seo_meta_article_id_idx" ON "seo_meta"("article_id");

-- CreateIndex
CREATE INDEX "faqs_locale_status_idx" ON "faqs"("locale", "status");

-- CreateIndex
CREATE INDEX "affiliate_links_status_idx" ON "affiliate_links"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ad_slots_slot_key_key" ON "ad_slots"("slot_key");

-- CreateIndex
CREATE INDEX "article_categories_locale_status_idx" ON "article_categories"("locale", "status");

-- CreateIndex
CREATE UNIQUE INDEX "article_categories_slug_locale_key" ON "article_categories"("slug", "locale");

-- CreateIndex
CREATE INDEX "articles_locale_status_idx" ON "articles"("locale", "status");

-- CreateIndex
CREATE INDEX "articles_article_type_status_idx" ON "articles"("article_type", "status");

-- CreateIndex
CREATE INDEX "articles_category_id_status_idx" ON "articles"("category_id", "status");

-- CreateIndex
CREATE INDEX "articles_published_at_idx" ON "articles"("published_at");

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_locale_key" ON "articles"("slug", "locale");

-- CreateIndex
CREATE INDEX "article_blocks_article_id_sort_order_idx" ON "article_blocks"("article_id", "sort_order");

-- CreateIndex
CREATE INDEX "article_tags_locale_status_idx" ON "article_tags"("locale", "status");

-- CreateIndex
CREATE UNIQUE INDEX "article_tags_slug_locale_key" ON "article_tags"("slug", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "article_tag_links_article_id_tag_id_key" ON "article_tag_links"("article_id", "tag_id");

-- CreateIndex
CREATE INDEX "article_relations_article_id_relation_type_idx" ON "article_relations"("article_id", "relation_type");

-- CreateIndex
CREATE INDEX "article_relations_product_id_idx" ON "article_relations"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_setting_key_key" ON "site_settings"("setting_key");

-- CreateIndex
CREATE UNIQUE INDEX "redirects_source_path_key" ON "redirects"("source_path");

-- CreateIndex
CREATE INDEX "redirects_is_active_idx" ON "redirects"("is_active");

-- CreateIndex
CREATE INDEX "navigation_items_locale_position_status_idx" ON "navigation_items"("locale", "position", "status");

-- CreateIndex
CREATE INDEX "internal_links_source_type_source_id_locale_idx" ON "internal_links"("source_type", "source_id", "locale");

-- CreateIndex
CREATE INDEX "internal_links_target_type_target_id_locale_idx" ON "internal_links"("target_type", "target_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_events_event_key_key" ON "tracking_events"("event_key");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_logo_asset_id_fkey" FOREIGN KEY ("logo_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "region_prices" ADD CONSTRAINT "region_prices_primary_source_id_fkey" FOREIGN KEY ("primary_source_id") REFERENCES "price_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "region_prices" ADD CONSTRAINT "region_prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "region_prices" ADD CONSTRAINT "region_prices_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "region_prices" ADD CONSTRAINT "region_prices_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_observations" ADD CONSTRAINT "price_observations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_observations" ADD CONSTRAINT "price_observations_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_observations" ADD CONSTRAINT "price_observations_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_observations" ADD CONSTRAINT "price_observations_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "price_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_evidence" ADD CONSTRAINT "source_evidence_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "price_observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_meta" ADD CONSTRAINT "seo_meta_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_meta" ADD CONSTRAINT "seo_meta_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_meta" ADD CONSTRAINT "seo_meta_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_meta" ADD CONSTRAINT "seo_meta_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "article_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "article_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "article_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_og_asset_id_fkey" FOREIGN KEY ("og_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_blocks" ADD CONSTRAINT "article_blocks_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_blocks" ADD CONSTRAINT "article_blocks_image_asset_id_fkey" FOREIGN KEY ("image_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_blocks" ADD CONSTRAINT "article_blocks_linked_product_id_fkey" FOREIGN KEY ("linked_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_blocks" ADD CONSTRAINT "article_blocks_linked_plan_id_fkey" FOREIGN KEY ("linked_plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_blocks" ADD CONSTRAINT "article_blocks_linked_country_id_fkey" FOREIGN KEY ("linked_country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_blocks" ADD CONSTRAINT "article_blocks_ad_slot_id_fkey" FOREIGN KEY ("ad_slot_id") REFERENCES "ad_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_blocks" ADD CONSTRAINT "article_blocks_affiliate_link_id_fkey" FOREIGN KEY ("affiliate_link_id") REFERENCES "affiliate_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_tag_links" ADD CONSTRAINT "article_tag_links_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_tag_links" ADD CONSTRAINT "article_tag_links_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "article_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_relations" ADD CONSTRAINT "article_relations_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_relations" ADD CONSTRAINT "article_relations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_relations" ADD CONSTRAINT "article_relations_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_relations" ADD CONSTRAINT "article_relations_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_relations" ADD CONSTRAINT "article_relations_related_article_id_fkey" FOREIGN KEY ("related_article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_relations" ADD CONSTRAINT "article_relations_affiliate_link_id_fkey" FOREIGN KEY ("affiliate_link_id") REFERENCES "affiliate_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "navigation_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collector_jobs" ADD CONSTRAINT "collector_jobs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "price_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collector_jobs" ADD CONSTRAINT "collector_jobs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parser_rules" ADD CONSTRAINT "parser_rules_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "price_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- GeoSub schema migration. Split from sql/045_article_soft_delete_trash.sql; see migration-layout.json.

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_articles_deleted_at
  ON articles(deleted_at);

CREATE INDEX IF NOT EXISTS idx_articles_active_status
  ON articles(locale, status, published_at DESC)
  WHERE deleted_at IS NULL;

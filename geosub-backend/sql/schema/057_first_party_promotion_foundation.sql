-- Additive foundation migration. All public promotion and analytics remain disabled.
BEGIN;
CREATE TABLE IF NOT EXISTS promotion_config (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), generation integer NOT NULL DEFAULT 0 CHECK(generation>=0),
 enabled boolean NOT NULL DEFAULT false, placement_enabled boolean NOT NULL DEFAULT false,
 revision uuid, analytics_enabled boolean NOT NULL DEFAULT false CHECK(NOT analytics_enabled)
);
CREATE TABLE IF NOT EXISTS promotion_revisions (
 id uuid PRIMARY KEY, campaign uuid NOT NULL, author uuid NOT NULL REFERENCES admin_users(id),
 digest text NOT NULL CHECK(length(digest)=64), content jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(content->>'placement' IN ('zh_home_brand','zh_google_one_related','zh_telegram_premium_related')),
 CHECK((content->>'endsAt')::timestamptz > (content->>'startsAt')::timestamptz)
);
CREATE TABLE IF NOT EXISTS promotion_reviews (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 revision uuid NOT NULL REFERENCES promotion_revisions(id), actor uuid NOT NULL REFERENCES admin_users(id),
 status text NOT NULL CHECK(status IN ('approved','rejected','revoked')),
 payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION promotion_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Promotion history is append-only'; END $$;
DROP TRIGGER IF EXISTS promotion_revision_immutable ON promotion_revisions;
CREATE TRIGGER promotion_revision_immutable BEFORE UPDATE OR DELETE ON promotion_revisions FOR EACH ROW EXECUTE FUNCTION promotion_immutable();
DROP TRIGGER IF EXISTS promotion_review_immutable ON promotion_reviews;
CREATE TRIGGER promotion_review_immutable BEFORE UPDATE OR DELETE ON promotion_reviews FOR EACH ROW EXECUTE FUNCTION promotion_immutable();
-- Null JSON fields must fail, rather than passing SQL CHECK via UNKNOWN.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='promotion_revision_required' AND conrelid='promotion_revisions'::regclass) THEN
  ALTER TABLE promotion_revisions ADD CONSTRAINT promotion_revision_required CHECK (
   jsonb_typeof(content)='object' AND content ?& ARRAY['placement','merchant','title','description','cta','destination','evidence','startsAt','endsAt']
   AND coalesce(length(content->>'merchant') BETWEEN 1 AND 60,false)
   AND coalesce(length(content->>'title') BETWEEN 1 AND 80,false)
   AND coalesce(length(content->>'description') BETWEEN 1 AND 300,false)
   AND coalesce(length(content->>'cta') BETWEEN 1 AND 24,false)
   AND coalesce(content->>'placement' IN ('zh_home_brand','zh_google_one_related','zh_telegram_premium_related'),false)
   AND coalesce((content->>'endsAt')::timestamptz > (content->>'startsAt')::timestamptz,false)
  );
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='promotion_config_revision_fk' AND conrelid='promotion_config'::regclass) THEN
  ALTER TABLE promotion_config ADD CONSTRAINT promotion_config_revision_fk FOREIGN KEY(revision) REFERENCES promotion_revisions(id);
 END IF;
END $$;
CREATE OR REPLACE FUNCTION promotion_validate_review() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r promotion_revisions; previous text;
BEGIN
 PERFORM pg_advisory_xact_lock(721091115);
 SELECT * INTO STRICT r FROM promotion_revisions WHERE id=NEW.revision;
 IF NOT coalesce(NEW.payload->>'revision'=NEW.revision::text AND NEW.payload->>'actor'=NEW.actor::text AND NEW.payload->>'status'=NEW.status AND NEW.payload->>'digest'=r.digest,false) THEN
  RAISE EXCEPTION 'Promotion review identity mismatch';
 END IF;
 IF NEW.status='approved' AND r.author=NEW.actor THEN RAISE EXCEPTION 'Promotion self review forbidden'; END IF;
 SELECT status INTO previous FROM promotion_reviews WHERE revision=NEW.revision ORDER BY id DESC LIMIT 1;
 IF previous='revoked' THEN RAISE EXCEPTION 'Revoked revision is terminal'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS promotion_review_validate ON promotion_reviews;
CREATE TRIGGER promotion_review_validate BEFORE INSERT ON promotion_reviews FOR EACH ROW EXECUTE FUNCTION promotion_validate_review();
INSERT INTO promotion_config(id) VALUES(true) ON CONFLICT DO NOTHING;
COMMIT;

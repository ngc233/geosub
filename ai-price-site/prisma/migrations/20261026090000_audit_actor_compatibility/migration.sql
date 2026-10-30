-- Additive bridge for SQL actor TEXT and Prisma actor_id UUID installations.
-- Never infer account identities from historical text, rename, or backfill rows.
DO $$
DECLARE col RECORD; actor_key SMALLINT; admin_key SMALLINT; fk RECORD;
BEGIN
  PERFORM set_config('lock_timeout', '5s', true);
  LOCK TABLE public.audit_logs IN SHARE ROW EXCLUSIVE MODE;
  FOR col IN
    SELECT attname, atttypid, attnotnull FROM pg_attribute
    WHERE attrelid = 'public.audit_logs'::regclass AND attname IN ('actor','actor_id') AND NOT attisdropped
  LOOP
    IF col.attnotnull OR col.atttypid <> (CASE WHEN col.attname = 'actor' THEN 'text'::regtype ELSE 'uuid'::regtype END) THEN
      RAISE EXCEPTION 'Unsupported audit actor column shape; preserve data and investigate before migration';
    END IF;
  END LOOP;
  ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor TEXT;
  ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_id UUID;
  SELECT attnum INTO actor_key FROM pg_attribute WHERE attrelid='public.audit_logs'::regclass AND attname='actor_id';
  SELECT attnum INTO admin_key FROM pg_attribute WHERE attrelid='public.admin_users'::regclass AND attname='id';
  FOR fk IN SELECT * FROM pg_constraint WHERE conrelid='public.audit_logs'::regclass AND contype='f' AND actor_key=ANY(conkey)
  LOOP
    IF fk.conkey <> ARRAY[actor_key] OR fk.confrelid <> 'public.admin_users'::regclass OR fk.confkey <> ARRAY[admin_key]
      OR fk.confdeltype <> 'n' OR fk.confupdtype <> 'c' THEN
      RAISE EXCEPTION 'Unsupported audit actor foreign key; preserve data and investigate before migration';
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.audit_logs'::regclass AND contype='f' AND conkey=ARRAY[actor_key]) THEN
    ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_actor_id_fkey
      FOREIGN KEY (actor_id) REFERENCES public.admin_users(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  -- Orphans fail atomically, never get deleted or nulled.
  FOR fk IN SELECT conname FROM pg_constraint WHERE conrelid='public.audit_logs'::regclass AND contype='f' AND conkey=ARRAY[actor_key] AND NOT convalidated
  LOOP
    EXECUTE format('ALTER TABLE public.audit_logs VALIDATE CONSTRAINT %I', fk.conname);
  END LOOP;
END $$;

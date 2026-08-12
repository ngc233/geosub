\set ON_ERROR_STOP on

BEGIN READ ONLY;

DO $$
DECLARE
  missing_relations text;
BEGIN
  SELECT string_agg(relation_name, ', ' ORDER BY relation_name)
  INTO missing_relations
  FROM unnest(ARRAY[
    'products',
    'plans',
    'countries',
    'price_sources',
    'region_prices',
    'price_observations',
    'exchange_rates',
    'collector_jobs',
    'articles',
    'event_logs',
    'pending_price_observations_view',
    'price_observations_review_history_view',
    'latest_plan_affordability_metrics'
  ]) AS relation_name
  WHERE to_regclass('public.' || relation_name) IS NULL;

  IF missing_relations IS NOT NULL THEN
    RAISE EXCEPTION 'Missing required relations: %', missing_relations;
  END IF;
END
$$;

DO $$
DECLARE
  missing_functions text;
BEGIN
  SELECT string_agg(function_name, ', ' ORDER BY function_name)
  INTO missing_functions
  FROM unnest(ARRAY[
    'approve_price_observation',
    'get_latest_exchange_rate',
    'refresh_plan_affordability_metrics',
    'run_app_store_stability_auto_review',
    'upsert_exchange_rate'
  ]) AS function_name
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_proc
    JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
    WHERE pg_namespace.nspname = 'public'
      AND pg_proc.proname = function_name
  );

  IF missing_functions IS NOT NULL THEN
    RAISE EXCEPTION 'Missing required functions: %', missing_functions;
  END IF;
END
$$;

DO $$
DECLARE
  invalid_constraints text;
BEGIN
  SELECT string_agg(conname, ', ' ORDER BY conname)
  INTO invalid_constraints
  FROM pg_constraint
  JOIN pg_namespace ON pg_namespace.oid = pg_constraint.connamespace
  WHERE pg_namespace.nspname = 'public'
    AND contype = 'f'
    AND NOT convalidated;

  IF invalid_constraints IS NOT NULL THEN
    RAISE EXCEPTION 'Unvalidated foreign keys: %', invalid_constraints;
  END IF;
END
$$;

DO $$
DECLARE
  current_view record;
BEGIN
  FOR current_view IN
    SELECT schemaname, viewname
    FROM pg_views
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'SELECT 1 FROM %I.%I LIMIT 0',
      current_view.schemaname,
      current_view.viewname
    );
  END LOOP;
END
$$;

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM products) = 0 THEN
    RAISE EXCEPTION 'products is unexpectedly empty';
  END IF;
  IF (SELECT COUNT(*) FROM plans) = 0 THEN
    RAISE EXCEPTION 'plans is unexpectedly empty';
  END IF;
  IF (SELECT COUNT(*) FROM countries) = 0 THEN
    RAISE EXCEPTION 'countries is unexpectedly empty';
  END IF;
  IF (SELECT COUNT(*) FROM region_prices) = 0 THEN
    RAISE EXCEPTION 'region_prices is unexpectedly empty';
  END IF;
  IF (SELECT COUNT(*) FROM exchange_rates) = 0 THEN
    RAISE EXCEPTION 'exchange_rates is unexpectedly empty';
  END IF;
END
$$;

SELECT current_database() AS restored_database;
SELECT COUNT(*) AS public_tables
FROM pg_tables
WHERE schemaname = 'public';
SELECT COUNT(*) AS validated_foreign_keys
FROM pg_constraint
JOIN pg_namespace ON pg_namespace.oid = pg_constraint.connamespace
WHERE pg_namespace.nspname = 'public'
  AND contype = 'f'
  AND convalidated;
SELECT COUNT(*) AS readable_public_views
FROM pg_views
WHERE schemaname = 'public';
SELECT COUNT(*) AS public_functions
FROM pg_proc
JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
WHERE pg_namespace.nspname = 'public';

COMMIT;

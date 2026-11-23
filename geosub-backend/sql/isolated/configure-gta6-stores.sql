-- Run after schema 062. Register the complete catalog and start the two HK standard-edition jobs.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('geosub.configure.gta6.hk.v1'));
DO $$
DECLARE
    p uuid;
    s uuid;
    t uuid;
    j uuid;
    item record;
BEGIN
    INSERT INTO products(slug,name,category) VALUES ('gta-6','Grand Theft Auto VI','game') ON CONFLICT(slug) DO NOTHING;
    SELECT id INTO STRICT p FROM products WHERE slug='gta-6' AND category='game';
    FOR item IN
        WITH sku(platform,source_key,name,edition,offer_type,store_id,slug) AS (VALUES
            ('ps5','playstation-store','PlayStation Store','standard','full_game','EP1004-PPSA01547_00-GTAVISTANDARD001',''),
            ('ps5','playstation-store','PlayStation Store','ultimate','full_game','EP1004-PPSA01547_00-GTAVIULTIMATE001',''),
            ('ps5','playstation-store','PlayStation Store','ultimate','upgrade','EP1004-PPSA01547_00-ULTEDTIONUPGRADE',''),
            ('xbox','xbox-store','Xbox Store','standard','full_game','9np019g7nzxt','grand-theft-auto-vi'),
            ('xbox','xbox-store','Xbox Store','ultimate','full_game','9pn8dw2wtff8','grand-theft-auto-vi-ultimate-edition'),
            ('xbox','xbox-store','Xbox Store','ultimate','upgrade','9pn4llbr8rch','grand-theft-auto-vi-ultimate-edition-upgrade')
        ), markets(market,currency,ps_locale,xbox_locale) AS (VALUES
            ('HK','HKD','zh-hant-hk','zh-HK'), ('US','USD','en-us','en-US')
        )
        SELECT sku.*, market, currency, CASE platform
            WHEN 'ps5' THEN format('https://store.playstation.com/%s/product/%s',ps_locale,store_id)
            ELSE format('https://www.xbox.com/%s/games/store/%s/%s',xbox_locale,
                CASE WHEN market='HK' THEN 'grand-theft-auto-vi' ELSE slug END,store_id) END AS url
        FROM sku CROSS JOIN markets LOOP
        INSERT INTO price_sources(source_key,name,type,source_level)
            VALUES (item.source_key,item.name,'official_page','A') ON CONFLICT(source_key) DO NOTHING;
        SELECT id INTO STRICT s FROM price_sources WHERE source_key=item.source_key AND type='official_page';
        INSERT INTO game_offer_targets(product_id,platform,market,edition,offer_type,store_product_id,store_url,expected_currency)
            VALUES (p,item.platform,item.market,item.edition,item.offer_type,item.store_id,item.url,item.currency) ON CONFLICT DO NOTHING;
        SELECT id INTO STRICT t FROM game_offer_targets WHERE product_id=p AND platform=item.platform AND market=item.market
            AND edition=item.edition AND offer_type=item.offer_type AND store_product_id=item.store_id AND store_url=item.url;
        IF NOT EXISTS (SELECT FROM game_offer_jobs WHERE target_id=t) THEN
            INSERT INTO collector_jobs(product_id,source_id,job_type,schedule,status,job_config)
                VALUES(p,s,'price_check','daily_light',
                    CASE WHEN item.market='HK' AND item.edition='standard' AND item.offer_type='full_game' THEN 'active' ELSE 'paused' END,
                    jsonb_build_object('collector_kind','pricing_page','official_web_source_key',item.source_key,
                        'country_codes',jsonb_build_array(item.market)) ||
                    CASE WHEN item.market='HK' AND item.edition='standard' AND item.offer_type='full_game' THEN '{}'::jsonb
                        ELSE '{"game_rollout_hold":true}'::jsonb END)
                RETURNING id INTO j;
            INSERT INTO game_offer_jobs(job_id,target_id) VALUES(j,t);
        END IF;
    END LOOP;
END $$;
COMMIT;

INSERT INTO directus_collections (
  collection,
  icon,
  note,
  hidden,
  singleton,
  sort
)
VALUES
  ('countries', 'public', '国家 / 地区基础表，所有价格数据都会关联这里。', false, false, 10),
  ('products', 'inventory_2', '产品管理：AI、流媒体、软件、Steam 游戏、VPN、支付工具。', false, false, 20),
  ('plans', 'view_list', '套餐管理：Plus、Pro、Standard、Family、Steam Base Game 等。', false, false, 30),
  ('region_prices', 'paid', '正式地区价格表，前台页面只读取这里已发布的数据。', false, false, 40),
  ('price_sources', 'source', '数据来源管理：官方页面、API、第三方来源、人工录入。', false, false, 50),
  ('price_observations', 'visibility', '自动采集和人工导入的价格观测记录，不直接展示到前台。', false, false, 60),
  ('source_evidence', 'fact_check', '采集证据：HTML、JSON、截图、最终 URL、hash 等。', false, false, 70),
  ('review_queue', 'rule', '异常价格和待审核数据队列。', false, false, 80),
  ('exchange_rates', 'currency_exchange', '汇率表，用于本地价格折算美元。', false, false, 90),
  ('seo_meta', 'manage_search', 'SEO 标题、描述、H1、canonical、多语言元信息。', false, false, 100),
  ('faqs', 'help', '产品 FAQ 管理，后期生成 FAQ JSON-LD。', false, false, 110),
  ('affiliate_links', 'link', 'Affiliate、VPN、支付工具、官方入口、服务推荐链接。', false, false, 120),
  ('ad_slots', 'ads_click', '广告位管理：AdSense、Ezoic、自营广告、推荐位。', false, false, 130),
  ('collector_jobs', 'schedule', '自动采集任务：AI、流媒体、Steam、汇率等。', false, false, 140),
  ('parser_rules', 'data_object', '页面解析规则和版本管理。', false, false, 150),
  ('audit_logs', 'history', '后台操作日志和数据变更记录。', false, false, 160),
  ('tracking_events', 'analytics', '统计事件配置：点击、分享、广告、Affiliate、语言切换等。', false, false, 170)
ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note,
  hidden = EXCLUDED.hidden,
  singleton = EXCLUDED.singleton,
  sort = EXCLUDED.sort;
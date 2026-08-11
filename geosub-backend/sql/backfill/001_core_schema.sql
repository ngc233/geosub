-- GeoSub backfill migration. Split from schema.sql; see migration-layout.json.

INSERT INTO countries (code, name_zh, name_en, currency, region, is_reference, sort_order)
VALUES
  ('US', '美国', 'United States', 'USD', 'North America', TRUE, 1),
  ('CA', '加拿大', 'Canada', 'CAD', 'North America', FALSE, 2),
  ('MX', '墨西哥', 'Mexico', 'MXN', 'North America', FALSE, 3),
  ('BR', '巴西', 'Brazil', 'BRL', 'South America', FALSE, 4),
  ('AR', '阿根廷', 'Argentina', 'ARS', 'South America', FALSE, 5),
  ('GB', '英国', 'United Kingdom', 'GBP', 'Europe', FALSE, 6),
  ('DE', '德国', 'Germany', 'EUR', 'Europe', FALSE, 7),
  ('FR', '法国', 'France', 'EUR', 'Europe', FALSE, 8),
  ('ES', '西班牙', 'Spain', 'EUR', 'Europe', FALSE, 9),
  ('IT', '意大利', 'Italy', 'EUR', 'Europe', FALSE, 10),
  ('NL', '荷兰', 'Netherlands', 'EUR', 'Europe', FALSE, 11),
  ('DK', '丹麦', 'Denmark', 'DKK', 'Europe', FALSE, 12),
  ('SE', '瑞典', 'Sweden', 'SEK', 'Europe', FALSE, 13),
  ('NO', '挪威', 'Norway', 'NOK', 'Europe', FALSE, 14),
  ('CH', '瑞士', 'Switzerland', 'CHF', 'Europe', FALSE, 15),
  ('TR', '土耳其', 'Turkey', 'TRY', 'Europe / Asia', FALSE, 16),
  ('JP', '日本', 'Japan', 'JPY', 'Asia', FALSE, 17),
  ('KR', '韩国', 'South Korea', 'KRW', 'Asia', FALSE, 18),
  ('CN', '中国大陆', 'China Mainland', 'CNY', 'Asia', FALSE, 19),
  ('HK', '中国香港', 'Hong Kong', 'HKD', 'Asia', FALSE, 20),
  ('TW', '中国台湾', 'Taiwan', 'TWD', 'Asia', FALSE, 21),
  ('SG', '新加坡', 'Singapore', 'SGD', 'Asia', FALSE, 22),
  ('PH', '菲律宾', 'Philippines', 'PHP', 'Asia', FALSE, 23),
  ('IN', '印度', 'India', 'INR', 'Asia', FALSE, 24),
  ('PK', '巴基斯坦', 'Pakistan', 'PKR', 'Asia', FALSE, 25),
  ('ID', '印度尼西亚', 'Indonesia', 'IDR', 'Asia', FALSE, 26),
  ('TH', '泰国', 'Thailand', 'THB', 'Asia', FALSE, 27),
  ('MY', '马来西亚', 'Malaysia', 'MYR', 'Asia', FALSE, 28),
  ('VN', '越南', 'Vietnam', 'VND', 'Asia', FALSE, 29),
  ('AU', '澳大利亚', 'Australia', 'AUD', 'Oceania', FALSE, 30),
  ('NZ', '新西兰', 'New Zealand', 'NZD', 'Oceania', FALSE, 31),
  ('EG', '埃及', 'Egypt', 'EGP', 'Africa', FALSE, 32),
  ('ZA', '南非', 'South Africa', 'ZAR', 'Africa', FALSE, 33),
  ('NG', '尼日利亚', 'Nigeria', 'NGN', 'Africa', FALSE, 34)
ON CONFLICT (code) DO NOTHING;

INSERT INTO tracking_events (event_key, event_name, description, enabled)
VALUES
  ('view_product_page', '查看产品页', '用户访问产品详情页', TRUE),
  ('select_plan', '切换套餐', '用户切换产品套餐', TRUE),
  ('click_country', '点击国家', '用户点击地图或表格中的国家', TRUE),
  ('open_share_modal', '打开分享弹窗', '用户打开价格分享图弹窗', TRUE),
  ('download_share_image', '下载分享图', '用户下载价格分享图', TRUE),
  ('click_affiliate', '点击联盟链接', '用户点击 Affiliate / 推荐链接', TRUE),
  ('click_ad', '点击广告', '用户点击广告位', TRUE),
  ('copy_link', '复制链接', '用户复制页面链接', TRUE),
  ('search_product', '搜索产品', '用户搜索产品', TRUE),
  ('language_switch', '切换语言', '用户切换站点语言', TRUE)
ON CONFLICT (event_key) DO NOTHING;

INSERT INTO ad_slots (slot_key, name, position, page_type, provider, status, priority)
VALUES
  ('product_after_map', '产品页地图下方广告', 'after_map', 'product', 'adsense', 'draft', 10),
  ('product_after_table', '产品页价格表下方广告', 'after_table', 'product', 'adsense', 'draft', 20),
  ('product_before_faq', '产品页 FAQ 上方广告', 'before_faq', 'product', 'adsense', 'draft', 30),
  ('sidebar_card', '侧边栏推荐位', 'sidebar', 'product', 'affiliate', 'draft', 40),
  ('ranking_inline', '排行榜页中部广告', 'inline', 'ranking', 'adsense', 'draft', 50)
ON CONFLICT (slot_key) DO NOTHING;

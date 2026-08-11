-- GeoSub retired manual migration. Split from sql/046_update_chatgpt_logo_to_app_store_artwork.sql; see migration-layout.json.

-- Use the current official ChatGPT App Store artwork as the product logo.
-- Source: Apple iTunes Lookup API, app id 6448311069, country US.
UPDATE products
SET logo_url = 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/22/59/ed/2259edf9-6bd5-a17a-c035-074aac0954d2/AppIcon-0-0-1x_U007epad-0-0-0-1-0-P3-85-220.png/512x512bb.jpg'
WHERE slug = 'chatgpt';

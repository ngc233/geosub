-- Prefer official website icons for product logos. App Store artwork remains a
-- fallback in the admin sync action when the website does not expose a usable icon.
-- Sources checked 2026-07-03.
UPDATE products
SET
  official_url = CASE slug
    WHEN 'grok' THEN 'https://x.ai/'
    WHEN 'manus' THEN 'https://manus.im/'
    ELSE official_url
  END,
  logo_url = CASE slug
    WHEN 'claude' THEN 'https://claude.ai/favicon.ico'
    WHEN 'gemini' THEN 'https://www.gstatic.com/lamda/images/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg'
    WHEN 'grok' THEN 'https://x.ai/favicon.ico'
    WHEN 'manus' THEN 'https://manus.im/icon.png?22b3100142bdeab9'
    ELSE logo_url
  END
WHERE slug IN ('claude', 'gemini', 'grok', 'manus');

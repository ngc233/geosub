# GeoSub 核心价格数据库设计草案

## 目标

GeoSub 的核心价值不是普通文章，而是结构化的全球数字订阅价格数据。

核心目标：

- 支持 AI 订阅、软件订阅、游戏服务、礼品卡、数字工具等产品类型
- 支持国家 / 地区 / 币种维度
- 支持套餐维度，例如 Plus、Pro、Team、Family、Annual、Monthly
- 支持价格历史快照
- 支持前台按产品、分类、国家、币种生成页面
- 支持后台录入和维护价格数据
- 支持后续 SEO 页面自动生成

---

## 第一阶段 MVP 数据模型

第一阶段不做太复杂，先做 6 张核心表：

1. categories
2. products
3. product_plans
4. countries
5. currencies
6. regional_prices

后续再加：

7. price_snapshots
8. product_sources
9. affiliate_links
10. price_alerts

---

## 1. categories 分类表

用于区分产品大类。

示例：

- AI Subscriptions
- Software Subscriptions
- Gaming & Steam
- Gift Cards
- AI Tools
- Streaming

建议字段：

- id
- slug
- locale
- name
- description
- status
- sort_order
- created_at
- updated_at

注意：

当前项目可能已经有 article_categories。产品分类不要直接混用文章分类，建议单独建 product_categories 或 subscription_categories。

---

## 2. products 产品表

用于存储具体产品。

示例：

- ChatGPT
- Claude
- Gemini
- Perplexity
- Midjourney
- Microsoft 365
- Canva
- Steam
- Apple Gift Card

建议字段：

- id
- category_id
- slug
- name
- brand
- description
- official_url
- logo_url
- status
- sort_order
- created_at
- updated_at

重点：

产品是 SEO 页面主体，例如：

- /zh/products/chatgpt/
- /en/products/chatgpt/

---

## 3. product_plans 套餐表

用于存储某个产品下的套餐。

示例：

ChatGPT：

- Free
- Plus
- Pro
- Team

Microsoft 365：

- Personal
- Family
- Business Basic
- Business Standard

建议字段：

- id
- product_id
- slug
- name
- billing_cycle
- plan_type
- description
- status
- sort_order
- created_at
- updated_at

billing_cycle 建议：

- monthly
- yearly
- one_time
- unknown

---

## 4. countries 国家 / 地区表

用于存储地区维度。

示例：

- United States
- Turkey
- India
- Japan
- Brazil
- United Kingdom
- China Hong Kong

建议字段：

- id
- code
- name
- native_name
- region
- currency_code
- status
- sort_order
- created_at
- updated_at

注意：

code 建议用 ISO 3166-1 alpha-2，例如 US、TR、IN、JP。

---

## 5. currencies 币种表

用于存储货币信息。

示例：

- USD
- TRY
- INR
- JPY
- BRL
- EUR
- GBP

建议字段：

- code
- name
- symbol
- minor_unit
- status
- created_at
- updated_at

---

## 6. regional_prices 区域价格表

这是核心表。

用于存储某个产品套餐在某个国家 / 地区的价格。

示例：

ChatGPT Plus：

- US: 20 USD / month
- India: 1999 INR / month
- Japan: 3000 JPY / month

建议字段：

- id
- product_id
- plan_id
- country_code
- currency_code
- price_amount
- price_usd
- billing_cycle
- tax_included
- source_url
- source_type
- observed_at
- status
- notes
- created_at
- updated_at

重点：

price_amount 是原币价格。
price_usd 是折算美元价格，方便做全球排序。

---

## 第一阶段后台页面建议

先做这些后台入口：

- /admin/products
- /admin/products/new
- /admin/products/[id]/edit
- /admin/prices
- /admin/prices/new
- /admin/prices/[id]/edit
- /admin/countries
- /admin/currencies

不要一开始做太多复杂图表，先保证能录入、编辑、停用、排序。

---

## 第一阶段前台页面建议

优先让这些页面读取真实数据：

- /zh/ai-pricing/
- /en/ai-pricing/
- /zh/products/chatgpt/
- /en/products/chatgpt/

第一批产品建议：

- ChatGPT
- Claude
- Gemini
- Perplexity
- Midjourney

第一批国家建议：

- US
- IN
- TR
- JP
- BR
- GB
- EU
- HK

---

## 不建议现在做的事

暂时不要做：

- 自动抓取价格
- 汇率自动更新
- 复杂价格图表
- 用户登录收藏
- 价格提醒
- 多语言全部铺开
- 广告位系统

先把人工录入的数据结构打牢。

---

## 推荐下一步

1. 读取当前 Prisma schema
2. 确认现有 enum 和命名风格
3. 设计最终 Prisma model
4. 创建 migration
5. seed 基础国家 / 币种 / AI 产品
6. 做后台产品管理页
7. 做后台价格管理页
8. 前台 AI 定价页读取真实数据
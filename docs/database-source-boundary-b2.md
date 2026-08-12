# B2 Prisma 与手写 SQL 现状差异报告

## 结论

当前数据库不是简单的“两份相同定义”，而是两个已经分叉的结构来源：

- `ai-price-site/prisma/schema.prisma` 描述 40 张业务表，适合承接应用层表结构和关系。
- `geosub-backend/sql/schema/` 单独还描述 50 张表，并承载 9 个视图、31 个业务函数和 40 个触发器。
- 双方共同描述的 34 张表在字段类型和可空性上没有差异，但存在字段、默认值、索引、外键动作和约束差异。
- 两边各自独有的表都已被运行时代码使用，不能直接删除或以任一侧覆盖另一侧。
- 生产库的 `public` schema 还包含 33 张 `directus_*` 系统表。它们属于 Directus `12.1.1` 的生命周期，不应由 Prisma 或 GeoSub 手写 SQL 重建、改名或删除。

建议采用渐进式收敛：**Prisma 负责 GeoSub 表、字段、普通唯一约束、普通索引和关系；手写 SQL 负责 GeoSub 视图、函数、触发器、检查约束、部分索引、表达式索引以及 PostgreSQL 特有能力；Directus 独立负责 `directus_*` 系统对象。** 在方案确认前，本报告不修改任何数据库结构或迁移顺序。

## 比较方法

本次审计在本机 PostgreSQL 容器中创建了两个临时空库，不读取或修改开发库、生产库数据：

1. `geosub_b2_sql_verify`：只执行 53 个手写 SQL 结构迁移，不执行回填。
2. `geosub_b2_prisma_verify`：只用当前 `schema.prisma` 执行 `prisma db push`。
3. 从 `pg_catalog` 比较表、字段、类型、可空性、默认值、索引、约束、视图、函数和触发器。

这是一份“两个结构来源分别会生成什么”的对照，不代表当前完整迁移链最终缺少这些对象。完整迁移链会依次应用两侧定义，因此也正是漂移会被暂时掩盖的原因。

## 生产基准补充（2026-08-12）

B1.1 使用已验证的生产备份恢复影子库，并把完整迁移链构建的空库与生产做了只读结构比较：

| 对象 | 生产库 | 完整空库 | 结论 |
| --- | ---: | ---: | --- |
| `public` 表 | 91 | 59 | 生产独有 33 张 Directus 表；空库独有 `event_rate_limits` |
| 视图 | 9 | 9 | 名称一致 |
| 函数 | 65 | 65 | B1.1 移除错误的 Directus 辅助函数后已一致 |
| 索引 | 315 | 224 | Directus 占主要差异，GeoSub 普通索引仍有漂移 |

完整规范化 schema diff 为 3,550 行、115,133 字节，不能视为格式噪声。除 Directus 外，生产还真实缺少以下已进入候选基线的 GeoSub 对象：

- `event_rate_limits` 表。
- `idx_article_relations_product`。
- `idx_redirects_source_path`。
- `uniq_navigation_locale_position_href_label`。
- `trg_product_source_profiles_updated_at`。

生产 Directus 容器报告版本为 `12.1.1`，但 Compose 当前写的是 `directus/directus:latest`。这会让新环境随时间拉取不同的 Directus schema，因此版本固定是可复现验收的前置决策，不是可选美化。

## 总量对照

| 对象 | 手写 SQL | Prisma | 说明 |
| --- | ---: | ---: | --- |
| 基础表 | 50 | 40 | 共同 34，SQL 独有 16，Prisma 独有 6 |
| 枚举 | 31 | 28 | SQL 独有 3 |
| 视图 | 9 | 0 | 均为 SQL 能力层 |
| 业务函数 | 31 | 0 | 已排除 `pgcrypto` 扩展函数 |
| 非内部触发器 | 40 | 0 | 37 个更新时间触发器，3 个业务触发器 |

## 仅存在于手写 SQL 的表

以下 16 张表没有对应 Prisma model：

| 领域 | 表 |
| --- | --- |
| App Store 可用性与风险 | `app_store_availability_checks`、`app_store_plan_availability_checks`、`country_app_store_risk_profiles` |
| 税务与收入 | `country_income_metrics`、`country_tax_profile_sync_runs`、`country_tax_profiles`、`plan_affordability_metrics` |
| 价格自动审核 | `price_auto_review_decisions`、`price_auto_review_runs` |
| 产品发现 | `discovery_source_checks`、`discovery_sources`、`product_discovery_candidates` |
| 运维与修复 | `data_quality_repair_cycles`、`exchange_rate_sync_runs`、`operational_recovery_cycles`、`system_task_runs` |

这些不是废弃表。例如公开价格查询和后台质量页直接读取 `country_tax_profiles`，发现流程读写 `product_discovery_candidates`，系统监控读取 `system_task_runs`，审核中心读取 `price_auto_review_runs`。它们需要纳入 Prisma 的声明式表模型，不能在收敛时删除。

## 仅存在于 Prisma 的表

以下 6 张表不在手写 SQL 结构迁移中，只由后续 Prisma migration 创建：

- `admin_login_attempts`
- `authority_coverage_tasks`
- `operations_notification_deliveries`
- `search_aliases`
- `search_conversion_repairs`
- `search_opportunities`

这些表同样正在被登录安全、权威内容覆盖、运维通知和搜索需求模块使用。它们证明新功能已经开始以 Prisma migration 为入口，但旧 SQL 基线没有同步，双轨边界尚未正式确定。

## 枚举差异

仅手写 SQL 定义以下 3 个枚举，均服务于产品发现流程：

- `discovery_candidate_source_type`
- `discovery_candidate_status`
- `discovery_source_status`

Prisma 没有独有枚举。将发现相关表纳入 Prisma 时，这 3 个枚举也需要一并建模，数据库名称保持不变。

## 共同表的字段差异

双方共同描述 34 张表。共同字段的 PostgreSQL 类型差异为 0，可空性差异为 0；字段集合仍有以下分歧。

### 仅手写 SQL 存在的字段

| 表 | 字段 |
| --- | --- |
| `audit_logs` | `actor` |
| `collector_jobs` | `discovery_candidate_id`、`discovery_source_id`、`job_config`、`priority` |
| `countries` | `iso3` |
| `exchange_rates` | `error_message`、`is_latest`、`provider_payload`、`sync_run_id` |
| `products` | `logo_file` |

### 仅 Prisma 存在的字段

| 表 | 字段 |
| --- | --- |
| `audit_logs` | `actor_id` |

`audit_logs.actor` 与 `audit_logs.actor_id` 是本次最明确的语义冲突：前者保存文本操作者，后者关联管理员账号。收敛时应先保留双字段，回填可关联记录，并定义系统任务、历史记录和已登录管理员分别写入哪个字段；不能直接重命名或删除。

## 默认值差异

对共同字段按 PostgreSQL 返回的默认值表达式精确比较，共有 99 处不同，但并非 99 个独立缺陷，主要分为三类：

1. SQL 使用 `gen_random_uuid()` 作为数据库默认值，Prisma 的 `uuid()` 通常由客户端生成，因此 Prisma 空库没有数据库默认值。
2. SQL 为 `updated_at` 设置 `now()` 并配合触发器维护；Prisma 的 `@updatedAt` 由 Prisma Client 在写入时维护。
3. `now()` 与 `CURRENT_TIMESTAMP` 属于表达不同、语义等价。

需要人工决策的明确内容冲突是 `articles.author_name`：手写 SQL 默认值为 `GeoSub Editor`，Prisma 默认值为 `GeoSub 编辑部`。建议取消数据库层的语言化作者默认值，由应用按文章语言写入；已有数据不做自动改写。

对于可能绕过 Prisma 的采集脚本、函数和运维 SQL，数据库端 UUID 与更新时间默认值仍有保护价值。收敛后可由 SQL 能力迁移补充这些默认值与更新时间触发器，但不能再在两侧各自声明不同语义。

## 索引差异

共同表按“表、列或表达式、唯一性、谓词”归一化比较：SQL 有 78 个索引，Prisma 有 65 个；21 个只在 SQL，8 个只在 Prisma。

### SQL 独有且应继续保留的 PostgreSQL 特有索引

- `articles(locale, status, published_at DESC) WHERE deleted_at IS NULL`
- `collector_job_runs(started_at DESC) WHERE status = 'running'`
- `collector_job_runs(job_id) WHERE status = 'running'` 唯一索引
- `collector_jobs` 的运行队列、候选来源、覆盖刷新、异常观察部分索引
- `collector_jobs USING GIN(job_config)`
- `exchange_rates(base_currency, quote_currency, source) WHERE is_latest`
- `region_prices(product_id, last_checked_at) WHERE status = 'published' AND platform = 'ios' AND price_usd IS NOT NULL`
- `seo_meta(product_id, coalesce(plan_id, zero_uuid), locale)` 表达式唯一索引

这些索引使用谓词、表达式或 GIN，不能完整地由 Prisma schema 表达，应明确归 SQL 能力层所有。

### SQL 独有但需去重或纳入 Prisma 的普通索引

- `article_relations(product_id)`
- `collector_jobs(product_id, status, next_run_at)`
- `exchange_rates(base_currency, quote_currency, rate_date DESC)`
- `media_assets(uploaded_by_id)`
- `navigation_items(locale, position, href, label)` 唯一索引
- `redirects(source_path)`
- `seo_meta(category_id)`、`seo_meta(locale)`
- `tracking_events(event_key)`

`ad_slots(slot_key)` 的 SQL 非唯一索引与同列唯一约束重复，未来可在确认查询计划后移除，但本批次不处理。

### Prisma 独有索引

- `audit_logs(target_type, target_id)`
- `countries(code)`
- `event_logs(anonymous_id, created_at)`
- `event_logs(session_id, created_at)`
- `region_prices(product_id)`
- `seo_meta(locale, status)`
- `seo_meta(product_id)`
- `source_evidence(observation_id)`

其中 `countries(code)` 等索引可能与唯一约束生成的索引重复，不能只根据名称判定缺失。实施阶段应结合约束和 `EXPLAIN` 再决定保留哪一个。

## 约束与关系差异

约束文本的大量差异来自 Prisma 外键默认生成 `ON UPDATE CASCADE`，而手写 SQL 省略该动作并使用 PostgreSQL 默认的 `NO ACTION`。删除动作总体一致，不应把这些文本差异误判为整条外键缺失。

真正需要保留在 SQL 能力层的检查约束包括：

- 采集任务类型、状态、运行状态和 `priority` 范围。
- 汇率同步状态。
- 解析规则状态。
- 价格观测、价格源和正式地区价格的可信度范围。
- 事件限流计数不得为负数。

Prisma 独有的实际关系是 `audit_logs.actor_id -> admin_users.id`。它应与旧 `actor` 文本字段的兼容策略一起处理。

## SQL 能力层清单

### 视图

9 个视图均应继续由 SQL 管理：

- `app_store_availability_latest_view`
- `latest_country_income_metrics`
- `latest_exchange_rates`
- `latest_plan_affordability_metrics`
- `pending_price_observations_view`
- `plan_affordability_detail_view`
- `plan_affordability_summary_view`
- `price_observation_evidence_view`
- `price_observations_review_history_view`

### 函数

31 个业务函数覆盖以下能力：

- 价格观测通过、忽略、拒绝和自动审核。
- App Store 异常隔离、稳定样本审核、覆盖缺口与过期价格重采。
- 汇率查询与写入、税务档案推断与写入、购买力指标刷新。
- 采集运行回收、失败任务恢复、数据质量和运维修复周期。
- 已发布产品 SEO 元数据补全和公开价格产品状态提升。
- Directus 标签辅助和通用更新时间维护。

代表性函数包括 `upsert_exchange_rate`、`run_price_auto_review`、`run_app_store_stability_auto_review`、`refresh_plan_affordability_metrics`、`run_data_quality_repair_cycle`。这些逻辑不适合机械迁入 Prisma Client。

### 触发器

- 37 个触发器维护 `updated_at`，保护 Prisma 之外的写入路径。
- `products.trg_products_ensure_published_seo` 在产品发布或关键信息变化后补齐 SEO 元数据。
- `region_prices.archive_superseded_app_store_ambiguities_trigger` 归档已被新价格取代的歧义。
- `region_prices.promote_public_product_from_region_price_trigger` 根据正式价格推动产品公开状态。

## 推荐收敛方案

### 目标边界

| 能力 | 唯一所有者 |
| --- | --- |
| 表、字段、枚举、普通关系 | Prisma schema + Prisma migrations |
| 普通唯一约束与普通索引 | Prisma schema + Prisma migrations |
| 视图、函数、触发器 | 手写 SQL |
| CHECK 约束、部分索引、表达式索引、GIN 等 PostgreSQL 特性 | 手写 SQL，但必须引用 Prisma 已建立的表 |
| 数据回填与修复 | 独立 backfill，继续使用 B1 的显式开关 |
| `directus_*` 表、字段、索引、关系与元数据 | 固定版本的 Directus；GeoSub 迁移只读核验，不接管其生命周期 |

### 分阶段实施

1. **固定外部所有者**：先把 Directus 镜像从 `latest` 固定到已验证的 `12.1.1`；不修改 Directus 表，只消除新环境不可复现风险。
2. **冻结漂移**：从确认日开始，新表和普通字段不再同时修改两侧；CI 检查新增 SQL 中是否出现未经豁免的 `CREATE TABLE` 或普通 `ADD COLUMN`。
3. **补全 Prisma 描述**：先把 16 张 SQL 独有表、3 个枚举和 11 个仍在使用的字段加入 Prisma，全部使用现有数据库名映射，不删除任何对象。
4. **解决真实冲突**：单独迁移 `audit_logs.actor/actor_id`，统一文章作者默认值，确认 UUID 与更新时间由数据库保护的范围。
5. **核对索引与约束**：普通索引归 Prisma；部分、表达式、GIN 和 CHECK 约束保留 SQL。先去重后再调整，不以索引名称直接判断。
6. **设立切换点**：历史 SQL 表迁移保持不可变，作为旧版本建库历史；切换点之后的新表结构只进入 Prisma migration。SQL 能力迁移在相关 Prisma migration 之后执行。
7. **重做空库验收顺序**：在隔离空库中验证“固定版本 Directus 初始化 -> 历史基线 -> Prisma 结构迁移 -> SQL 能力迁移 -> 可选回填”，并分别比较 Directus 所有对象和 GeoSub 所有对象。
8. **增加 CI 门禁**：每次数据库变更创建两个临时空库，执行完整迁移后检查 Prisma drift、SQL 能力对象存在性、重复索引、未分类表 DDL 和 Directus 版本漂移。

### 为什么不建议一次性改造

- 两侧独有表都被实际功能使用，直接覆盖会造成运行时缺表。
- 采集脚本和数据库函数会绕过 Prisma，直接移除数据库默认值或更新时间触发器会降低数据一致性。
- 历史 Prisma migrations 当前依赖手写 SQL 建立的早期表，直接调换顺序会破坏空库建库。
- `audit_logs` 存在真实数据模型冲突，需要先观察和回填，不能用自动 diff 决定。

## 待确认决策

建议确认以下边界后再进入实施批次：

1. 接受 Prisma 作为切换点之后表结构的唯一来源。
2. 接受 SQL 继续管理视图、函数、触发器、CHECK、部分索引、表达式索引和 GIN。
3. 接受历史迁移只冻结、不删除、不重写。
4. 接受 `audit_logs.actor` 与 `actor_id` 先并存并回填，而不是直接删旧字段。
5. 接受按“补描述、解冲突、切入口、加门禁”四个小提交实施，不做一次性大迁移。
6. 接受 Directus 作为 `directus_*` 对象的第三方所有者，并将生产验证版本固定为 `12.1.1`。
7. 接受把生产缺少的 5 个 GeoSub 对象作为显式、可回滚的生产迁移处理，不用兼容判断继续掩盖差异。

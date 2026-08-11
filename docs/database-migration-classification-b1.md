# GeoSub B1 SQL 迁移分类清单

状态：待人工确认，尚未移动或修改任何 SQL 文件。

审阅日期：2026-08-11

## 结论

任务书记录的“`geosub-backend/sql/` 下 103 个文件”与当前仓库不一致。当前实际情况是：

- `geosub-backend/sql/`：76 个 SQL。
- `geosub-backend/` 根目录：14 个 SQL。
- 手写 SQL 合计：90 个。
- `ai-price-site/prisma/migrations/`：14 个 Prisma 迁移目录。
- 手写 SQL 与 Prisma 迁移合计：104 个迁移单元。

本清单逐个覆盖全部 90 个手写 SQL，无遗漏、无重复。建议分类如下：

| 分类 | 数量 | 含义 |
| --- | ---: | --- |
| Schema，可直接移动 | 32 | 只定义表、字段、索引、视图、函数或触发器；函数体内的 DML 不会在迁移时立即执行。 |
| Backfill，可直接移动 | 26 | 只写入、更新或清理既有数据，不负责建立数据库结构。 |
| Hybrid，必须先拆分 | 21 | 同一文件同时包含结构变更和立即执行的数据修复，不能原样放入任一目录。 |
| Retired / manual | 11 | 已由后续迁移替代，或只允许人工执行，不应进入自动初始化。 |

若确认此分类，拆分后预计得到 53 个有效 schema 单元和 47 个有效 backfill 单元；11 个退休文件只保留历史记录。

## 分类原则

1. 新空库默认只执行结构定义，不写产品、价格、导航、SEO、税务、风险或 Directus 运营数据。
2. `CREATE FUNCTION` 中的 `INSERT`、`UPDATE`、`DELETE` 属于函数定义，不算迁移时立即执行的数据修复。
3. 文件末尾主动调用函数的 `SELECT refresh_*()`、`SELECT quarantine_*()` 属于 backfill，必须与函数定义拆开。
4. 国家、税务、风险规则等参考数据即使对业务重要，本质仍是数据，应由可审计的 backfill/bootstrap 流程加载。
5. 已进入 `geosub_schema_migrations.filename` 的旧路径不能直接失效；实施时必须保留旧路径到新迁移 ID 的兼容映射。

## 1. Schema：可直接移动（32）

| 当前文件 | 依据 |
| --- | --- |
| `content-system-tables.sql` | 内容系统表、索引、函数和触发器。 |
| `sql/003_affordability_views.sql` | 购买力视图。 |
| `sql/004_affordability_source_metadata_fix.sql` | 当前有效的购买力来源视图。 |
| `sql/008_price_observations_view_v4.sql` | 当前有效的价格观测视图。 |
| `sql/009_price_observation_review_functions.sql` | 审核函数定义；DML 只在函数调用时执行。 |
| `sql/010_refresh_affordability_function.sql` | 购买力刷新函数定义。 |
| `sql/011_price_observations_history_view.sql` | 历史视图。 |
| `sql/012_exchange_rate_sync_system.sql` | 汇率同步表、字段、触发器、函数与视图。 |
| `sql/013_price_auto_review_rules.sql` | 自动审核结构和函数定义。 |
| `sql/016_discovery_source_checks.sql` | 发现源检查表结构。 |
| `sql/017_discovery_change_classification.sql` | 发现变化字段和索引。 |
| `sql/018_discovery_feed_trigger_fields.sql` | Feed 触发字段和索引。 |
| `sql/020_discovery_collection_handoff.sql` | 发现到采集的交接字段和索引。 |
| `sql/021_collector_job_runs.sql` | 采集运行记录表和索引。 |
| `sql/022_discovery_manual_scan_queue.sql` | 人工扫描队列字段和索引。 |
| `sql/023_app_store_stability_auto_review.sql` | App Store 稳定性审核函数定义。 |
| `sql/024_app_store_availability_status.sql` | 可用性状态表、视图和触发器。 |
| `sql/033_app_store_stability_auto_review_v2.sql` | 当前有效的 V2 自动审核函数。 |
| `sql/034_affordability_metric_precision.sql` | 精度字段和购买力视图调整。 |
| `sql/035_country_tax_profile_sync_system.sql` | 税务同步结构和 upsert 函数。 |
| `sql/037_inferred_app_store_tax_profiles.sql` | 推断税务资料函数定义，未主动调用。 |
| `sql/042_price_observation_evidence_view.sql` | 价格证据视图。 |
| `sql/045_article_soft_delete_trash.sql` | 文章软删除字段和索引。 |
| `sql/052_collector_job_runs_running_status.sql` | 采集运行状态枚举调整。 |
| `sql/053_admin_collection_performance.sql` | 后台采集性能索引。 |
| `sql/054_refresh_affordability_app_store_scope.sql` | App Store 口径购买力刷新函数定义。 |
| `sql/059_stale_app_store_price_lifecycle.sql` | 过期价格索引和生命周期函数定义。 |
| `sql/062_app_store_coverage_gap_rechecks.sql` | 覆盖缺口索引和重采函数定义。 |
| `sql/063_system_task_runs.sql` | 系统任务运行表和索引。 |
| `sql/068_plan_region_availability.sql` | 套餐地区可用性表、函数和触发器。 |
| `sql/075_serialize_app_store_auto_review.sql` | 自动审核串行化函数及旧签名清理。 |
| `sql/076_event_rate_limits.sql` | 事件限流表和索引。 |

## 2. Backfill：可直接移动（26）

| 当前文件 | 依据 |
| --- | --- |
| `directus-polish.sql` | Directus 关系和字段展示配置。 |
| `directus-zh.sql` | Directus 中文标签更新。 |
| `fix_nav_categories_utf8.sql` | 导航和分类数据清理、重建。 |
| `publish_en_navigation.sql` | 英文导航发布状态更新。 |
| `publish_footer_trust_pages.sql` | 页脚信任页面发布状态更新。 |
| `register-directus.sql` | Directus collection 元数据注册。 |
| `seed_en_navigation_draft.sql` | 英文导航草稿数据。 |
| `seed_footer_navigation_zh.sql` | 中文页脚导航数据。 |
| `seed-chatgpt.sql` | ChatGPT 产品、套餐、地区价格、SEO、FAQ 和联盟数据。 |
| `sql/002_compute_plan_affordability.sql` | 生成购买力快照数据。 |
| `sql/025_archive_non_subscription_plans.sql` | 归档非订阅套餐。 |
| `sql/026_clear_legacy_multisource_review_notes.sql` | 清理旧多来源审核说明。 |
| `sql/027_archive_capacity_only_app_store_items.sql` | 归档容量类误识别项目。 |
| `sql/031_app_store_country_coverage.sql` | App Store 国家覆盖参考数据。 |
| `sql/036_product_plan_specs_seed.sql` | 更新既有产品的套餐规格。 |
| `sql/038_common_app_store_tax_profiles.sql` | 调用 upsert 函数写入常见国家税务资料。 |
| `sql/039_relax_claude_max_app_store_range.sql` | 调整 Claude Max 既有套餐范围。 |
| `sql/040_gemini_app_store_collector.sql` | 写入 Gemini 采集任务和规则。 |
| `sql/041_merge_gemini_advanced_into_pro.sql` | 合并既有 Gemini 套餐数据。 |
| `sql/058_normalize_disney_app_store_plans.sql` | 规范 Disney+ 套餐和观测数据。 |
| `sql/060_reclassify_app_store_selection_false_positives.sql` | 重分类既有误判观测。 |
| `sql/061_ignore_legacy_non_primary_app_store_tiers.sql` | 忽略旧非主套餐观测。 |
| `sql/069_required_catalog_products.sql` | 写入必需产品、套餐和采集任务。 |
| `sql/070_disney_app_store_source.sql` | 写入 Disney+ App Store 来源并关联任务。 |
| `sql/072_normalize_hbo_max_app_store_plans.sql` | 规范 HBO Max 套餐和观测数据。 |
| `sql/074_repair_hbo_max_app_store_selection.sql` | 修复 HBO Max 既有观测选择结果。 |

## 3. Hybrid：必须先拆分（21）

| 当前文件 | Schema 部分 | Backfill 部分 |
| --- | --- | --- |
| `schema.sql` | 类型、表、索引、函数、视图、触发器。 | 国家、统计事件和广告位初始数据。 |
| `content-system-directus.sql` | Directus 辅助函数和索引。 | Directus 元数据、分类、设置、导航数据。 |
| `directus-cn-v2.sql` | Directus 标签辅助函数。 | Directus collection/field 中文配置。 |
| `sql/001_affordability_income_tables.sql` | 购买力字段、表、索引、视图、函数、触发器。 | 根据现有国家代码回填 `iso3_code`。 |
| `sql/014_product_discovery_candidates.sql` | 发现候选类型、表、索引和触发器。 | DeepSeek 初始候选数据。 |
| `sql/015_discovery_sources.sql` | 发现源类型、表、索引和触发器。 | DeepSeek 与 Product Hunt 初始来源。 |
| `sql/019_discovery_source_strategy.sql` | 来源策略字段和索引。 | 更新既有来源的策略与配置。 |
| `sql/028_country_tax_profiles.sql` | 国家税务表、索引和触发器。 | 14 个国家的初始税务资料。 |
| `sql/029_country_app_store_risk_profiles.sql` | App Store 风险表、索引和触发器。 | 15 个国家的初始风险资料。 |
| `sql/030_country_app_store_risk_model.sql` | 风险模型字段。 | V2 风险评分和说明数据。 |
| `sql/032_country_tax_profile_v2.sql` | V2 税务字段和约束。 | 旧税务资料回填及默认状态修复。 |
| `sql/043_app_store_collection_schedule_policy.sql` | 异常重采函数。 | 重排既有采集任务并补建任务。 |
| `sql/055_refresh_matching_app_store_prices.sql` | 价格刷新函数定义。 | 文件末尾立即调用函数刷新既有价格。 |
| `sql/056_refresh_exact_local_app_store_prices.sql` | 精确本地价格刷新函数定义。 | 文件末尾立即调用函数刷新既有价格。 |
| `sql/057_quarantine_published_app_store_price_outliers.sql` | 异常隔离函数定义。 | 文件末尾立即隔离旧价格并刷新购买力。 |
| `sql/064_data_quality_repair_cycles.sql` | 修复周期表和函数。 | 修正既有采集任务的重复激活状态。 |
| `sql/065_operational_self_healing.sql` | 自愈周期表和函数。 | 修复既有重复运行记录。 |
| `sql/066_public_product_lifecycle.sql` | 产品生命周期函数和触发器。 | 对既有套餐、产品执行状态对齐。 |
| `sql/067_app_store_availability_semantics.sql` | 可用性检查字段和约束。 | 将旧 `available=false` 记录改为新语义。 |
| `sql/071_archive_superseded_app_store_ambiguities.sql` | 归档函数和触发器。 | 文件末尾立即归档既有歧义记录。 |
| `sql/073_product_seo_content_quality.sql` | SEO 保底函数、索引和触发器。 | 去重并补齐既有产品、套餐和 SEO 文案。 |

## 4. Retired / manual：不进入自动初始化（11）

| 当前文件 | 处理建议 |
| --- | --- |
| `cleanup-duplicates.sql` | 人工修复脚本；保留在 `backfill/retired/`，禁止自动执行。 |
| `sql/004_affordability_source_metadata.sql` | 已由 `004_affordability_source_metadata_fix.sql` 替代。 |
| `sql/006_price_observation_tables.sql` | 已由当前 `schema.sql` 观测模型替代。 |
| `sql/007_fix_pending_price_observations_view.sql` | 已由当前 V4 视图替代。 |
| `sql/007_fix_pending_price_observations_view_v3.sql` | 已由 `008_price_observations_view_v4.sql` 替代。 |
| `sql/044_public_navigation_launch_scope.sql` | 旧上线阶段内容迁移，只保留历史。 |
| `sql/046_update_chatgpt_logo_to_app_store_artwork.sql` | 已由持久化官方 Logo 同步替代。 |
| `sql/047_sync_official_app_store_logos.sql` | 已由持久化官方 Logo 同步替代。 |
| `sql/048_fix_chatgpt_plus_korea_app_store_outlier.sql` | 已由通用异常隔离和自动审核替代。 |
| `sql/049_quarantine_app_store_anomaly_promotions.sql` | 已由当前发布价格异常隔离规则替代。 |
| `sql/050_cleanup_app_store_plan_matching_artifacts.sql` | 已由当前套餐匹配和旧层级清理规则替代。 |

## 编号与执行顺序建议

确认分类后再实施以下动作：

1. 以当前 `migration-manifest.cjs` 的实际执行顺序为唯一排序依据，不再依赖文件名字典序。
2. Schema 迁移重新编号为 `sql/schema/001_...` 起的连续唯一编号。
3. Backfill 迁移独立编号为 `sql/backfill/001_...` 起的连续唯一编号，并写入独立历史表 `geosub_backfill_migrations`。
4. Hybrid 文件拆成同一语义名称的 schema/backfill 两部分；结构部分保留原执行位置，数据部分保留原始来源和旧文件名映射。
5. 退休文件放入 `sql/backfill/retired/`，清单中明确 `automatic=false`，不参与任何自动模式。
6. 已上线数据库通过“旧 filename + checksum 到新 migration ID”的兼容映射继续识别，禁止把已执行迁移当成未执行而重放。

## 实施前必须确认的四项决策

1. **分类范围**：按当前真实的 90 个手写 SQL 处理，而不是按任务书中的旧数字 103。
2. **空库边界**：默认空库初始化不写任何产品、导航、税务、风险和 Directus 数据，只建结构。
3. **参考数据入口**：国家、税务、风险和必需产品数据由显式 bootstrap/backfill 命令加载，不混入 `db:migrate`。
4. **退休文件位置**：保留在 `sql/backfill/retired/` 供审计，不删除历史文件。

确认前不应移动文件、改编号、改 checksum 或改生产迁移记录。

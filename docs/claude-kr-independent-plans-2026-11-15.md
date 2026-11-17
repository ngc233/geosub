# Claude KR 独立新套餐：L2 本地候选

## 任务与授权

类型 Feature，风险 L2。2026-11-15 产品负责人批准在独立工作树实现七文件候选、完成离线回归并提供 Gemini 审计包。基线 `78cd6cb1f8aea90071a2cb5e458d810571a2a4ac`；先复制原隔离候选，再扩展新套餐，保留原 `fix/claude-kr-pending-identity-20261114` 工作树和四文件审计证据。Gemini 承接本次独立审计，不修改仓库通用角色规范。

同日产品负责人追加批准第八个文件 `ai-price-site/app/admin/review/price-review-rules.test.mts`：仅补 `claude/max`、`claude/ultra` 的显式测试名单，要求两档保持 `review_only` 且价格区间未填写，不改生产审核规则。原七文件候选及审计包保留作为历史证据，本轮更新文档和交付回执。

生产建档、调度与生命周期处理均留待独立 L3 审批。禁止提交、推送、PR、联系官方、真实采集、实际价格复核、回填和部署。2.33.0 继续暂停。

## 决策与验收

|公开名称|独立 slug / 名称|本地规范|
|---|---|---|
|Claude Max - Monthly|max / Claude Max|monthly，review_only，KR，App 6473753684|
|Claude Ultra - Monthly|ultra / Claude Ultra|monthly，review_only，KR，App 6473753684|

两个新套餐均不填写无证据的 USD 区间。保留 `pro`、`max-5x`、`max-20x` 的定义、slug、状态和历史记录。独立建档是产品分类决策，不证明新旧 Apple SKU/productId 相同、官方更名、权益迁移或实际 StoreKit 订阅周期。

套餐级 `exact_plan_aliases` 只比较完整归一化名称，不注入 slug/name 别名、不移除品牌；保留已有产品级精确模式及旧套餐匹配行为。套餐级 `app_store_id`、`country_codes` 在候选入口、套餐可用性记录及独立绑定时检查，其他地区不得给这两个 KR 套餐记录缺失。年付、周付、消耗品、后缀、缺品牌及重复品牌名称不得匹配新套餐。

`Get-AppStorePendingPlanIdentity` 仅在两个名称具有唯一、准确、KR/App 范围内的独立月付待审登记时解除临时截停。规范缺失、重复或错误时继续输出 `pending_confirmation`；错误 app/其他地区不生成新套餐观测。

`Ensure-Plan` 对套餐级精确模式使用只读查询，要求数据库已存在唯一的独立 `review` 记录，校验 product_id、slug、名称、周期、排序、状态和缓存 ID。缺失、旧 ID、同名异 slug、重复匹配或其他冲突均停止，不走按名称复用、自动建档或状态更新路径。因此生产启用前必须先完成 L3 独立建档及冲突审查。

有效新候选仍由原选择/异常/观测链处理：重复价格按套餐选择一次，多价格歧义保留；`review_only` 必须产生异常待审观测，`Insert-Observation` 保持 `pending`，不写正式价格、不更新正式核验日期。独立绑定查询与后续入库非单一事务，真实并发和持久化行为仍须 L3 验证。

## 隔离口径与状态

- `pending_confirmation`：未满足独立登记条件的诊断，不是 `price_observations` 记录，也不是发布状态。
- `review_only`：内部套餐治理标记；正确独立绑定后可形成新 ID 的 pending 异常观测，不能据此自动发布。
- `pending_identity_item_count` 与 `ignoredItemCount` 重叠，不能相加作为互斥总数。
- 页面 `RawPayload.items`、同批旧套餐 `RawSnapshot.inAppPurchases` 仍包含页面完整原文列表。隔离保证针对价格候选/套餐绑定/观测目标，不宣称新名称在全链路存储中零出现。
- 全批次 `complete` 仅说明采集器原有完成语义，不能解释为身份确认或发布就绪。

## 八文件范围与保护规则

1. `geosub-backend/data/product-plan-specs.json`
2. `geosub-backend/scripts/collect-app-store-prices.ps1`
3. `geosub-backend/tests/claude-kr-pending-identity.ps1`
4. `geosub-backend/scripts/claude-kr-pending-identity.test.mjs`
5. `geosub-backend/scripts/collector-reliability.test.mjs`（继承隔离候选的测试入口）
6. `ai-price-site/lib/country-page-readiness.test.mts`（只加测试）
7. 本文件。
8. `ai-price-site/app/admin/review/price-review-rules.test.mts`（获追加批准的显式名单和断言）

规范 JSON 在 `.github/protected-files.json` 的 `codeownersOnly` 范围，非 `isolate`；本候选不修改任何 isolate 文件。旧套餐对象与所有其他产品规范应与基线一致。门禁源码、试点配置、审核门槛、SQL、调度、版本、依赖及部署文件均不改。

## 门禁与 L3 前置事项

11 月 15 日历史门禁（不是此次实时查询）：38 产品套餐规范通过、36 产品价格质量通过且无 warning；国家 strict 退出 2，Claude KR 因旧两档超过 14 天阻断。新套餐 review_only 不进入正式国家页价格查询；即使未来两档新价格已发布且新鲜，也不能抵消旧档超期。

本次不把旧套餐标为停售/归档。韩国名称变化不足以证明全球停售。单纯隐藏旧价也会破坏 Claude KR 试点现有 `max-5x` 价格事件，触发 `event.current_price_or_source_mismatch`。未来 L3 必须一起审查地区生命周期证据、历史保留、旧价治理、试点事件和重新完整门禁，不能为发布而过滤数据、改门槛或补核验日期。

L3 还须核查：

- 生产唯一独立 ID/名称冲突、幂等建档、备份与回退；`check-product-plan-specs.cjs` 要求 review_only 套餐也实际存在，不能只部署 JSON。
- 覆盖补采调度把非 archived 套餐计入活动计划，review/draft 也可能跨默认国家产生任务；KR 候选过滤不等于调度范围限制。此次不改调度，也不批准排队。
- Apple 新旧 SKU/productId 一一对应、StoreKit 月付周期、权益及迁移关系仍未验证；不得据此归并历史或声称官方更名。
- 实际服务器组件版本、权限、真实 SQL 执行、并发绑定/入库、审核到正式价格持久化链路均未验证。
- 发布恢复须重新通过完整生产只读数据门禁并获产品负责人明确批准。

## 离线验证与交付

新 PowerShell 用例通过 AST 读取真实函数及 item/selection/write 三个循环，网络与命令调用设阻断替身，SQL/观测传输仅在内存记录。覆盖未登记/错误登记、精确命名、旧档兼容、App/地区边界、混合五档独立 ID、重复/多价、缺失及冲突记录、实际 pending INSERT 生成、诊断序列化。合成金额和 ID 不构成商店证据。

先保存缺少新套餐登记的红灯输出，再运行定向测试、完整 `collector-reliability.test.mjs`、`software-plan-identity.ps1`、`chatgpt-plan-identity.ps1`、语法与 diff 检查，以及前端测试/类型/Lint/构建。国家页两项新增用例证明旧档逐条新鲜度和旧事件绑定仍会阻断。完整命令、环境边界、exit code、stdout/stderr、跳过项和环境限制以审计包测试回执为准；不把离线替身测试写成生产验收。

本地回退：保留原隔离候选，拒绝或放弃本独立工作树候选即可；当前没有生产变更需要回滚。未来任何生产回退须在 L3 另行设计，不能以本说明授权。

## 第八文件修订与离线验收

原七文件候选的全量前端测试有一项失败：既有 `review_only` 显式例外名单缺少两档新套餐。追加批准后，仅将 `claude/max`、`claude/ultra` 加入“必须 review_only”和“允许无价格区间”的两个显式名单，保留 `expected_monthly_usd_min/max === undefined` 断言。没有删断言、跳过测试或修改生产审核代码。原失败输出和未应用提案保留在历史材料中；r2 包中的第八文件补丁已应用。

本轮已重跑采集器完整聚合 87 项，86 通过、1 个 Linux 专属用例在 macOS 自动跳过；前端完整 1190 项，1189 通过、0 失败、1 个未配置隔离 PostgreSQL 的用例跳过。国家门禁 7/7、软件身份 14 例、ChatGPT 身份 14 例及 Claude 兼容、Lint、PowerShell/Node 语法、Webpack 离线构建均通过。首次类型检查与构建重建 `.next/types` 并行，出现 TS6053 生成文件缺失；构建结束后按顺序重跑类型检查通过，失败及通过回执均保留。最终命令与完整输出见 r2 审计包。

构建继续采用已安装 Next 文档支持的 `npm run build -- --webpack`；前轮默认 Turbopack 在 compile 阶段约 302 秒无进展、主动结束的回执仍保留，本轮未重新尝试默认构建器。构建无真实数据库，使用本地端口 1 占位地址并产生预期读取失败/既有降级日志，只验证编译和构建，不验证页面数据或生产发布。未更改构建配置、门槛或环境文件。Linux、真实数据库、SKU 身份、生产持久化和发布门禁仍属于未验证项，不能将离线回归通过当成生产验收或恢复发布授权。

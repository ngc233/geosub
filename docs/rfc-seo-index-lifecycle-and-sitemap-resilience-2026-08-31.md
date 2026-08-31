# RFC：SEO 页面生命周期与 Sitemap 韧性

状态：已批准生产部署、additive observe-only migration 与 Sitemap LKG；生产 robots 行为变更仍未获批准

日期：2026-08-31

工作类型：Architecture / L3

代码基线：`d88ddc198bf29c24ebb6eef50ca328587e5db62d`

## 1. 问题

GeoSub 当前把页面运行时质量评分直接用于 robots 与 sitemap 决策，同时缺少“某个 URL 在某一时刻最终输出了什么”的持久化历史。数据库瞬时失败又会令动态 sitemap 直接返回 5xx；旧政策虽然避免了残缺静态 sitemap，却没有完整动态快照恢复点。

本次审计还确认两项独立缺陷：

- sitemap 的 `latestDate()` 以请求时间作为 reduce 初始最大值，令真实更新时间无法胜出，导致未变化 URL 的 `lastmod` 随请求漂移。
- 采集任务启动时会失效公开缓存，但进程成功提交数据后没有第二次失效；中间请求可能重新缓存旧的价格 freshness、quality score、metadata 与 sitemap eligibility。

以上行为部分是正式政策和测试保护的结果，不能把更换 robots 生命周期当作普通 bug fix。整改必须先修改政策与政策测试，再实现并验证。

## 2. 决策

按以下顺序实施：

1. 修复 `lastmod` 的确定性计算。
2. 保留采集启动失效，并在采集进程成功退出后再次失效产品、套餐、列表、导航与 sitemap。
3. 为生产 sitemap 增加经过验证的 Last Known Good（LKG）政策例外；除此之外继续 fail-closed。
4. 增加页面级 SEO 生命周期与状态历史的 additive 数据基础，第一阶段只记录和审计，不参与 robots、canonical 或 sitemap 决策。
5. 两项活动实验完成 settled-data 结算并另行批准前，不改变现有生产 robots 生命周期。

## 3. 范围与不变项

### 3.1 本阶段允许

- `lastmod` 稳定性修复和行为测试。
- collector 成功后的第二次应用缓存及路径失效。
- LKG policy、持久化格式、验证器、恢复逻辑、日志和本地测试。
- 页面状态与历史表的 additive Prisma migration。
- observe-only 记录接口、页面身份规范与活动实验锁登记。

### 3.2 本阶段禁止

- 不把持久化 indexing decision 接入生产 robots、canonical 或 sitemap eligibility。
- 不修改 URL、canonical、hreflang、H1、核心正文、内链结构、设计 token 或页面布局。
- 不自动解冻实验，不提交 IndexNow/GSC/Bing，不部署生产，不应用生产 migration。
- 不把不完整静态路由列表作为 LKG。
- 不把内容版本时间与价格、汇率、税费、收入或套餐复核时间合并。

## 4. Sitemap LKG 政策例外

### 4.1 快照内容

每份快照必须保存：

```text
schemaVersion
policyVersion
generatedAt
urlCount
siteOrigin
entries
contentHash = SHA-256(canonical payload)
```

`entries` 是一次完整、动态生成且已通过校验的 sitemap。schema V1 只保存当前正式使用的 `url / lastModified / changeFrequency / priority`；出现未支持字段时拒绝快照，避免静默丢失未来的 sitemap 语义。

### 4.2 写入

- 仅对完整的新鲜结果创建快照。
- 使用同目录临时文件后 rename，避免把半写文件当成恢复点。
- 路径由 `GEOSUB_SITEMAP_LKG_PATH` 配置，必须是绝对路径，生产建议放在 release 目录之外的持久化位置。
- 新鲜 sitemap 已有效但快照写入失败时，仍返回新鲜结果并记录错误；不得因恢复点写失败而把有效实时结果变成 5xx。

### 4.3 读取与失败关闭

实时生成失败时，只有同时通过以下门禁才可返回 LKG：

- `schemaVersion` 与 `policyVersion` 精确兼容；
- `siteOrigin` 与当前站点一致；
- `contentHash` 与规范化 payload 一致；
- `generatedAt` 不在未来且不超过 24 小时；
- `urlCount` 与 entries 一致、非空且不超过统一预算；
- URL 唯一、无 query/fragment、均属于当前主动索引的 `zh/en`；
- 存在 `/zh/ai-pricing/chatgpt`、`/en/ai-pricing/chatgpt`、`/zh/streaming-pricing/netflix` 三个动态哨兵；
- 每条 URL、日期、频率与优先级格式合法。

任一门禁失败、快照不存在或未配置路径时继续抛错。返回 LKG 必须记录明确的 degraded 日志。

## 5. `lastmod` 与缓存失效

`lastmod` 从所有有效业务候选日期中取最大值。请求时间不能参与最大值比较；只有完全没有有效候选日期时，调用方才可传入明确 fallback。底层数据未变化时，连续请求同一 URL 的 `lastmod` 必须稳定。

采集失效分为两次：

1. 排队/启动后：保留现有 tag/path 失效，避免任务状态和旧页面长期不刷新。
2. collector 进程以成功状态退出后：通过同 Web 进程的 loopback 内部 Route Handler 重新读取产品与套餐身份，使用仅进程内持有的随机令牌鉴权，再失效公开价格 tag，并 revalidate 产品概览、全部套餐路径、列表、后台运营路径与 `/sitemap.xml`。这样避免在已离开 Server Action 上下文的异步回调中非法调用 `updateTag()`。

失败退出只记录失败，不执行“成功提交后”失效。若成功后的失效本身失败，记录带 job ID 的错误并由既有 TTL 作为最后恢复边界。

## 6. 页面级 SEO 状态

状态主体是 SEO 页面实体，不是 Product。页面身份至少包含：

```text
locale
page_type
canonical_path
product_id / product_slug nullable
plan_id / plan_slug nullable
```

第一版数据层使用中性字段：

```text
eligibility_state
indexing_decision
decision_source
effective_at
reason
policy_version
```

这些字段不写死 `candidate / approved / retired` 等完整业务状态机；未来可在获得真实治理证据后增加 `suspended / legacy / manual_hold` 或等价状态。`canonical_path` 是唯一页面身份，避免 nullable `plan_id` 普通唯一约束允许重复产品概览记录。

## 7. 状态历史与 observe-only

历史记录至少保存：

- 页面身份与记录时间；
- 最终 robots index/follow；
- canonical URL；
- quality score 与 quality status；
- sitemap inclusion；
- 当时的 indexing decision、policy version 与触发来源。

历史表是 append-only 审计基础。第一阶段的写入服务只能 upsert 页面当前状态并追加 observation；公开价格页、metadata 和 sitemap 不读取这些表作为控制输入。静态门禁测试必须防止 `PricingDetailPage.tsx`、`product-seo-indexing-policy.ts` 或 `app/sitemap.ts` 在本阶段导入 observe-only store。

## 8. 实验冻结保护

以下目标保持活动锁：

| 实验 | 页面 | 锁定边界 |
| --- | --- | --- |
| Google Pro 5x metadata | `/en/ai-pricing/chatgpt/pro-5x` | URL、canonical、robots、H1、核心正文、内链与实验定义的不变项 |
| Bing ChatGPT Plus metadata | `/zh/ai-pricing/chatgpt/plus` | URL、canonical、robots、H1、核心正文、内链与实验定义的不变项 |

`2026-09-03` 不是自动释放时间。只有 GSC/Bing settled data 至少覆盖该日、形成七个完整观察日并完成实验结算后，才可通过独立批准把锁标为结束。observe-only 记录不得改变锁定页面输出。

## 9. 数据迁移

- 新表、字段、普通索引和普通关系归 Prisma schema + Prisma migration。
- migration 只做 additive DDL，不回填历史 robots 结论，不修改现有表数据。
- SQL 能力层不重复创建这些普通表；历史 SQL migration 保持不可变。
- 本地与影子库先执行 migration、Prisma validate/generate 和空库验收；生产应用与回填需要单独批准。

## 10. 验收

- 相同数据的连续 sitemap 请求产生相同 `lastmod`。
- LKG 的完整性、过期、origin、预算、哨兵、格式和 policy 负向测试全部通过。
- 实时失败 + 合法 LKG 返回完整快照；实时失败 + 非法/缺失 LKG 仍失败关闭。
- 新鲜 sitemap 在 LKG 写入失败时仍可返回，并记录无法更新恢复点。
- collector 成功后第二次失效覆盖产品、全部套餐、列表与 sitemap。
- Prisma schema、migration shadow、typecheck、lint、SEO/sitemap policy、全量测试与生产构建通过。
- observe-only 静态门禁证明现有 robots 控制路径没有导入新状态表。

## 11. 回退

- `lastmod` 和失效修复可通过代码回退，不需要数据恢复。
- 删除或不配置 `GEOSUB_SITEMAP_LKG_PATH` 会恢复原生产 fail-closed 行为；保留的快照文件不影响运行时。
- LKG schema/policy 版本升级后，旧快照自动不兼容并失败关闭，不进行宽松读取。
- observe-only 表为 additive；代码回退后可保留，不删除历史。本次已批准应用 additive migration，但不得接入生产 robots、canonical 或 sitemap eligibility 控制路径。
- 任何未来 robots 生命周期切换必须另写 rollout/rollback，不能复用本 RFC 的本地实现批准。

# GeoSub 流量增长情报 API V1 RFC

状态：草案，允许本地基础层实现；生产迁移、凭据、定时任务和外部 AI 传输尚未批准

日期：2026-08-30

分类：Architecture / L3
负责人：产品负责人 + Codex；Claude 可作为架构复核者

## 1. 决策摘要

GeoSub 建立一套面向 Codex、Claude 和其他获准分析客户端的内部“流量增长情报 API”。系统按来源保存可审计的日快照，先用确定性规则生成事实与候选问题，再由 AI 基于同一份证据包生成周度优化建议。

V1 的固定边界是：

- API 只提供聚合后的只读证据和 `proposed` 建议，不暴露生产数据库、管理员会话或站长平台写能力。
- Google、Bing、第一方页面浏览和第一方行为数据保留独立来源、时间范围、新鲜度与缺失状态；不把它们压成一个无法解释的“总增长分”。
- 每周建议不自动修改 Title、Description、H1、正文、URL、canonical、robots、内链或 sitemap，也不提交索引、推送代码或部署。
- 活跃 SEO 实验的锁定页面与不变项必须进入证据包；处于观察期的页面只能收到观察或诊断建议。
- 生产凭据、数据库迁移、timer、外部模型数据传输和上线分别审批。

## 2. 问题与用户

当前 GeoSub 已有第一方事件、无标识日页面计数、Search Console/Bing 手工快照、搜索机会评分和 SEO 实验记录，但这些信息分散在后台读模型、设置 JSON 和文档中。Codex 或其他 AI 每次分析都需要重新读取多个来源，难以稳定判断：

- 昨天的流量变化来自哪个搜索引擎、页面、国家、设备或搜索意图；
- 哪些页面是“有展现但低点击”，哪些只是数据未结算或样本过少；
- 哪些站内搜索词代表真实供给缺口，哪些包含敏感信息、噪声或恶意指令；
- 哪些建议会破坏正在观察的 SEO 实验；
- 本周最值得做的 1–3 项增长工作是什么，以及下周如何验证。

主要用户是 GeoSub 产品负责人和获准的 AI 协作者。V1 不是公开开发者 API；公开 API 门户属于独立产品能力。

## 3. 目标与非目标

### 3.1 V1 目标

1. 每日采集各来源已经结算的数据，并保存来源、日期、口径、完整性和输入版本。
2. 生成不可变、可重跑、带哈希的事实快照。
3. 用确定性规则识别异常、数据缺口、低 CTR 页面、站内需求缺口、转化断点和实验锁。
4. 提供固定、版本化、只读的 REST/JSON API，供不同 AI 使用同一语义。
5. 每周生成一份“证据 → 判断 → 候选动作 → 验收指标”的建议包，默认状态为 `proposed`。
6. 对缺失、延迟、部分失败和不可比窗口诚实降级。

### 3.2 V1 非目标

- 不提供任意 SQL、GraphQL、表达式执行、任意 URL 抓取或生产 SSH。
- 不返回匿名 ID、session ID、IP/IP hash、完整 User-Agent、原始低频 referrer 或原始事件。
- 不让 AI 直接持有 GSC、Bing、GA4、Cloudflare、数据库或管理员凭据。
- 不自动执行 SEO 改动、创建页面、发布内容、提交索引、推送 Git 或部署。
- 不为增长批量制造语言页、地区页或薄内容页。
- 不在 V1 建公开 API 门户、计费、第三方账号或开发者文档站。

## 4. 现有事实与复用范围

现有实现可复用：

- `event_logs`：经同意的第一方页面访问与交互，原始记录受 180 天保留政策约束。
- `daily_stats`：无访客标识的 UTC 日页面浏览聚合。
- `seo_gsc_observation_snapshots`、`seo_bing_observation_snapshots`：后台手工总量快照。
- `seo.search_page_observation_imports.v1`：经校验的 Google/Bing 页面级 CSV 导入。
- `getSeoTrafficConversionOverview()`：Google/Bing 自然搜索落地后的站内路径汇总。
- `getSearchDemandSummary()` 与 `buildSearchGrowthQueue()`：站内搜索需求、缺口和后续转化信号。
- 两个正在观察的 SEO 元数据实验及各自锁定项。

这些能力尚不能替代本 RFC：手工快照不是自动日数据；设置 JSON 不是长期分析事实表；现有后台函数也不是稳定的机器契约。

## 5. 指标框架

### 5.1 主要结果指标

V1 使用三个主要结果，但按来源分别呈现：

| 指标 | 定义 | 决策用途 |
| --- | --- | --- |
| 已结算自然搜索点击 | GSC 与 Bing 各自在相同完整日期窗内报告的点击；分别保存，汇总只用于容量观察 | 判断搜索增长是否真实转化为访问 |
| 合格自然搜索落地会话 | 第一方事件中由 Google/Bing referrer 进入公开价格/内容页的去重会话 | 对照站长平台点击与实际到站差异 |
| 自然搜索后续完成率 | 合格落地会话中，在 30 分钟内发生套餐意向或官方/商业入口点击的比例 | 避免只追求无后续价值的点击 |

站长平台点击与第一方落地会话不得强制相等。隐私同意、拦截、时区、重定向和平台口径会造成差异；报告必须解释口径。

### 5.2 驱动指标

- 各引擎已结算 impressions、CTR、average position。
- 页面和查询的新增/流失展现，按语言、国家、设备和排名段拆分。
- 高意图查询覆盖、站内搜索无结果率、搜索结果点击率。
- 套餐意向率、官方入口点击率和商业入口点击率。
- 已有搜索展现但页面质量或数据说明不完整的产品数。

### 5.3 Guardrails

- 每个来源的 `settledThrough`、完整日数、缺失率、隐私阈值/采样提示和抓取状态。
- impressions 与 average position 不得因追 CTR 持续恶化。
- 品牌词/非品牌词、普通自然语言/精确金额核验词、语言/地区不匹配信号分开观察。
- 活跃实验锁、页面质量、数据新鲜度、canonical/robots/sitemap 健康。
- AI 建议不得突破数据、SEO、安全和发布政策。

### 5.4 目标版本

目标不硬编码进算法。API 返回 `targetSetVersion`，当前目标可从已批准的 30/60/90 天 SEO 基线导入；每次修改必须产生新版本和生效日期。历史报告永远引用生成时的目标版本。

## 6. 数据源与结算语义

每个来源适配器必须输出统一 envelope：

```json
{
  "source": "google_search_console",
  "periodStart": "2026-08-20",
  "periodEnd": "2026-08-20",
  "settledThrough": "2026-08-20",
  "sourceTimezone": "provider-defined",
  "collectedAt": "2026-08-23T02:15:00Z",
  "status": "complete",
  "sampling": { "kind": "privacy_threshold", "missingShare": null },
  "contractVersion": "growth-metrics.v1"
}
```

状态：

- `complete`：必需字段齐全且该来源达到结算/新鲜度门槛。
- `partial`：保留可用事实，但不得生成跨来源强结论。
- `failed`：没有足够可信事实；不得拿旧数据伪装成当日结果。
- `unavailable`：来源尚未配置或已被 kill switch 停用。

定时采集只读取各提供方已经完整的日期，不默认把“昨天”当成完整数据。晚到数据通过相同 `source + date + contractVersion` 幂等补跑；更新后生成新的 snapshot revision，旧 revision 保留以便审计。

V1 的来源级策略：

- Google Search Console：日采集默认读取 D-3 final，并回补最近七天；保留 `first_incomplete_date/hour`、隐私阈值和 top-row 截断说明。Search Analytics API 不保证返回所有 query/page 明细，明细求和不能冒充官方总量。
- Bing Webmaster：全站流量与抓取统计按日读取，top query/page 按其每周更新节奏版本化。Bing 将于 2026-08-31 退役旧 SOAP/POX，新接入必须先验证当前 REST endpoint 与返回契约，不能按旧示例实现。
- GA4：作为可选的站内对账源。日报默认读取稳定窗口并滚动回补七天；涉及 key event/归因时回补十二天。Realtime 仅用于运行健康，不进入已结算增长判断。
- Cloudflare：作为可选的边缘流量与可用性来源，不作为“真实用户”或“搜索点击”。启动时读取 dataset settings，按实际 `notOlderThan`、`maxDuration`、字段和套餐限制建立水位线；adaptive 数据必须保留采样说明。
- 第一方数据：`daily_stats` 提供无标识页面总量；`event_logs` 只在生产边界内聚合搜索落地与后续行为，API 不返回原始行。

## 7. 数据处理架构

```text
Google Search Console ─┐
Bing Webmaster ────────┼─> source adapters ─> validated daily facts
GA4（可选对账）────────┤                         │
Cloudflare（可选质量）─┤                         v
first-party aggregates ┘                immutable evidence snapshot
                                                    │
                              deterministic findings + experiment locks
                                                    │
                                      read-only Growth API V1
                                                    │
                              Codex / Claude / approved AI consumer
                                                    │
                                 weekly proposed recommendations
                                                    │
                                      product owner approval gate
```

AI 只能消费聚合后的 snapshot。事实层由确定性代码生成；模型生成的解释和建议不能回写或改写事实层。

## 8. API 契约

基础路径：`/api/internal/growth/v1`

当前本地基础层只实现 `GET /overview?days=7|30|90`，用于验证机器鉴权、来源隔离、数据脱敏、限流和 fail-closed kill switch。准确契约见 [growth-intelligence-api-v1.openapi.yaml](growth-intelligence-api-v1.openapi.yaml)。它不是自动采集或正式周报接口。

该过渡接口的安全与结算约束：

- 实际响应复用 `classifyGrowthQuery()`；保持至少 3 次搜索、2 位访客和 2–120 字符的接口门槛，只输出通过检查的规范化搜索词，并逐条标记 `untrustedEvidence: true`。被抑制的明文不返回，汇总计数保留。
- 手工导入和静态基线没有提供方结算证据。有数据时固定为 `partial`、`settledThrough: null`；无数据时为 `unavailable`。`periodEnd` 和 `importedAt` 仅表示观测范围与导入时间，不能推导结算日期。
- 回归测试必须调用实际 GET、鉴权、读模型、队列与分类器，并检查序列化响应；数据适配器使用合成夹具。该层验证不替代真实数据库、HTTP 服务或生产验收。

完成来源适配、持久化和影子运行后，目标 V1 固定 GET 资源为：

- `GET /status`：契约版本、kill switch、来源配置状态、各来源 `settledThrough` 和最近运行状态。
- `GET /daily?date=YYYY-MM-DD`：指定日期的来源分离快照、数据质量和确定性 findings。
- `GET /weekly/latest`：最近完整可比七日窗口的证据包和候选建议。
- `GET /opportunities?window=7d&limit=20`：受限排序后的页面/查询/数据质量机会。
- `GET /experiment-locks`：当前实验 ID、引擎、目标页、锁定字段和最早判断日。

所有响应包含：

- `schemaVersion`、`snapshotId`、`snapshotHash`、`generatedAt`；
- 明确的 UTC 时间和来源时间字段；
- `complete` / `partial` / `failed` / `unavailable`；
- evidence references 和限制说明；
- `Cache-Control: private, no-store` 与 `X-Robots-Tag: noindex, nofollow`。

请求边界：

- 日期范围、分页、排序、响应行数、响应字节数、并发、速率和超时均有硬上限。
- 不开放 CORS；只接受 TLS 服务端调用。
- 未认证返回 401，scope 不足返回 403，限流返回 429，来源暂不可用返回 503。
- 错误响应不包含栈、SQL、环境变量、内部目录、管理 URL 或提供方 token。

## 9. 机器身份与访问控制

- 每个消费者独立身份、独立 secret、独立 scope 和独立撤销，不共享管理员 cookie。
- V1 只有 `growth:read` 与 `reports:read`，不存在 write、publish、deploy、webmaster 或 database scope。
- secret 只存在服务器 secret store/环境配置中，仓库只保留变量名和生成说明。
- 比较 secret 使用 constant-time comparison；日志只记录 consumer ID、scope、资源、时间、状态和延迟，不记录 secret。
- API 有独立 `enabled` kill switch；撤销单个消费者不影响其他消费者。
- 正式启用前需要确定长期机器身份方案；若未来跨主机/多团队使用，再单独记录 OAuth client credentials、短期签名 token 或 mTLS 的 ADR。

## 10. 隐私与不可信输入

- 默认只输出聚合数据；原始 `event_logs` 不离开生产数据边界。
- 搜索 query/referrer 可能包含邮箱、电话、订单号、token、URL 参数、个人信息或 prompt injection。进入 snapshot 前执行计数阈值、长度限制、PII/secret 过滤和控制字符清理。
- 低于最小样本门槛的 query 不输出明文，可合并为 `suppressed_low_volume`。
- 所有外部文本都标为 `untrustedEvidence`，AI 消费端必须把它当数据而非指令。
- 外部 AI V1 只接收聚合事实。若以后需要发送原始 query，必须重新审批供应商、保留期、处理地域和数据协议。
- 原始第一方事件继续遵守 180 天上限；增长聚合、报告和访问审计的保留期限在生产迁移前确定并写入运行手册。

## 11. 日报与周报

日报状态机：

```text
scheduled -> collecting -> validating -> complete
                                  |-> partial
                                  |-> failed
```

周报只读取七个完整、可比的 settled 日。若存在缺失日、指标版本变化、站点发布、尚未确认重新抓取或活跃实验锁，报告必须将相关结论标为不可比、观察中或 `actionable=false`。

允许的建议类型：

- `observe`
- `investigate`
- `data_quality_candidate`
- `content_gap_candidate`
- `experiment_proposal`

每条建议至少包含：问题、受影响来源/页面、证据、样本量、置信边界、预期指标、guardrail、最小动作、验收窗口和回退条件。不得出现 `apply_change`、`publish`、`submit_indexing` 或 `deploy`。

报告记录 `snapshotHash`、指标契约版本、规则版本、目标版本、模型与 prompt 版本及生成时间。模型不可用时仍能生成确定性事实包，不把模型故障写成数据故障。

## 12. 存储与迁移

生产阶段采用 additive schema，候选实体为：

- source run：来源、游标、时间窗、状态、重试和错误分类；
- metric snapshot：规范化日指标、dimension 和 quality metadata；
- evidence snapshot：不可变输入清单、hash 和 contract version；
- finding：确定性问题、严重度、证据引用和实验锁；
- weekly report：事实、模型解释、建议和人工决策；
- API access audit：consumer、scope、资源、状态和延迟。

正式表名、索引与保留策略必须基于影子迁移和真实查询计划确定；不得凭猜测加索引。现有 `site_settings` JSON 仅作为手工过渡输入，不承载长期历史。

## 13. 失败、告警与重试

- 提供方超时、配额、认证、权限、schema 变化和无数据必须使用不同错误类别。
- 自动重试只覆盖明确的瞬时错误，使用有上限的指数退避；认证/权限错误不重复轰炸。
- 来源部分失败不覆盖最后成功 snapshot，也不把旧 snapshot 标成今天的数据。
- 连续失败、settled lag 超标、日数据突变、跨来源对账异常和周报缺失触发运营告警。
- 两个并发 timer 不能创建重复日报或周报。

## 14. 分阶段实施

1. **本地契约与确定性分析**：版本化类型、fixture、hash、质量状态、实验锁和周报候选；无生产写入。
2. **本地只读 API**：固定 GET 资源、机器身份、边界、无缓存、安全测试；使用现有聚合/手工快照。
3. **提供方 shadow adapters**：Google、Bing 和第一方数据只读拉取，对账现有手工报告；不生成生产动作。
4. **additive schema**：影子迁移、查询计划、报告审计和回退兼容；生产应用另行批准。
5. **日报 shadow**：连续运行并与控制台/后台样本对账，缺失与延迟语义通过后再启用 timer。
6. **周报建议**：只消费完整日报并接入实验锁，报告默认 `proposed`。
7. **AI 薄适配层**：REST/JSON 为唯一核心语义；Codex、Claude 或 MCP 不各自直连数据库。
8. **生产启用**：迁移、secret、timer、外部 AI 和部署分别审批；逐项验证 kill switch 与撤销。

## 15. 验收标准

### 数据

- Google、Bing 和第一方指标抽样对账，差异有口径解释。
- 来源、时区、周期、settled-through、采样/隐私缺失和状态完整。
- 同一输入重跑产生相同事实层和 snapshot hash。
- `partial`/`failed` 不生成确定性增长结论。
- 周报只使用完整可比窗口，实验锁使相关建议不可执行。

### API 与安全

- 未认证、错误 scope、过期、撤销、重放和超限请求均按契约拒绝。
- GET 资源不能触发业务数据写入或外部平台动作。
- 响应和日志扫描不含 token、session、IP hash、原始身份数据和管理地址。
- 恶意 query/referrer 不能改变报告结构或成为 AI 指令。
- 单个消费者可独立撤销，API kill switch 在真实客户端生效。

### 运行与发布

- 并发 timer、超时、配额、部分失败、补跑和停用场景通过。
- L2/L3 自动化、类型、Lint、构建、CI、影子迁移和回退演练通过。
- 生产验收核对机器身份、timer、最新完整报告、失败告警、数据库健康和回退点。
- “代码存在”“API 可编译”“timer 已安装”“日报已完成”分别报告，不互相冒充。

## 16. 回退

- 立即停用 API 与 timer，撤销受影响消费者 secret。
- 提供方适配器和周报生成器分别使用 kill switch。
- additive schema 保留，不删除源数据；旧报告仍可审计。
- 若新指标契约有误，回到前一 contract version 并重新生成独立 revision，不覆盖旧 snapshot。
- 任何 AI 建议已被人工采纳时，其实际代码/SEO 变更使用自己的提交和回退，不由本系统自动处理。

## 17. 尚需批准的生产决定

进入生产前仍需产品负责人分别确认：

1. Google、Bing、GA4 与 Cloudflare 中 V1 的必需/可选来源。
2. 每个来源的账号、最小权限和 secret 存储方式。
3. 增长聚合、周报与访问审计的保留期限。
4. 机器身份长期方案和允许接入的 AI 消费者。
5. 是否允许把聚合证据发送到外部 AI；若允许，明确供应商与数据处理边界。
6. 生产迁移、timer、告警目标和首次 shadow 窗口。

## 18. 官方接口依据

- Google Search Analytics Query API：https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- Google Search Console 全量拉取与结算说明：https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data
- Google Search Console 配额：https://developers.google.com/webmaster-tools/limits
- Bing Webmaster API 首页与 REST 迁移提醒：https://learn.microsoft.com/en-us/bingwebmaster/
- Bing Webmaster OAuth：https://learn.microsoft.com/en-us/bingwebmaster/oauth2
- GA4 Data API：https://developers.google.com/analytics/devguides/reporting/data/v1
- GA4 数据时效：https://support.google.com/analytics/answer/11198161
- Cloudflare GraphQL Analytics：https://developers.cloudflare.com/analytics/graphql-api/
- Cloudflare dataset settings：https://developers.cloudflare.com/analytics/graphql-api/features/discovery/settings/

## 19. 2026-09-02 本地缺陷整改记录

- 分类：Bug / L2，仅修复 overview 的搜索词保护接线与结算状态，不改变页面、索引政策、数据库结构、056 价格隔离迁移或生产配置。
- 先增加实际 GET 响应回归：旧实现 10 项中 7 项失败；修复后 10/10 通过。覆盖隐私/凭据/指令文本、规范化、原采样门槛、当前日/历史导入、静态基线、输出上限、关闭/未授权与失败响应。
- Node 22.23.2 下，全套 582/582 测试、类型检查、全量 Lint 与 OpenAPI 契约检查通过。
- 生产构建退出 0，但页面取数出现本机数据库 `ECONNREFUSED`，因此只记为编译/构建完成，不记为真实数据验收通过。
- 编译后的本机 HTTP 接口在开关关闭时返回预期 JSON 404，且包含 `private, no-store` 与 `noindex, nofollow`；测试服务已停止。
- 未验证：启用后的真实数据库响应、迁移及迁移后 SEO、CI 和生产环境。API 保持默认关闭；本轮未提交、推送或部署。
- 同日连接排查：本机 Docker Desktop 未运行，尝试正常启动后仍在 `sailor-ingest.sock` 初始化阶段失败（Windows error 1920 / file cannot be accessed）。Linux 引擎管道和数据库端口均不可用，尚不能检查容器内数据。未删除/移动 socket、重置 Docker、重建数据库或执行迁移；后续临时文件恢复操作须另行确认。
- 同日经用户批准尝试仅将该 socket 改名保留：确认 Docker 已退出后，普通改名被 Windows 拒绝；随后通过 `OPEN_REPARSE_POINT` 只读打开文件本身也返回 1920，未进入底层改名步骤。原文件未变，备份文件未创建，未再次启动 Docker。只读盘点 `Docker/run` 得到 4 个零字节重解析点文件，父目录本身为普通目录；若改用整个运行目录改名保留，需要另行确认范围。数据库、容器配置及生产环境未操作，真实数据库响应验收仍阻塞。

## 20. 2026-09-03 首份周报与本地接通

用户已批准推进“增长数据接通与首份可信周报”，056 数据验收单独处理。
本轮为 Feature / L2：复用现有 overview、导入模型、事实哈希与实验锁，增加可重复运行的本地来源校验、页面观察导入和周报输出。凭据及生产自动日采集仍遵循本 RFC 的分阶段边界。

用户问题：现有后台可能读取历史搜索基线，难以据此决定下一项增长工作。
本轮结果：将官方控制台的实际观测接入本地 API，保存来源及日期证据，生成一份明确区分事实、数据缺口和候选动作的周报。

验收：

- overview 在隔离的 loopback 测试进程中，通过真实库的 7/30/90 天、鉴权、scope、限流、关闭及错误响应测试。
- 来源导入校验站点、周期、计数、重复日期、页面来源和文件哈希；只允许明确的本机目标，幂等重跑不重复导入。
- 日总量与页面级明细分别保留，不把页面求和冒充提供方全站总量，不补造缺失日。
- 控制台读取或手工导入没有提供方 final/settled 证据时，保留 `partial` 与 `settledThrough: null`。真实观测可以进入带限制的事实报告，但不能生成已结算增长结论或可执行实验建议。
- Google Web 与 Bing Web and Chat 的日总量分开报告；Bing 页面表仅为 Web 明细。第一方页面计数不是 UV，缺失日期不是零。
- 周报含输入哈希、指标版本、两周观察窗口、实验锁、最小候选动作、预期指标及验收边界。相同输入产生同一事实哈希。
- 不改变公开页面、SEO 输出、设计、采集策略、生产数据或长期 API 开关；无需新增生产表。

回退：移除本轮新增入口即可停止生成报告；本地手工页面导入保留原值备份，可在独立事务中恢复。私密输入、来源快照和报告运行证据存于仓库之外。

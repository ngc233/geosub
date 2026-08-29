# RFC：价格页内容热发布 V1

状态：草案；架构方向已确认，实施仍需单独批准

日期：2026-08-29

工作类型：Architecture / L3

代码基线：`cee9892c7d7f07a39443a2b58319aa4e47dc3325`

## 1. 问题

GeoSub 当前把内容修改、应用构建和生产部署部分绑定在一起。产品负责人即使只修改价格页的 Title、Description 或 H1，也可能需要等待代码提交和整段应用升级，增加了不必要的停机、回退和 SEO 风险。

现有实现只能提供局部的应用层失效能力：

- `app/admin/products/actions.ts` 写入产品或中文 `SeoMeta` 后调用 `invalidatePublicPricing(product.slug)`。
- `lib/public-pricing-cache-actions.ts` 只调用 Next.js `updateTag()`，没有调用 CDN purge API。
- `saveProductSeoAction` 把 locale 固定为 `ZH`；英文价格页继续依赖代码生成的 fallback 和更高优先级的实验文案。
- `canonicalUrl` 当前通过自由文本写入，服务端动作只做 trim/null 处理，没有自 canonical、域名或追踪参数校验。
- 公开价格页向共享缓存发送 `s-maxage=300, stale-while-revalidate=600`。Next.js 当前安装版本的文档明确说明：应用内 tag/path 失效不会清除 CDN 已缓存响应，必须另行触发 CDN purge。
- 仓库已有 Cloudflare 缓存规则说明和 `cf-cache-status` 观测，但没有 Cloudflare 自动精确清缓存的凭据、客户端或发布回执链路。

因此，当前“保存成功”只证明数据库写入和接收该动作的 Next.js 实例已执行缓存失效，不证明公网用户、搜索引擎或后续多实例立即读到同一版本。

## 2. 决策

建立独立于应用发布的“内容热发布”通道。V1 只允许把经过校验、版本化的内容数据发布到既有价格页，不传输或执行任意代码，不改变页面结构和 SEO 索引政策。

V1 发布链路固定为：

```text
保存草稿
  -> 校验目标、语言、字段、动态事实与 SEO 实验锁
  -> 创建不可变内容版本
  -> 在数据库事务中切换当前发布版本并写审计记录
  -> 失效 Next.js tag/path
  -> 调用 Cloudflare API 精确清理受影响 URL
  -> 分别回读源站与公网 HTML
  -> 核对 Title、Meta/OG/Twitter Description、H1、canonical 与版本身份
  -> 写入发布回执并显示最终状态
```

“热发布”只是内容数据包的发布方式，不是动态加载 JavaScript、模板、SQL、插件或远程可执行代码的 OTA。

## 3. 范围

### 3.1 V1 支持

- 页面：公开价格产品概览页与正式套餐页。
- 语言：当前主动索引的 `zh` 与 `en`，两种语言独立保存、预览、发布和回退。
- 字段：HTML Title、Meta Description、H1。Meta Description 指
  `<meta name="description">` 及其同源的 Open Graph/Twitter 摘要；首屏 hero
  description 不进入 V1，继续由现有代码生成。
- 内容生命周期：draft、active、superseded。
- 分发尝试状态：pending、succeeded、degraded、failed、superseded。
- 能力：预览、差异查看、发布、幂等重试、选择历史版本回退、发布回执。
- 缓存：Next.js 应用缓存失效、Cloudflare 精确 URL purge、源站与公网一致性核验。

页面目标必须使用明确身份：

```text
page_kind + product_id + optional plan_id + locale
```

不得只用显示名称、当前 URL 文本或 DOM 定位内容。

### 3.2 非目标

- 首页、分类页、文章、导航和地区页不进入 V1；文章继续使用现有文章发布链路。
- 不修改 URL、slug、canonical、robots、hreflang、sitemap 收录政策或结构化数据类型。
- 不修改布局、组件、设计 token、交互、价格算法或计费平台口径。
- 不修改价格、汇率、税费、收入、购买力、套餐复核或采集状态。
- 不自动提交 IndexNow、Google Search Console 或 Bing Webmaster；这些仍是需要单独批准的外部状态变更。
- 不在 V1 建立通用 CMS、任意 HTML 编辑器或远程模板系统。

## 4. 不变项与安全门禁

### 4.1 SEO 实验隔离

热发布必须调用统一的活动实验登记，而不是在后台复制一份手工名单。登记至少返回：实验 ID、目标页面、状态、观察窗口、主要变量和逐字段锁。

- 保存草稿可以继续，但发布前必须再次检查实验状态。
- 对活动实验采用逐字段硬拦截，不只显示警告。
- H1、核心正文和内部链接结构在观察窗口内保持锁定。
- Title、Description 是否锁定由该实验的主要变量和不变项明确决定；缺少完整实验定义时默认拒绝发布。
- 结束实验、改变实验变量或恢复实验基线必须走独立的实验动作并保留记录，不能通过普通内容发布绕过。

当前 `lib/pricing-metadata-experiments.ts` 中的代码实验优先级必须在迁移期显式保留；V1 不允许出现“后台显示已发布，页面仍被未知代码实验覆盖”的假成功。

### 4.2 动态事实

HTML Title 或 Meta Description 中涉及价格、地区数、最低价地区、基准价或年份时，必须使用批准的 canonical dataset token，由服务端在渲染时解析。不得把可能过期的数字作为普通自由文本写入。

允许的 token 必须白名单化、类型化并有失败回退；未知 token、缺失数据或平台口径不一致时拒绝发布。V1 不允许任意表达式或模板代码。

token 白名单按字段定义。H1 默认只允许产品与套餐等稳定身份 token，不允许价格、地区数、最低价地区、基准价或年份等易变事实。需要放宽 H1 时必须先修改 SEO 政策，不能由实现自行决定。

### 4.3 内容版本与业务时间

内容版本使用独立的不可变 `content_version` 身份和 `content_published_at`。它们不得复用或覆盖：

- 价格采集时间；
- 汇率基准时间；
- 税务更新时间；
- 收入数据时间；
- 套餐复核时间。

回退不是改写历史。选择旧内容后必须创建一个新的发布版本，并重新执行完整发布链路。

### 4.4 锁定字段

以下字段继续由代码和政策层控制，不出现在热发布 payload 中：

- URL、slug 与路由身份；
- canonical、robots、hreflang 与索引资格；
- 结构化数据类型和序列化策略；
- 产品、套餐、平台、价格及审核身份；
- 采集、汇率、税费、购买力和发布规则；
- 布局、组件、脚本和样式。

现有后台 `canonicalUrl` 自由文本入口不得接入 V1 发布动作。是否隐藏或改为只读属于独立的后台安全加固任务，不并入本 RFC。

### 4.5 凭据与权限

- Cloudflare 使用只授予目标 zone `Cache Purge` 权限的 API Token，不使用 Global API Key。
- Token 和 zone ID 只存在于服务器环境或受控 secret store，不进入 Git、浏览器 payload、审计正文或错误输出。
- 内容发布沿用现有管理员认证，并记录操作者、目标、差异、理由和幂等键。
- Directus、SQL 脚本或其他旁路写入不得直接把受管字段标为已发布；所有正式发布必须经过统一服务动作。

Cloudflare 官方 API 支持所有套餐按 URL 精确清理缓存；V1 使用 URL purge，不使用 `purge_everything`。参考：

- <https://developers.cloudflare.com/api/resources/cache/methods/purge/>
- <https://developers.cloudflare.com/cache/how-to/purge-cache/purge-by-single-file/>

## 5. 数据与兼容方案

### 5.1 模型原则

复用现有 `SeoMeta` 的产品、套餐和 locale 关联作为迁移输入，但重建有明确唯一约束的版本化读模型。当前正式读路径只读取中文产品级 `SeoMeta`，英文和套餐级记录不能被当成已经接通的能力。

实施设计至少需要表达：

- 目标页面身份与 locale；
- 单调内容版本或不可变 revision ID；
- Title、Description、H1 和受控 token；
- draft/active/superseded 内容状态与唯一 serving revision 指针；
- 创建、审核、发布时间和操作者；
- 前一版本、内容 hash、变更理由；
- 独立 publish attempt、Next 失效、Cloudflare purge、源站回读和公网回读结果。
- 所有 N/N-1 发布动作共同读取的持久化 admission fence、feature mode generation 与最近一次切换证据。

具体表名和字段在实施 PR 中确定，但迁移必须为 additive，旧应用可继续读取现有字段。数据库唯一性必须覆盖产品概览、套餐页和 locale，避免多条 serving revision。产品概览的 nullable `plan_id` 不得依赖普通唯一约束；实施必须使用非空页面身份、partial unique index、`NULLS NOT DISTINCT` 或等价约束，并有并发写入测试。

热发布启停不能只依赖各 release 的环境变量。迁移期先建立数据库持久化 feature mode 与
admission fence；数据库 mode 是所有 N/N-1 公开读路径和发布动作的共同权威，环境变量只作为
“可进一步强制关闭、不可绕过数据库强制开启”的 release 级 kill switch。所有可能处理发布
动作的 N/N-1 版本必须在切换 serving pointer 的同一事务内锁定并检查 fence，关闭时即使旧
页面或 previous Action 路由仍存在也必须拒绝写入；公开读路径同时按 mode 选择 active revision
或代码 fallback。每次 enable/disable 都递增 `managed_content_epoch` 和独立 feature mode
generation，并把 mode/generation 纳入响应版本身份、审计和缓存回读。未部署 mode/fence 检查
的旧版本不得进入 previous Action 支持集合。

### 5.2 读优先级

迁移期间按以下优先级产生页面最终内容：

1. 活动 SEO 实验的已批准变量；
2. 当前 serving pointer 指向的 active V1 内容版本；
3. 当前代码生成的完整 fallback；
4. 不含动态价格事实的安全通用 fallback。

分发 attempt 的 pending/degraded/failed 状态不改变 serving pointer，也不触发隐式 fallback。不得让不完整数据库字段覆盖更完整的生成 fallback。`zh` 与 `en` 分别解析，禁止跨语言回退到另一语言的 active 文本。

### 5.3 发布失败语义

数据库事务提交后，Next 失效、CDN purge 和公网回读属于外部步骤，无法组成单一分布式事务。内容生命周期与分发状态因此保持正交：

- 任一步骤失败时不得显示“发布完成”。
- 数据库 serving pointer 已切换后，新 revision 保持 active；只有对应的 publish attempt 标记为 `degraded` 或 `failed`。公开读路径继续读取 active revision，不根据分发状态隐式退回旧版本。
- 同一事务必须写入新的 active pointer、递增 `managed_content_epoch`，并创建 durable pending publish attempt/outbox；进程在外部步骤中断后仍可发现和恢复。
- 每个页面身份与 locale 同时只允许一个发布操作。事务使用 `expected_current_version` 乐观锁，attempt 使用独立 `publish_attempt_id` 和幂等键。
- 每个外部步骤和状态写入前重新核对 serving revision。若新版本已经取代本 attempt 的 revision，旧 attempt 进入 `superseded`，不能把自己标为成功或覆盖新回执。
- 不自动把数据库回滚到旧内容，因为部分请求可能已经读取新版本；需要恢复时以新的回退版本重新发布。
- Cloudflare purge 失败时明确告知公网可能继续命中旧内容，并记录可重试错误，不输出 token。

单次 publish attempt 使用以下状态与转换，避免后台、告警和重试对
`degraded` / `failed` 作不同解释：

| 状态 | 判定 | 后续动作 |
| --- | --- | --- |
| `pending` | 数据库事务已提交，外部失效、purge 或回读仍在批准的重试预算内 | 对瞬时错误自动幂等重试；保持告警为进行中 |
| `succeeded` | 必需的 Next 失效与 Cloudflare purge 已完成，源站和全部批准的公网回读均观察到本 revision | 终态；写入成功回执 |
| `degraded` | 至少一个批准的公网 canonical 回读已观察到本 revision，但 purge、其他公网路径或完整证据仍失败/缺失且重试预算已用尽 | 本 attempt 的非成功终态；发出警告级告警，可自动或人工创建引用本 revision 的后继 retry attempt |
| `failed` | 重试预算用尽后，仍没有批准的公网回读能证明本 revision 已被采用，或源站版本/内容核验失败 | 本 attempt 的非成功终态；发出严重告警，只允许人工确认或经规则批准的后继 retry attempt |
| `superseded` | serving revision 已被更新版本取代 | 终态；停止外部动作，不再重试 |

`degraded` / `failed` 都不回拨 serving pointer，也不得改写为成功。后续恢复创建带有
`previous_attempt_id` 的新 attempt，沿用同一 revision、重新取得 lease 并重新核对
serving revision；这样保留原始失败证据，同时允许新 attempt 独立进入
`succeeded` 或 `superseded`。自动重试次数、退避、总时限与告警升级阈值在实施前批准。

## 6. 缓存与一致性

### 6.1 URL 清单

发布前由路由函数生成受影响的 canonical URL 清单，不接受管理员手填 URL。V1 至少包含目标 `zh` 或 `en` 的产品概览/套餐正式路径；只有实际依赖该字段的页面才进入清单。

实施前必须审计生产 Cloudflare cache key：查询参数、语言头、设备头、HTML/RSC 变体和 Transform Rule。若 RSC 响应被边缘缓存，purge 必须覆盖其真实 cache key；若未缓存，需要用响应头证据证明，而不是假设。

### 6.2 完成条件

一次 publish attempt 只有同时满足以下条件才可进入 `succeeded`：

- 数据库当前版本和内容 hash 正确；
- Next.js 目标 tag/path 已失效；
- Cloudflare API 返回成功；
- 源站 HTML 含目标 Title、`meta[name=description]`、`og:description`、`twitter:description` 和 H1，三个 Description 派生输出与同一受管字段一致；
- 公网 HTML 含同一内容版本和相同的 Meta/OG/Twitter Description 派生输出；
- canonical、robots、hreflang 与结构化数据政策未变化；
- 发布回执已经持久化。

受管价格页响应使用 `X-GeoSub-Content-Version` 或等价、可审计的版本身份；身份包含 serving revision 与 feature mode generation。源站通过受控 loopback/Host 请求回读，公网通过 canonical URL 回读，两者同时核对版本身份、HTML 内容及 Meta/OG/Twitter 派生摘要。不可变 `content_hash` 覆盖受管 Description 模板/token 定义；发布回执另存三个实际渲染结果各自的 `rendered_output_hash`、所用 canonical data snapshot 与回读时间，不能把易变动态事实写回 revision hash，也不能只记录数据库原值。

首版把“发布动作开始后 60 秒内公网一致”作为待生产演练确认的候选目标，而不是已承诺 SLO。通过 cache-key 演练确认可达到并获得批准后，才能写入后台承诺。Google/Bing 的重新抓取不属于该目标。

### 6.3 多实例兼容

Next.js 当前文档说明 `revalidateTag()` 默认只作用于接收调用的实例；GeoSub 现用 `updateTag()` 同样不能代替外部 CDN purge。两条发布轨道必须共享一个数据库持久化的 public-change lease 和单调 `managed_content_epoch`。该 epoch 只覆盖本 RFC 管理的 Title、Description 与 H1，不表示价格、汇率、税务等公开数据已经加入同一并发协议：

- 内容发布从 serving pointer 切换前取得 lease，直至 Next/CDN 失效与双端回读完成或进入可恢复失败状态。
- 蓝绿切流从候选最终内容刷新前取得同一 lease，重新读取 `managed_content_epoch`、失效候选缓存并验证；只有 epoch 在 Nginx reload 前保持不变才允许切流。
- lease 必须有 owner、过期时间、心跳和崩溃恢复规则，不能依赖单进程内存锁。
- 当前单实例可以继续使用本地缓存；蓝绿 V1 启用前必须按其独立 RFC 实现共享 cache handler/tag 协调，不能只依靠 lease。

不得在候选验证后、切流前忽略新的内容发布，也不得在两个长期活跃实例各自持有无协调缓存时宣称内容热发布具备公网一致性。

## 7. 迁移计划

1. 盘点 `zh/en` 产品概览、套餐页、现有 `SeoMeta`、生成 fallback 和代码实验的实际优先级。
2. 建立实验登记的统一查询接口和逐字段锁，先用测试保护现有实验。
3. 新增 additive 内容版本、持久化 feature mode/admission fence 与发布回执 schema；先让所有可进入 N/N-1 支持集合的版本实现事务内 fence 和读模式，再在影子数据库演练迁移、并发与回退兼容。
4. 把当前有效模板记录为 baseline revision。baseline 保存稳定文本、批准的 token 或 legacy template identity/hash，不保存当时渲染出的价格、地区数等易变字符串；缺失英文数据库记录时保留代码 fallback，不制造虚假英文内容。
5. 建立统一发布服务、幂等重试、Next 失效和源站回读，保持旧读路径为默认。
6. 接入最小权限 Cloudflare URL purge，并完成生产 cache-key 只读盘点。
7. 对一个无活动实验的产品概览和一个套餐页分别执行 `zh/en` canary；不改变索引政策。
8. 源站、公网、SEO 和回退验收通过后，再用功能开关切换默认读路径。
9. 更新后台入口和发布运行手册；IndexNow/GSC/Bing 仍保持独立批准流程。

任何生产 schema、凭据配置、批量 baseline 回填或 Cloudflare 状态变更都需要单独批准，不能因本 RFC 获批而自动执行。

## 8. 回退计划

### 8.1 内容回退

选择上一内容版本，创建新的 rollback revision，完整执行校验、Next 失效、Cloudflare purge 和双端回读。保留原版本和失败回执。

### 8.2 功能回退

关闭 `GEOSUB_CONTENT_HOT_PUBLISH_ENABLED` 不是只改一个 release 配置。持久化 mode/fence 先
阻断所有 N/N-1 写入，配置 kill switch 再关闭代码入口；在完成以下步骤前不得宣称功能已经回退：

1. 取得 public-change lease，等待正在运行的 attempt 完成或安全进入可恢复状态。
2. 在数据库事务中把 admission fence 设为 closed、feature mode 设为 fallback，并递增 `managed_content_epoch` 与 feature mode generation；此后所有已兼容 N/N-1 版本都必须拒绝发布并读取代码 fallback。
3. 核对所有可能处理 Action 的 active/previous 实例都报告相同 mode/generation 且已实现事务内 fence；未能证明兼容的 previous release 必须在释放 lease 前禁用对应发布 Action 路由，无法区分动作时禁用整个 previous Action 路由。
4. 通过批准的应用配置发布/重启把环境 kill switch 关闭，防止本 release 意外重新开放；数据库 fence 仍是跨 release 的权威。
5. 由路由函数生成全部受管 `zh/en` 产品概览页和套餐页 URL 清单，在所有活动应用实例执行 Next tag/path 失效。
6. 对同一清单执行 Cloudflare purge；不得用浏览器强制刷新代替边缘缓存清理。
7. 分别从 loopback/Host 源站和公网 canonical URL 回读，核对 fallback 内容、canonical、mode/generation 与版本身份。
8. 写入功能回退回执并释放 lease；additive schema、active revision 与审计历史保留，不自动恢复数据库。

若 Next 失效、Cloudflare purge 或双端回读未完成，状态保持 `degraded` / `failed`，
继续按回退运行手册重试，不能把“源站代码已关闭”当成公网回退完成。

重新启用使用相反顺序：先让所有 N/N-1 release 带着关闭的数据库 fence 完成兼容验证与
配置部署，最后才在持有 lease 的事务中打开 mode/fence、递增 epoch/generation，并执行完整
Next/CDN 失效和双端回读；任何单一环境变量都不能直接把功能重新开启。

### 8.3 外部故障

Cloudflare 不可用时允许保存草稿，但 publish attempt 保持 degraded/failed，不绕过公网一致性门禁。数据库恢复仍按独立高风险流程审批。

## 9. 验收标准

- `zh/en` 可以独立保存、预览、发布和回退，且不跨语言串用。
- 产品概览与套餐页使用明确目标身份，不能误写同产品其他套餐。
- 活动 SEO 实验的锁定字段被服务端硬拦截；只改前端表单不能绕过。
- 动态价格事实来自 canonical dataset token，价格缺失或口径不一致时拒绝发布。
- canonical、robots、hreflang、URL、JSON-LD 类型和索引资格在发布前后保持不变。
- 内容版本和发布时间不改变价格、汇率、税务、收入或套餐复核时间。
- 每次发布可追踪版本、操作者、差异、不可变内容 hash、Meta/OG/Twitter 三种 Description 的 rendered output hash 与数据快照、状态、Cloudflare 请求结果和双端回读证据。
- Next 失效失败、Cloudflare 失败、源站不一致和公网不一致均不会被标记为完成，并可幂等重试。
- 并发发布、乱序重试和进程中断不会让旧 attempt 覆盖新 serving revision；未完成 outbox 可恢复。
- 热发布与候选验证/蓝绿切流并发时，`managed_content_epoch` 不倒退，切流后不会重新出现旧的受管内容。
- 在生产 cache-key 演练中满足届时批准的一致性目标/SLO。
- 自动化覆盖正常、边界、实验锁、跨语言、动态事实和外部失败用例。
- 通过类型、Lint、生产构建、SEO 检查、sitemap 检查和目标页浏览器验收。
- 上线后核对实际 Title、Meta Description、`og:description`、`twitter:description`、H1、canonical、robots、hreflang、mode/generation、版本身份及 CDN 响应头。
- 关闭 fence 后，从 active 或 previous 任一入口提交发布动作都被服务端拒绝；重新启用必须经过持久化 mode/fence 和完整失效回读链。

## 10. 未决事项

实施前必须用证据回答：

1. 生产 Cloudflare 的 HTML/RSC cache key 和 Transform Rule 实际配置是什么？
2. 当前代码实验的状态、最早判断日期和逐字段不变项如何进入统一登记？
3. 版本化读模型采用独立当前版本表还是兼容物化回写 `SeoMeta`？
4. 生产 60 秒公网一致性候选目标是否经演练可达；失败重试和告警阈值是多少？
5. public-change lease 的超时、心跳、恢复和管理员强制解锁条件是什么？

sitemap `lastmod`、canonical 后台入口和 hero description 均不属于 V1；若后续修改，分别按 SEO 或后台 Improvement/Architecture 重新定界。

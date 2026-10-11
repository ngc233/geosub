# 英文 ChatGPT 内容独立发布试点

状态：用户已批准仅英文 ChatGPT 总览页的生产接入。Architecture / L3；生产尚未启用。

下方本地阶段记录为历史证据，最新范围和未完成项见末尾。

## 范围与决策

承接 rfc-content-hot-publish-v1-2026-08-29.md，先实现单页本地纵向试点。
目标固定 en / ai / chatgpt 产品总览；不接收客户端传入目标路径。
允许 title、description（同步 hero/OG/Twitter）、H1、说明段落、FAQ、来源。
新范围由 2026-10-11 用户批准；旧 RFC 的公网发布完成门禁保留。
价格、套餐身份、URL、索引、canonical、hreflang、中文及套餐页不变。

复用 SiteSetting 的私有命名空间存储独立草稿、不可变修订及当前指针，
而非整包历史 JSON。固定锁键的 PostgreSQL 事务 advisory lock + expected generation
保护并发保存/发布/回退。每次指针切换与审计、pending 分发回执同事务写入。
不引入依赖或 schema migration。普通系统设置仅更新白名单键，不暴露此命名空间。
单页试点使用本地数据库模式约束：生产 DATABASE_URL 下发布动作拒绝；
正式多实例 fence/lease、Cloudflare purge、双端回读由旧 RFC 后续阶段承担。
不得把此本地发布入口直接用于生产。草稿预览需要管理员认证且 noindex。

## 阅读与版本

公开读取仅已切换版本；草稿绝不进入公开 cache。没有版本时沿用生成模板。
使用 React request cache + 既有 unstable_cache 模式，独立 tag，切换后 updateTag
与精确 revalidatePath。内容修订 C0001 等与应用 VERSION 分开。
正文/元数据/FAQ JSON-LD 共用同一内容对象；价格卡继续用 canonical dataset。
普通内容只写解释性文字，不写动态价格/地区覆盖数；来源和复核理由必填。
纯文本输出，不允许 HTML、脚本、自由 URL/canonical 字段。来源只允许 HTTPS 官方域名。

## 发布语义与回退

保存草稿不改变访客页面。预览后对精确 generation 提交复核发布。
历史修订只创建不覆盖。回退复制历史 payload 形成新修订；支持回退到代码默认。
切换事务创建 pending 回执；缓存失效成功标记 origin_invalidated，异常保持 pending。
可重试缓存失效，但本地回执永远不声称公网完成。生产端拒绝动作。
应用回退保持私有修订不删除，旧应用不读取这些键；无需数据库恢复。
本地基线到首版再到回退均须验证。首次系统能力上线仍需要应用版本；后续内容才免构建。

## 验收

验证输入边界、目标隔离、并发冲突、草稿隔离、版本单调和回退；生产禁写。
类型、lint、相关测试、构建、SEO门禁及桌面/移动亮暗预览和后台验收。
当前阶段不能宣称生产热发布完成；生产启用必须补足旧 RFC 的 fence/lease、
CDN purge、源站/公网内容身份回读及故障恢复门禁，再单独批准。

## 本地验收记录（2026-10-11）

- 已验证：12 项聚焦测试、TypeScript、受影响 TS/TSX lint、生产构建、SEO 政策检查。
- 已验证：PostgreSQL 真实事务内草稿隔离、旧 generation 拒绝、不可变历史、
  回退新版本、过时回执不覆盖新版本；全部测试数据由事务回滚。
- 已验证：未登录访问后台跳转登录，公开英文总览仍沿用基线内容。
- 本地 sitemap 预算检查通过，但恢复库数据过旧导致产品价格入口缺失，
  不可将其计数当作生产 sitemap 验收证据。
- 尚未验证：认证后的后台操作、桌面/移动亮暗四态、实际发布后的 HTML/JSON-LD
  与 metadata 一致性、真实并发双提交、CDN 分发。
- 本地库暂无管理员，已请求创建并在验收后禁用临时管理员的授权。
- 没有生产写入、推送、部署或索引提交。生产启用仍受第一个 RFC 的完整门禁约束。

### 经授权的本地浏览器验收补充

- 临时本机管理员经用户批准创建，正常登录；验收后已禁用、撤销 1 个会话，删除临时密码文件。浏览器刷新已回到登录页。
- 已验证保存草稿（generation 1）不改变公开页；管理员预览正确渲染说明与 FAQ。
- 经后台发布 C0001 后，源站 HTML 的 title、description、OG/Twitter description 与草稿一致，FAQ JSON-LD 包含对应可见问答。
- 经后台回退生成 C0002，恢复代码默认 title/H1；中文 Plus 的 title/H1 与本次基线一致。没有生产动作。
- 非法 HTML 标题在服务端被拒绝并显示可恢复错误，未保存非法内容。
- 已观察桌面亮色、390×844 手机亮色的后台和预览，以及加载、空历史、发布成功和输入错误状态。
- 仍未完成暗色四态、完整键盘验收、真实双提交并发及 CDN 分发，因此不能宣称达到生产发布标准。
- 本地保留草稿、C0001/C0002 审计历史；访客当前内容为代码默认。证据在工作区 private/content-pilot-20261011（不提交）。

### 最终本地补充验收

- 在独立 PostgreSQL schema 中执行真正双事务并发：双草稿保存、双发布各只有一个成功；generation 单调、无覆盖、只有一个修订。临时 schema 在 finally 中清理，既有内容数据未变。
- Chrome DevTools 仅对验收标签模拟 prefers-color-scheme: dark。后台编辑与草稿预览已检查 1280×720 桌面及 390×844 手机暗色；结合此前亮色检查完成对应四态观察。
- 实际键盘检查：搜索标题 Tab 到 H1；连续 Tab 可到 FAQ；Enter 成功展开 FAQ；手机暗色焦点边框清晰。
- 截图保存在 outputs/content-system-preview，editor-desktop-dark、editor-mobile-dark、preview-desktop-dark、preview-mobile-dark；非仓库内容。
- 临时 viewport 已重置，验收标签已关闭。临时管理员已禁用且会话撤销。
- 本轮仅补充测试与验收记录，没有改变应用运行时代码，无须重复构建。此前构建结论适用于同一运行时代码。
- 本地试点已覆盖计划中的核心功能、并发及代表性键盘/亮暗界面；生产 CDN purge、双端回读、持久化 fence/lease 仍未实现，不可作为生产热发布完成交付。

## 分发可靠性实施阶段

本地 Architecture / L2：先将单一回执升级为持久化分发尝试。发布/回退与首个
pending attempt 同事务提交；缓存失效前领取 60 秒租约，只有当前版本、当前
attempt 和租约 owner 可以写回结果。进程中断后允许新 attempt 接管，保留旧失败
记录。每个修订最多三次尝试，失败后至少间隔五秒；重试不修改内容版本。
本阶段成功状态仅为 origin_invalidated，绝不表示 CDN 或公网验收成功。
历史修订读取和回退先校验 SHA-256，损坏数据不能作为发布依据。
继续复用私有 SiteSetting，无 schema migration；生产数据库读写保护保持不变。
应用回退兼容新增可选字段，历史数据保留。验收覆盖真实 PostgreSQL 双领取、
过期租约、过时结果、失败重试及终态不可覆盖。
生产 fence/epoch、应用切换互锁、CDN 权限及双端 HTML 回读仍须后续实现，
这一阶段不能代替旧 RFC 的生产发布门禁。

### 分发可靠性验收记录

- 已验证：本地真实 PostgreSQL 双领取只有一个成功；错误 owner 不能写回；
  pending/running 中断后可建立新尝试；终态历史不覆盖；过期及旧版本结果拒绝；
  五秒退避和三次上限；旧 pending 回执可兼容升级；损坏修订读取及回退拒绝。
- 已验证：Server Action 与真实 store 集成，模拟 Next 缓存失败后持久化失败尝试，
  重试原修订并完成应用缓存回执。此测试对 Next 缓存 API 使用 mock，不冒充浏览器验收。
- 已验证：5 项输入/范围测试、TypeScript、受影响代码 lint、生产构建、diff check。
  构建仍提示既有 product-logo-storage 动态文件追踪警告，未扩大范围修改。
- 本次无布局变更；未重复浏览器发布操作。既有四态截图反映界面布局，不能作为
  本次新分发逻辑的浏览器证据。本机 3118 预览服务已用新构建恢复。
- 分发依赖当前管理员动作执行；没有后台轮询恢复服务。失联后需刷新并显式重试。
- 生产通道仍未接通：持久化启停 fence/epoch、应用发布互锁、CDN 清理和双端回读
  均未在本阶段完成。没有推送、部署、生产凭据读取或生产数据库写入。

## 双端回读与发布准入保护（本地实现）

- 私有 SiteSetting fence 保存 admission、generation、epoch。初始仅本地模式开放；
  生产 DATABASE_URL 总是被既有硬门禁拒绝，不能靠设置 fence 开启生产。
- 发布、领取、重试及结果写回与 fence 共用事务锁。关闭入口不修改 serving revision，
  草稿可继续编辑；变更 fence 作废尚未完成的 attempt。重新开启后需创建新尝试。
- 公开读取按 epoch 区分缓存；HTML 增加非可见的 mode generation 身份。
  这是发布准入开关，不等于切换到代码 fallback；多实例和应用升级互锁仍待接入。
- 新回读模块复用已有 sanitize-html 解析器，核对实际 title、H1、三种 description、
  canonical、revision 与 mode generation；重复、缺失或不一致均拒绝。
  源站 URL 固定 loopback 和 Host，公网固定 canonical，不附加 cache-buster。
  禁止重定向，十秒超时，HTML 最多三 MB；输出 HTML hash 及字段 hash，不回传上游错误正文。
- CDN adapter 仅接受已审计的 single-URL cache policy，仅发送试点 URL 的 files purge；
  不支持 purge_everything。HTTP 200 且 success=true 只记为请求已接受。
  参考 https://developers.cloudflare.com/api/resources/cache/methods/purge/ 。
- 顺序编排器在每步前后检查当前资格，串行执行 Next 失效、源站回读、purge、公网回读；
  任一步失败不能返回 verified。verified 仅为内存结果，仍需同租约/fence事务持久化。
- 当前 adapter/编排器尚未连接后台发布动作，没有调用生产 CDN API。
  生产真实 cache-key/RSC 配置审计、凭据配置、应用切换互锁、持久化双端证据与后台回执展示
  是剩余接线和验收项；不得以本地 mock 测试宣称公网热发布完成。

### 本轮验收

- 真实隔离 PostgreSQL 验证 fence：暂停阻止发布和重试、允许保存草稿、保留公开版本；
  暂停使旧 owner 无效，旧 generation 不能重新开启，恢复使用新 generation。
- 12 项聚焦测试覆盖 HTML 实体/嵌套 H1、错误或重复字段、HTTP 错误、超大响应、
  未审计配置拒绝、单 URL purge 请求、分发每步失败及各阶段 fence 失效。
  CDN 与公网测试均为 mock，没有外部缓存操作。
- 类型检查、生产构建通过；全量 lint 无错误，仍有既有 ManualCollectionProgressForm 警告。
- 3118 本机服务已恢复。真实源站 HTTP 回读通过，观察到 C0002 / mode generation 0，
  标题、H1、三种摘要和 canonical 一致。发现并修复布局外层 main 被误计为内容身份的问题。
  本机价格为历史恢复数据，此回读仅验证协议，不构成最新价格事实或生产验收。
- 页面只增加不可见身份属性，没有布局变更；未重复四态验收。

## 生产接入阶段（已批准，尚未上线）

仅 `/en/ai-pricing/chatgpt`，不扩大产品、语言、套餐或索引。
用户已明确批准单站点 Cache Purge 令牌及 SSH 写入服务器环境文件；令牌已验证
active，文件权限 0600。密钥不入库。配置时未重启服务、发布内容或清理 CDN。

后台动作已连接分发入口：租约检查 → Next 失效 → 源站 HTML → 固定 URL purge →
公网 HTML → 持久化回执。生产配置缺失不能降级成本地成功；本地库即使误配凭据也
禁止清理生产缓存。当前生产数据库硬门禁仍保留，配置凭据本身不会启用热发布。

回读增加正文、来源、可见 FAQ 和 FAQ JSON-LD 核对；代码默认回退必须标明 fallback
并且没有残留受管正文，再比较源站与公网的动态生成结果。发布和回退递增缓存 epoch。
只有当前版本、当前租约、当前 fence 下的完整双端证据可以标记 verified。

已验证：15 项聚焦测试；真实本地 PostgreSQL 的并发、租约、版本、回退、证据持久化
以及整个分发入口集成。外部 HTTP 为 mock，不代表生产验收；隔离 schema 已清理。
尚未完成：生产运行模式、应用部署/回退互锁、新版发布门禁、浏览器验收、CI、标准
升级及实际公网热发布/回退演练。

迁移：首次能力上线需要应用版本，先保留代码默认；完成模式和部署互锁后才开放入口。
沿用 SiteSetting 私有键，无 schema migration。回退旧应用前必须先关闭发布并作废
租约，核对源站/公网默认内容，再运行标准回退；保留所有修订，不恢复整个数据库。


### 生产模式与应用互锁实现补充

生产模式须显式 `GEOSUB_CONTENT_RUNTIME=production-v1`，且只接受 loopback 的
`geosub_app` 数据库；没有环境开关时公开读取沿用代码模板、写入拒绝。生产新库的
持久化 admission 默认为 closed，环境配置无法自动打开。已有本地模式仍仅接受
明确的本机演练数据库名称。

升级脚本在停服务前调用 `content-deploy-fence.cjs upgrade`，使用相同数据库事务锁
关闭入口、递增 generation/epoch、作废 pending/running 尝试并记录审计。升级失败
也不自动重开。回退脚本的同一互锁还要求当前修订已回退代码默认且双端 verified，
否则在修改 checkout 前拒绝。没有任何内容状态的首次应用上线无需写 fence。

完成新应用健康检查与源站/公网核验后，使用 `content-deploy-fence.cjs resume N`
显式重新开放（N 为当前 fence generation）；旧 N 拒绝。配置要求同时包含 runtime、
cloudflare 分发、已审计缓存策略和令牌。恢复入口不会创建内容版本或更改当前正文。
实际应用升级/回退及恢复入口的生产演练仍待执行。

### 候选 2.11.0 本机真实验收

- 标准 release-check（基线 origin/main=2.10.5）通过：版本一致、前后端依赖零漏洞、
  秘密扫描、SEO、类型、Lint、649 项测试和生产构建。Lint 有既有导航警告，构建有
  既有 Logo 动态追踪警告；未作为本次范围处理。
- 浏览器在候选 3120 通过已存在的管理员正常会话发布 C0003，再回退 C0004。
  独立 HTTP 回读实际 SSR 验证正文/来源/6 FAQ/JSON-LD/标题/摘要/版本；代码默认
  回退验证无残留正文，原草稿保留。此证据仅属本机，不是公网。
- 桌面 1280 与手机 390 的回执、回退和历史显示无横向溢出。本次未改布局、颜色、
  键盘逻辑，沿用此前亮暗四态；当前新运行路径已实际发布和回退。
- 公网生产配置、正式应用发布与生产双端验收仍未执行。后续标签文字改为环境中立
  “发布已审核内容 / 重试分发”，须对最终文件再执行发布门禁。


### 最终代码门禁与数据限制

- 最终 release-check 全部通过（包含目标页 RSC/预取不共享 HTML cache key、环境中立
  操作文案）；650 项全量测试通过，构建通过。CDN 规则只对无 query HTML 使用源站
  缓存头，目标 RSC/预取响应不再获得 public cache 头；其他页面缓存政策不变。
- preflight:full 在真实本地旧恢复库的数据新鲜度检查失败：汇率及采集记录为
  2026-09-17，未伪造时间或覆盖本地数据使门禁变绿。代码/结构验证与实时数据健康
  必须分开报告，生产数据只读核验仍在执行。

生产配置字段（值由环境管理，密钥不写文档）：
`GEOSUB_CONTENT_RUNTIME=production-v1`、`GEOSUB_CONTENT_DISTRIBUTION=cloudflare`、
`GEOSUB_CONTENT_ORIGIN_PORT=3000`、`GEOSUB_CONTENT_CACHE_POLICY=audited-single-url`，
以及已配置的 `GEOSUB_CONTENT_CF_ZONE_ID` / `GEOSUB_CONTENT_CF_API_TOKEN`。
当前仅最后两个字段已写入生产，运行模式和分发开关尚未配置，服务未重启。

生产只读检查确认库主机为 loopback、库名 geosub_app，web 服务 active；健康报告有
2 个发布门禁失败项，需定位并复核后才执行标准升级，不据此直接修改生产数据。


生产门禁失败已定位为此次配置写入的权限回归：环境文件原属 root:geosub，错误设为
0600 使 geosub 用户无法 source。已恢复 root:geosub 0640，仅应用组增加所需读取；
令牌仍未公开。已重新运行被拒绝的采集服务，Logo 检查和完整门禁待复核。本地安装
工具已修正为保留原文件权限，避免再次覆盖服务的访问要求。


### 生产验收完成（2026-10-11）

此前待执行项已完成，最终证据以 [2.11.0 发布记录](release-2.11.0.md) 为准。
生产应用 2.11.0 / 42a1a55；最终内容 C0004 verified，回退 C0003 verified。
Cloudflare 单页规则已补齐 PURGE 方法匹配。C0002 的失败回执保留，不改写为成功。
环境运行模式已启用，生产发布入口 generation 1 已开放；范围仍仅英文 ChatGPT 总览。
后续本页内容迭代使用草稿、预览、独立内容版本与双端回执，无需应用版本升级。

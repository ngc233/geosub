# 中文站自营推广：仓库审计与实施 RFC

日期：2026-10-15。类型：Architecture / L3。
状态：负责人已确认分阶段方案；第一阶段隔离实现已形成。以下审计保留原始时点，最新进展见文末。
需求依据：[用户 PRD v1.0](prd-first-party-promotion-v1-2026-10-15.md)。本文不构成商品审核或生产授权。

## 1. 结论与需要决定的事项

推荐复用 Next.js、现有后台认证、PostgreSQL、Prisma 和审计日志，增加有独立命名空间和权限门禁的小型推广模块。不要直接打开旧 ad_slots，不部署独立 CMS 或广告服务。

关键阻塞：本次生产只读查询取得完整 41 个产品目录，Google One 和 Telegram Premium 均不存在；按 name/slug 模糊查询同样为 0 行。Gemini 是已发布 AI 产品，不能等同于 Google One。现有公开价格读模型只支持 ai、streaming 两类，不能默默把新增产品归入 AI。

需要负责人选择：

- **推荐：先做推广基础能力与首页位置，另两个位置只保留不可绑定的逻辑定义及后台占位预览。** 不创建公开产品 URL；不将此阶段称为三个页面全部完成。两产品作为独立产品接入任务，在具备来源、价格、分类和内容后补齐。
- 另一方案：本项目先增加两个完整价格产品。需明确扩大产品目录/分类/采集/页面内容的范围，制定单独数据与 SEO 验收，再确定两个推广 URL。

这不是商店资料缺失导致暂停。商店域名和商品审核缺失可以用不可点击占位继续隔离开发；这里缺的是 PRD 要求接入的两个真实产品页面，影响阶段 B 的路由、分类、产品身份和验收范围。按 PRD 阶段 B 退出条件，先解决这一架构选择。

## 2. 审计事实与证据

审计基线：`work/content-production-channel`，分支 `release/content-channel-2.11.0`，HEAD `a716b2b310978fc67bdeb6fc24864810934b2138`，应用 2.11.0；开始时工作树干净。未重新拉取远端，不能将本地远端跟踪指针当作实时 GitHub 状态。

| 领域 | 已确认事实 | 仓库位置 |
|---|---|---|
| 应用 | 单仓库，Next 16.3.8 / React 19.2.4 / Prisma 7.9.1；Node >=22 <23；后台与公开站共用应用 | `ai-price-site/package.json`、根 `README.md` |
| 路由 | locale 是实际目录，非通用 `[locale]` 页面；有 `zh` 与 `zh-tw` | `ai-price-site/app/zh/page.tsx`、`app/zh-tw/page.tsx` |
| 首页 | zh 首页调用 HomepageExperience；主要分类区结束后、证据区之前有合适位置 | `app/zh/page.tsx:84`、`components/HomepageExperience.tsx:301-317` |
| 产品 | ai/streaming 的 slug 路由共用 PricingDetailPage；概览与套餐通过 routePlanSlug 区分；不存在产品返回 notFound | `components/PricingDetailPage.tsx:1010-1058`、`lib/db-ai-pricing.ts:51-55` |
| 概览位置 | 套餐概览、相关内容之后、FAQ 前可作为候选插槽；不能因此连带套餐页 | `components/PricingDetailPage.tsx:1176-1194` |
| 缓存 | 首页数据 revalidate 1800；产品页面 revalidate 1800；公开价格 HTTP 缓存 s-maxage=300、stale-while-revalidate=600 | `app/zh/page.tsx:20-31`、`app/zh/ai-pricing/[slug]/page.tsx`、`lib/public-response-cache.ts:3-17` |
| 样式 | 语义颜色/圆角/焦点 token；亮暗主题；组件已有移动适配，不能照搬旧任意色值 | `docs/DESIGN_SYSTEM.md`、`app/globals.css` |
| 认证 | 会话哈希、HttpOnly/SameSite cookie、过期和禁用检查；requireAdmin 只验证登录，不检查业务能力 | `lib/admin-auth.ts:265-330` |
| 角色 | OWNER / EDITOR / VIEWER；现有内容 action 未分离审核与发布能力 | `prisma/schema.prisma:296-328`、`app/admin/content/actions.ts` |
| 持久化 | site_settings、audit_logs；现有内容用事务 advisory lock、generation 和私有 revision 存储 | `prisma/schema.prisma:1032-1046,1226-1243`、`lib/managed-content-store.ts:108-144` |
| 旧广告 | AdSlot 有 provider、code 和泛化 pageType，缺少版本审核、精确产品/语言绑定；生产表有 5 行，未改动 | `prisma/schema.prisma:800-819` |
| 外链 | AffiliateLink 没有版本绑定审核、授权证据和撤销门禁；不适合作为新业务直接启用 | `prisma/schema.prisma:774-797` |
| CMS | 存在 Directus 客户端，但目标页面使用数据库读模型；没核实有运行中的 Directus，不假定可复用外部服务 | `lib/directus.ts`、`components/PricingDetailPage.tsx` |
| CSP | proxy 当前发的是 Content-Security-Policy-Report-Only 响应头；不能声称浏览器强制 CSP 已覆盖推广 | `proxy.ts:43-46`、`lib/content-security-policy.ts` |
| 分析 | 现有同意文案是改善价格页面；通用 events 会持久化匿名 ID、referrer、UA 和 metadata，不满足新事件最小字段要求 | `lib/analytics-consent.ts:30-36`、`app/api/events/route.ts:285-315` |
| 发布 | CI 执行代码、内容、数据库门禁；标准 upgrade/rollback、单独数据恢复；无本任务生产许可 | `.github/workflows/ci.yml`、`docs/RELEASE.md` |

生产核对只执行 `BEGIN READ ONLY; SELECT ...; COMMIT;`，读取产品目录与 ad_slots 数量，不读取用户明细、凭据、广告脚本或实际商店配置。未改库、未构建、未安装依赖、未重启服务。

未确认：线上 CDN 当前完整规则、现有分析数据定期清理执行证据、真实推广目标/经营主体/商品审核、订单汇总来源、负责人、三个页面性能基线、完整数据源权利。没有把历史记录当作本次运行验证。

## 3. 允许范围及不变项

首期 locale 方案为简体 `zh`，不含 `zh-tw`。固定逻辑位置恰好三个：

| 逻辑位置 | 页面身份 | 当前绑定状态 |
|---|---|---|
| zh_home_brand | `/zh`；只允许网站规范化后的同一首页 | 已确认入口，尚未实施 |
| zh_google_one_related | Google One 产品概览，具体 path + product UUID 待产品接入核验 | 未绑定；不能启用 |
| zh_telegram_premium_related | Telegram Premium 产品概览，具体 path + product UUID 待产品接入核验 | 未绑定；不能启用 |

采用产品概览作为建议解释，避免把一个产品的多个套餐页变成多个广告位；最终产品范围决定须体现在绑定记录中。没有真实产品 ID 的位置只能预览，不能以 slug 猜测、通配符或管理员输入路径补齐。

不变：价格数据/排序/极值、标题/H1、canonical/hreflang、JSON-LD、robots、sitemap、公开导航、现有内容发布渠道及已冻结实验页。推广不输出 Offer/Product 声明，不提供支付或交付功能。

## 4. 方案比较与数据设计

| 选择 | 判断 |
|---|---|
| 直接复用旧广告/affiliate 行 | 不选；泛化代码插入和可编辑状态不足以保证审核不可漂移 |
| 新增外部 CMS/配置服务 | 不选；现存客户端不等于服务已接通，增加权限、费用、缓存链路 |
| 现有后台/数据库 + 小型独立模块 | 推荐；复用认证与审计，不复用旧广告投放逻辑 |

配置/活动/审核采用独立 promotion 命名空间的最小新增关系表，理由是需要数据库唯一键、引用完整性和不可变记录，不能只靠可任意改写的 JSON 状态保证审核约束。已有 SiteSetting 可保留展示性设置，不承载可绕过门禁的第二个总开关。

建议实体（实施时遵循 SQL migration-layout 与 Prisma 迁移登记）：

- config：environment、enabled=false、analytics_enabled=false、config_version、updated_by/at。缺行或环境不匹配即关闭。
- placement：固定枚举三项，enabled=false、精确路由/locale/product_id、bound_revision。不得新增第四项。
- campaign + immutable revision：稳定活动 ID，纯文本商户/标题/描述/CTA、冻结落地页、商品来源/交付说明的受控引用、必填 UTC start/end、状态及创建人。首次仅文字卡，不支持图像或 HTML。
- review：revision_id + digest、状态、真实审核人、时间、证据引用、条款日期、有效期、范围和限制。撤销追加历史，不能覆盖回滚后复活；不储存账号密码/身份文件。
- event：唯一 event_id、页面实例及 allowlist 字段；另外以 page_instance/revision/placement 去重有效曝光。原始点击与去重点击分开聚合。
- sales_batch / sales_daily：批次唯一键、日期/时区/币种、已支付/退款/成熟度、来源/更正关系；没有来源不生成模拟数据。

绑定、启用、审核撤销与版本校验在同一事务中完成。事务锁独立于 content-pilot；CAS config_version 防止并发覆盖。审核不仅检查 revision ID，还验证当前摘要与有效期；展示读取同一快照。修改实质字段创建新 revision；风险修改先暂停旧活动。数据库约束拒绝无效范围、空结束时间和 start>=end。

## 5. 权限、安全及审核

能力分离方案：VIEWER 只读；EDITOR 可保存草稿，不能审核/绑定/启用；OWNER 可审核、启用、暂停和紧急关闭。即使 OWNER 也不能审核自己创建的 revision；需要另一名真实授权审核者，缺少时保持 pending。预览、action、读接口和写事务入口均检查服务端能力，不能只隐藏按钮。

复用现有会话，但避免直接把 requireAdmin 当授权完成。写操作使用框架 Server Action 的同源保护并校验输入；若增加 Route Handler 写入口，显式检查 Origin、认证和 CSRF，不依赖 proxy（现有 matcher 排除 api）。后台 preview 同时认证与 noindex，审计失败也应留脱敏结果；不能给日志打印完整请求、证据正文或数据库错误。

URL 规则：只允许事先批准的 HTTPS exact host + port 默认 + exact path + query 键和值范围；禁止 userinfo、fragment、协议相对、IP/本机、双重编码绕过及重定向参数。不提供跳转代理，不自动抓取商店地址，避免引入 SSRF。真实白名单当前为空；预览按钮无 href。商品、落地页可达内容和条款必须由真实负责人审核，Codex 不能充当商品合法性审批人。

## 6. 渲染与 60 秒关闭方案

建议静态/SSR 价格正文保持原状，推广使用初始空的客户端小岛；HTML/RSC 不嵌入真实推广内容或目的链接。仅三个精确页面可挂载，接口再次验证位置 + locale + path + product ID，并输出最小公共 DTO。非目标页面不请求该接口。

公共配置接口 no-store（浏览器和 CDN），不走现有价格 HTML 缓存；无共享跨语言配置缓存。响应必须包含服务端时刻、config_version、受限有效期；请求耗时计入租约。建议 20 秒轮询、30 秒租约、3 秒网络超时：错误、缺失、撤销、到期立即隐藏；旧响应不能覆盖更新版本，迟到响应不能重置为无限有效。visibility/pagehide 隐藏，恢复前台/pageshow 先隐藏再重新取得有效配置。到期时还须在点击前校验本地租约，禁止过期跳转。

这解决旧 HTML 的活动残留，而非依赖清 CDN。离线、JS 不可用及接口不可用均无推广；不影响 SSR 价格和 FAQ。所有访客/搜索引擎使用相同逻辑，不做 crawler 特判投放。

代价：推广异步出现可能产生 CLS；默认不留空白骨架，需真实测量并放在主要内容后。浏览器进程暂停时无法保证物理墙钟每秒执行，恢复时同步隐藏并重验；不得对冻结的进程声称可远程立即移除。

**30/60 秒目前是设计目标，未实测。** 上线前需用源站/CDN旧页面、已打开可见页、离线恢复、bfcache、超时、响应乱序分别计时；若公网规则强制缓存 API，需单独授权修复并复验，否则不允许启用。当前未修改 CDN。

## 7. 分析、隐私与成交

不复用通用 /api/events 的完整事件载荷或身份 cookie。新增最小字段接收端，严格拒绝额外字段、错误枚举/长度、伪造范围和测试环境事件；同源限制、请求大小/频率上限、系统错误日志脱敏。服务器限流技术信息不进入业务指标；若需要 IP 派生限流键，先明确目的/保留和隐私审核。

现有同意不能自动解释为商店推广衡量授权。开发可完成事件契约和隔离测试；生产 analytics_enabled=false，直到新用途被明确纳入同意机制和隐私文本。展示与统计开关分离，拒绝统计不隐藏正常合格推广。

曝光：50% 可见连续 1 秒，document 可见；中断重计时；同一页面实例/位置/版本只记一次。点击：实际激活即记，不要求已有曝光；点击不补造曝光，发送失败不拦截跳转。重试使用原 event_id，服务端唯一键去重。页面实例仅内存，不沿用跨页面身份。内部访问、preview、webdriver 和已知自动化排除，仅称符合口径的事件，不证明是真人。

报告分开显示有效曝光、原始点击、去重点击实例；以已有有效曝光实例中的点击实例计算可解释 CTR，并单列曝光前点击。成交/收入/退款当前均为不可用，不是 0；UTM 不是已接通归因。只接受通过认证的活动级日汇总，批次幂等、更正保留历史、币种不混算、声明时区与退款成熟度。

保留期限提案：原始 30 天、汇总 180 天；需定期清理任务及真实执行验证，当前不是已生效政策。

## 8. 分阶段实施、验收与迁移

1. 当前 A/B：审计 + RFC + 缺失产品范围决策。仅文档差异，不安装、不构建、不改业务代码。
2. 隔离 C：独立本地测试数据库（不得复用生产连接）；新增兼容表和默认关闭配置；OWNER/EDITOR/VIEWER、审核不可漂移、撤销、CAS 冲突与事务失败测试。
3. D：统一文字卡与认证预览；只有获准的真实页面接入。中文标识“自营推广”、商户和独立性说明；rel=sponsored nofollow，blank 时加 noopener。默认无图，长文案可折行，触控 44px。
4. E：事件契约、去重、计时、同意撤回、内部排除、聚合和成交不可用；生产不采集。
5. F：类型/lint/相关自动测试/构建；浏览器 320/375/390/768/1024/1280/1440 亮暗、200% 放大、键盘、无横溢；非目标页面无模块与网络请求；SEO 输出前后对比；性能和关闭时限实测。仅做结构检查不能替代这些验证。
6. G：先有明确 GitHub 推送/代码部署授权，再单独确认生产迁移、真实活动和新增分析启用。当前都不执行。

迁移采用追加表/索引及约束，不改变价格表、旧广告、内容版本或已有分析。旧代码可忽略新增表；回退不 DROP、不恢复旧审核快照，保留撤销。生产 migration manifest 必须在标准部署前评审，不能因 upgrade 自动执行而把部署授权当数据迁移授权。

无现成可靠分流的证据，不承诺 5%/25%。建议按位置逐一启用，负责人接受后执行。稳定启用起算 14 天并设置强制结束时刻；使用前 14 天同星期结构基线，记录样本不足、页面新增和搜索延迟的干扰。LCP +200ms、CLS +0.02、错误 +0.5pp、核心任务 -5%、重复/缺失 >1% 仅为 PRD 建议阈值，待基线和最小样本冻结，不能宣称已验证。

## 9. 回退与交付状态

操作顺序：暂停活动 → 关闭位置 → 全局及分析关闭 → 核对配置接口与已打开页面 → 必要时按既有标准回退代码。不得回滚审核撤销记录。缓存措施是必要时单独授权的补充，不作为租约机制替代。

当前只交付审计与 RFC；没有新系统、数据库表、预览页或功能开关，不能说“已关闭新系统”来暗示已实现。现有业务未改；生产只有只读查询，零业务/配置写入。源码门禁、UI、性能、迁移/回退、60 秒生效时间均未执行，尚不可发布。

下一次实施前先解决第 1 节的产品范围选择。经营主体、域名、商品证据、审核人、隐私用途、实验负责人和生产授权可继续作为独立上线门禁，不以未知事项伪造通过。

## 10. 负责人确认与第一阶段实施更新

2026-10-15 用户明确确认：先做基础能力与首页，两个产品位置保留。前文待决定项已解决，前文“只交付审计”描述的是审计时点。

当前新增中文推广管理和认证预览、版本及追加审核、角色门禁、事务锁及并发代次校验、紧急关闭、首页客户端挂载和 no-store 接口。两个产品位置只允许草稿预览，不创建路由或启用。三个位置采用固定代码枚举；首页位置开关与总配置原子更新，修订和审核使用独立关系表，版本正文为 JSONB。

第一阶段仅接受本机 geosub_promotion_* 专库及 isolated-v1；生产通道尚未开放。真实链接白名单为空，分析由数据库约束强制关闭。候选 SQL 位于 sql/isolated，并拒绝普通或生产数据库；没有登记自动生产迁移。事件、成交和实验实施留在后续阶段。

补充审计：next.config.ts 另有 base-uri、form-action、frame-ancestors、object-src 的强制 CSP 基线；proxy 的完整动态策略仍为 Report-Only，不能把二者混称。

验证和剩余门禁见 [第一阶段验收记录](promotion-foundation-acceptance-2026-10-15.md)。这不是 PRD 全部开发完成或生产发布许可。

## 2026-10-15 发布范围确认：2.12.0 基础功能

用户确认本次只部署基础功能，真实推广保持关闭。生产运行模式为 `GEOSUB_PROMOTION_RUNTIME=foundation-v1`，仅接受 PostgreSQL 的 geosub_app 库。它开放受认证的草稿、预览、审核记录和关闭控制；没有启用入口，服务端拒绝 enable。公开接口在非专用本机预生产模式下直接返回 card:null，不访问数据库；真实落地页白名单为空，分析仍由数据库约束强制关闭。

`preproduction-v1` 仅接受 loopback 主机且库名 geosub_promotion_preprod_*，只允许保留 .invalid 测试域名；不将测试账号、测试数据或该运行配置部署到生产。两个产品位置继续保留。

正式增量迁移登记为 schema:057，只增加推广表、约束和触发器，不回填产品与价格。回退应用时保留推广历史表，撤销记录不能恢复成批准；使用标准 rollback.sh，不以数据库全量恢复作为常规回退。实际投放、真实 CDN 关闭时限、真实商户审核和新增分析均须后续单独验收，不属于本次关闭状态发布。

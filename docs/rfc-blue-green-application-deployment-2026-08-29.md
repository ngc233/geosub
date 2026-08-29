# RFC：GeoSub 蓝绿应用部署

状态：草案；架构方向已确认，实施仍需单独批准

日期：2026-08-29

工作类型：Architecture / L3

代码基线：`cee9892c7d7f07a39443a2b58319aa4e47dc3325`

## 1. 问题

当前 `geosub-backend/deploy/linux-arm64/upgrade.sh` 在数据库备份、拉取源码、安装依赖、Next.js 构建、迁移、Logo 同步、systemd 更新和数据库 smoke check 之前就停止唯一的 `geosub-web.service`。服务随后才恢复，完整 post-deploy check 又发生在恢复流量之后。

数据库部分已经执行“备份 -> SHA256 校验 -> 继续”的谨慎门禁，但应用部分仍然：

- 在单一工作目录原地更新和构建；
- 只有一个固定 `127.0.0.1:3000` Web 实例；
- 候选版本无法在接流量前完成真实进程健康检查；
- 回退需要切换源码并重新构建；
- 失败处理只能尽力重启可能已被修改的工作目录。

这使普通代码发布承担了不必要的整段停机和较慢回退。该问题与内容热发布属于不同失败域，必须使用独立 RFC 和实施窗口。

## 2. 决策

为公开 Next.js Web 应用建立“不可变 release + blue/green 双槽位 + Nginx 配置原子激活与流量收敛验证”的发布方式。

候选版本在旧版本继续服务时完成安装、构建、启动和直连健康检查；只有候选身份与业务门禁全部正确后才切换流量。旧槽位保留到观察窗口结束，可不重新构建直接切回。

该方案把兼容 code-only 发布改为近零停机，并显式处理旧客户端版本偏斜；它不承诺每次交互绝对无重试，也不把数据库或后台任务变更伪装成无风险 OTA。

## 3. 范围

### 3.1 包含

- 不可变应用 release 目录和保留策略。
- blue/green 两个 systemd Web 槽位。
- 两个固定 loopback 端口，初始建议为 3000/3001，实施前核对端口占用。
- 候选槽位的 readiness、release identity 和目标提交验证。
- Nginx upstream include 的校验、原子替换和 reload。
- current/previous release、活动槽位、部署尝试和回退记录。
- release component manifest、数据库兼容契约和 affected-URL manifest。
- `/_next/static` 与构建引用的 public 资产在 CDN 与旧浏览器存活窗口内的多版本兼容。
- 源站与公网分别验证。
- 失败注入和真实切换/回退演练。

### 3.2 非目标

- 不包含内容热发布；由独立 RFC 负责。
- 不包含生产 schema、Prisma migration、SQL backfill、审核规则或批量数据变更。
- 不承诺不兼容数据库变更零停机。
- 第一阶段不把 collector、timer、数据库或 Directus 改成双实例。
- 不扩展到多主机高可用、容器编排、自动扩缩容或跨区域容灾。
- 不因本 RFC 自动购买 Cloudflare 套餐或修改缓存规则。
- 不修改公开 URL、SEO、数据口径、布局或内容。

## 4. 不变项

- 候选构建、启动和验证期间，当前活动实例持续服务。
- 流量切换前必须证明候选进程运行的是目标 commit、build/release ID 和预期工作目录；HTTP 200 不足以放行。
- 普通 code-only 发布默认不执行 schema migration 或 backfill。
- 当前与候选应用必须同时兼容生产数据库。无法双版本兼容的变更进入独立 expand/contract 方案或维护窗口。
- 蓝绿快速路径只接受 release classifier 判定为 Web-only 的变更。worker、systemd、collector、schema、迁移、共享运行库或配置变化必须独立分类；默认拒绝，除非组件 manifest 和兼容契约证明 N/N-1 兼容。
- Web、worker 和 schema 分别记录 deployed commit/build/schema identity，不能用一个仓库 SHA 掩盖不同组件实际运行版本。
- collector、timer 和其他写入型后台任务始终保持单例，不随 Web 双槽位重复启动。
- 不在生产活动工作目录原地安装或构建。
- release 不包含 `.env`、私钥、dump、会话、敏感日志或本地缓存。Next.js 会把 Server Function encryption key 嵌入 build output，因此编译产物本身按敏感服务器 artifact 管理，只允许受控账户读取，不能公开分发。
- 在新流程演练通过并正式批准前，现有 `upgrade.sh` 仍是唯一标准生产升级路径。
- 应用回退不自动恢复数据库。

## 5. 目标架构

### 5.1 目录

建议目标形态：

```text
/opt/geosub/releases/apps/<deployment-id>/
  source-or-artifact/
  release.env
  config.snapshot
  build-evidence/

/opt/geosub/releases/slots/
  blue.env
  green.env
  current.env
  previous.env

/opt/geosub/releases/workers/<deployment-id>/
  worker.env

/var/lib/geosub/
  product-logos/
  app-store-cache/

/etc/geosub/
  secrets.env
  config-snapshots/<config-id>.env
  active-upstream.conf
```

每个 release 一经完成便不可原地修改。运行数据、缓存、Logo、备份和 secret 与 release 目录分离。

### 5.2 Web 槽位

使用 systemd 模板或两个等价 unit 表达 blue/green。每个槽位绑定：

- 唯一 release 目录；
- 唯一 loopback 端口；
- deployment ID、commit 和 build ID；
- 与该 release 绑定的非敏感配置快照，以及受控的 secret 版本引用；
- 只读 Next.js 构建资产和独立可写运行缓存；
- 明确资源上限和启动超时。

双槽位重叠运行时必须在构建阶段使用同一个稳定的 `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`，保证闭包数据可跨实例解密；这不会让不同构建的 Server Action ID 自动兼容。密钥轮换是独立安全窗口，不能与普通切流同时发生。

非敏感 build-time/runtime 配置按 release 版本化并分别计算 hash；secret 不复制到 release，
只记录受控 secret reference/version，绝不记录值。release classifier 必须识别配置变化并证明
N/N-1 进程都能解释该配置。旧进程、重启后的 previous 与 candidate 不得因为共同读取一个
可变 `geosub.env` 而得到不同语义；配置不兼容时拒绝快速路径。

Next.js `deploymentId` 绑定 deployment ID，用于发现旧客户端导航并触发硬导航。对已经 hydration 的 fetch Server Action，请求必须同时满足“`x-deployment-id` 属于已登记且仍受支持的 previous release”以及“该 release 的 Action-ID manifest 含对应 `Next-Action`”才可路由到 previous；只匹配 Action ID 不足以证明协议兼容。缺少、未知或不一致的 hydrated 组合 fail closed，返回可检测的陈旧客户端错误；完整刷新与输入恢复必须由应用明确实现并用真实表单验证，不能假定浏览器自动保留。

Next.js 的 progressive-enhancement/native `<form action={serverAction}>` 可发送没有上述两个 header
的 multipart POST，Action ID 位于表单体。Nginx V1 不解析 multipart body，也不把非幂等 POST
失败后重放到 previous。release classifier 必须盘点所有这类表单，并证明 active 仍能兼容
受支持旧页面的 native Action ID、字段和副作用；无法证明时拒绝蓝绿快速路径，改用维护窗口，
或先把该表单迁移到带显式版本、幂等键和可恢复草稿的稳定 POST endpoint。V1 不得宣称对
任意 no-JS/native 表单自动保留输入。

Action-ID manifest 来自 Next.js 内部构建产物，不视为稳定公开 API。解析器锁定并核验实际
Next.js 版本，保存构建格式版本与 hash，使用真实构建产物做回归测试；格式未知或解析失败时
禁止 previous Action 路由。安全修复发布必须提供 kill switch，可禁用 previous Action、停止
previous 槽位并禁止自动回退到含已知漏洞的 release。

previous hydrated Action 路由只在数据库双版本兼容、共享缓存失效、previous readiness 和持久化 admission fence 全部成立时启用。native multipart 兼容由 release classifier 前置放行，不走 previous header 路由。正常下一次发布不得复用 previous 槽位，直到批准的客户端偏斜窗口结束；紧急连续发布需要新的兼容决策，不能覆盖仍承接旧 Action 的槽位。

### 5.3 流量切换

Nginx 的目标配置默认把新建 GET/HEAD 流量转发到一个活动槽位；观察窗口内只对可识别的 previous Server Action 使用受控旧槽路由。配置文件原子替换只改变 desired bundle，并不瞬间改变运行中 worker：reload 成功后新 worker 加载候选配置，旧 worker 仍会优雅处理已有连接，因此短时间存在 mixed-generation 流量。切换动作由全局部署锁串行化：

1. 生成包含候选 upstream、Action 路由和静态资产 registry 的完整候选配置 bundle。
2. 检查目标端口、release identity 和直连 smoke test。
3. 使用独立临时主配置对候选 bundle 执行 `nginx -t`，不能只测试仍引用旧 include 的当前配置。
4. 在同一文件系统原子替换 active bundle，再对实际配置执行一次 `nginx -t`。
5. reload Nginx，不停止当前活动 Web 实例；分别记录 desired bundle hash、master/new/old worker generation、error log 和通过 opaque release ID 观察到的实际流量命中。
6. reload 或验证失败时原子恢复旧 bundle，重新 `nginx -t` 和 reload，并保留失败证据。
7. 在批准的 drain/观察窗口内循环核对公网 opaque release identity、核心页面和错误率；允许已有连接短暂命中旧 generation，只有新连接稳定收敛且旧 worker 排空后才结束 mixed-generation 状态。

候选失败、配置检查失败或身份不符时，绝不改变活动 upstream。

### 5.4 静态资源

CDN 或长期打开的浏览器可能继续使用切换前的 HTML，而该 HTML 会请求旧 build 的 `/_next/static` hash、`public/brand-assets` 或其他 public URL。当前 BrandIcon 使用 `/brand-assets/thumbs/<slug>.webp?v=<sha256 前 12 位>`，已有 query 级 cache busting；但物理 pathname 仍会被覆盖/删除，也没有 deployment ID 或多版本源站保留。旧 `?v=` 在 CDN miss/回源时仍可能取到新字节或 404，而 `/brand-assets/**` 又使用一年 immutable 缓存。发布流程必须按批准的最大客户端偏斜窗口保留所有仍可能被引用的构建资产，不能只固定保留 current/previous 两版。

实施方案可以是 Nginx 静态资源 fallback、受控共享资产目录或等价机制，但必须：

- 对 `/_next/static` 只服务构建生成的 immutable hash 文件；
- 对构建引用的稳定 public URL 保存内容 hash；在所有引用 release 到期前保留相同字节，或先迁移为内容哈希 URL，禁止同 URL 静默换内容；
- 维护带 deployment ID、build hash 和到期时间的多版本资产 registry；
- 验证 Cloudflare cache key 保留 `?dpl=<deploymentId>`，不会把不同 deployment 的资产错误合并；
- 把 active upstream、Action-ID 路由和资产 registry 作为同一候选配置 bundle 原子激活；
- 防止路径穿越和任意目录暴露；
- 抽查 `/_next/image` 的源 public 文件、优化缓存键与回源可用性，避免候选删除旧图片来源；
- 用旧 HTML + 新 upstream 的真实组合验证 `/_next/static`、brand assets、图片来源均无 404 或内容错配。

不能只因为 chunk 文件名带 hash 就假设新实例拥有旧构建文件。

### 5.5 缓存一致性

Next.js 当前版本的 tag 失效默认只影响接收调用的实例。观察窗口内 previous 仍可能处理旧 Server Action，因此蓝绿 V1 必须使用共享 tag 失效状态，不能把它推迟到未来长期双活。可共享的 canonical data cache 与 tag timestamp 需要统一协调，但渲染后的 HTML/RSC cache 必须按 deployment ID 隔离，避免把旧构建 payload 交给新客户端。HTML 与 RSC 响应必须遵守一致的 `Vary` 和 TTL 规则。

应用切换不等于 CDN 已更新。每个 release 生成不可变 affected-URL manifest；切流和回退都按该 manifest 执行预先决定的边缘缓存策略，并核对源站与公网。布局等站点级变化必须在发布前选择批量精确 URL、prefix purge 或其他已批准策略，不能在故障时临场决定。

蓝绿切流与内容热发布先共享数据库持久化的 public-change lease 和单调
`managed_content_epoch`；它只保护独立内容 RFC 管理的 Title、Description 与 H1，不能声称
已经覆盖价格、汇率、税务或其他公开数据写入。若要把保证扩展为全站 `public_output_epoch`，
collector、FX sync、Directus/admin 写入和批准的 SQL 运维入口必须原子取得同一 lease 或进入
兼容写入协议、递增 epoch 并触发共享缓存失效；无法接入的 SQL 旁路在切流窗口必须冻结。

首次蓝绿生产切流前必须二选一：完成所有公开输出写入方的跨组件接入与并发演练；或在最终
候选刷新至公网验证期间冻结未接入写入方，并明确本次只保证受管内容 epoch。候选取得 lease
后重新同步共享缓存、读取适用范围的 epoch 并验证；只有切换前 epoch 保持不变才允许 reload，
切换后再次核对。未完成全发布者接入时，验收与后台不得宣称价格等公开数据“不会倒退”。

### 5.6 Worker 与运行缓存边界

Web release 和 worker release 使用独立稳定目录、target 与 deployed identity。现有 timer/oneshot 对 `geosub-web.service` 的依赖、固定 WorkingDirectory 和 ExecStart 必须在迁移前逐项盘点；停止 timer 不等于终止已经运行的 oneshot，worker 更新需要独立 drain、锁和发布窗口。

不可变 release 中的 `.next` 构建资产保持只读。Next.js 运行缓存放到 `/var/cache/geosub/web/<deployment-id-or-slot>/` 或经批准的共享 cache handler，由 systemd `ReadOnlyPaths`/`ReadWritePaths` 等权限强制。现有 `GEOSUB_NEXT_DIST_DIR` 只能改变整个 distDir，不能被当成已经完成构建资产与运行缓存分离的证据。

## 6. 发布状态机

```text
prepared
  -> built
  -> candidate_started
  -> candidate_verified
  -> traffic_switching
  -> observing
  -> succeeded

prepared 至 candidate_verified 在未改变生产流量且无法继续时可进入 failed
traffic_switching 只有在证明 candidate 从未被 loaded/observed 且旧流量未变时可进入 failed
traffic_switching/observing 在 candidate 可能已被 observed 时可进入 degraded
observing/degraded 可进入 rolled_back
prepared 至 observing 的任一非终态以及 degraded，在事实不一致或进程中断时可进入 recovery_required
recovery_required 经事实重建与完整验证后可进入 failed（证明未切流）、observing 或 rolled_back
```

部署记录至少包含：deployment ID、目标/前一 commit、组件 manifest、活动/候选槽位、端口、构建 hash、build/runtime config hash、适用范围的 epoch、affected-URL manifest、开始/结束时间、备份证据、健康检查、desired Nginx bundle hash、loaded worker generation、observed traffic、切流时间、公网验证和回退身份。

desired bundle、loaded worker generation、observed traffic 与成功回执分开：原子替换后的 active bundle 只代表期望配置；Nginx master/worker generation 和连接状态代表实际加载；公网响应的 opaque release ID 样本代表观察到的流量；append-only deployment journal 记录每一步意图和结果；`current.env` 只是公网验收后的 promoted-success 回执。部署脚本启动时先协调这些事实与实际监听端口；不一致时进入 `recovery_required`，不得盲目继续或覆盖记录。

`recovery_required` 是独立的阻塞状态，不是 `degraded` 的别名。`prepared` 至
`observing` 的任一非终态以及 `degraded`，在脚本中断、desired bundle、loaded worker
generation、observed traffic、监听端口身份或 journal 互相矛盾时进入该状态；已经写入的 `succeeded`、
`rolled_back` 或 `failed` 终态记录保持不可变，终态后发现的新漂移创建引用原 deployment
ID 的 recovery 记录。

自动 reconciliation 只有在证据闭合时才能离开 `recovery_required`：若证据证明 candidate
从未被加载或公网观察、生产流量始终未变，恢复流程仍必须先原子恢复 previous desired bundle，
用临时主配置和实际配置双重执行 `nginx -t`，必要时 reload，并验证
`desired = loaded = observed previous`；全部成立后才进入 `failed`（no-change failure）。
这防止“候选文件已替换、worker 尚未 reload”留下会在未来 reload 意外生效的配置。若候选
bundle 确为活动流量、候选身份和 readiness 正确，
则进入 `observing` 并重新执行公网观察；若 previous bundle 已恢复且 previous 身份、
readiness、公网和 CDN 均通过，则进入 `rolled_back`。流量事实不明时必须保持
`recovery_required`，不能用 `failed` 结束记录。
该状态下禁止新部署、自动切流和无证据的自动回退；人工恢复也必须取得全局部署锁和
public-change lease、选择目标 bundle、执行候选配置验证与公网核验后，才能进入
`failed`、`observing` 或 `rolled_back`；其中 `failed` 仍必须有“未切流”的完整证据。

若进程在 bundle 激活、reload、公网验证或回执之间中断，恢复流程根据 active bundle、Nginx worker、端口身份和 journal 重建事实；不能只信任 `current.env`。

## 7. 发布流程

### 7.1 Code-only 正常路径

1. 检查批准范围、Git SHA、CI、版本和生产前门禁；release classifier 必须确认 Web-only 范围并生成组件 manifest 与数据库读写兼容契约。
2. 记录活动槽位、当前 release 和 previous rollback point。
3. 创建并校验数据库备份；备份过程不停止 Web 流量。
4. 在新 deployment ID 目录获取已推送的目标提交。
5. 以 geosub 用户执行 `npm ci`、Prisma client generate 和生产构建。
6. 生成来自构建产物的 opaque release identity、Action-ID manifest、全部构建引用资产 manifest、build/runtime config hash 与不可变 artifact；检查敏感文件、目标平台和目录权限。不能只信任运行时可改的环境变量声明身份。
7. 在非活动槽位启动候选实例。
8. 使用真实 `Host`、`X-Forwarded-Proto`、`Origin` 等代理上下文直连候选端口；受 loopback/受控运维身份保护的 internal readiness 核对完整 commit、deployment/build ID、配置 hash、数据库/schema、运行目录、redirect、cookie、canonical、Server Action CSRF 和核心页面。公网 health 只返回状态与不可逆 opaque release ID。
9. 运行受控资源检查，确认旧实例、候选实例和后台任务均健康。
10. 按已批准的全发布者接入或写入冻结策略取得 public-change lease，重新同步共享缓存、核对适用范围的 epoch，验证候选 bundle 后 reload Nginx。
11. 按 affected-URL manifest 执行边缘缓存策略，通过公网 health/response header 的 opaque release ID 验证 observed traffic 收敛，并核对适用范围的 epoch、核心页面、SEO、sitemap、静态资源、后台单例和错误率。
12. 记录成功；旧槽位继续运行到客户端偏斜/观察窗口结束。停止前从 upstream 移除普通流量，发送 SIGTERM 并保留 10-30 秒可配置 drain，验证慢请求、streaming 和 `after()` 回调后再停止进程，但保留 release 与未到期资产。

### 7.2 含数据库变化的路径

本 RFC 不把数据库变化并入普通 code-only 流程。需要 schema 的发布必须先分类：

- additive 且前后版本兼容：独立批准后先 expand，再启动候选版本；
- 需要 backfill：在独立数据窗口执行并验证；
- destructive/contract：候选版本稳定后另开窗口，且在 contract 完成前保留应用回退兼容；
- 无法双版本兼容：使用明确维护窗口，不宣称零停机。

推荐序列：

```text
expand -> 双版本兼容 -> backfill -> 应用切流 -> 观察 -> contract
```

## 8. 迁移计划

1. 只读盘点生产 Nginx 配置、端口、CPU、内存、磁盘、构建峰值、Cloudflare cache key、timer/oneshot 依赖和当前 static/public 资产行为。
2. 拆分 internal readiness 与 public health：前者只允许 loopback/受控运维身份访问完整 commit、目录、schema 和配置 hash；后者只返回状态与不可逆 opaque release ID。先在现有单实例流程验证访问控制。
3. 部署兼容过渡版本：配置 deployment ID、稳定 encryption key、版本锁定的 Action-ID manifest 解析、hydrated `x-deployment-id` 联合路由、native form inventory/classifier、kill switch、共享 cache handler 和可恢复的旧客户端处理；等待一个批准的客户端偏斜窗口。
4. 建立 Web/worker/config 组件 classifier、数据库契约检查、版本化非敏感配置、受控 secret 引用、不可变 release 构建脚本、敏感 artifact 权限和保留策略，不改变公网流量。
5. 盘点 collector、FX sync、Directus/admin 与 SQL 运维等公开输出写入方；实施统一 lease/epoch/失效协议，或建立切流冻结门禁并限定 epoch 保证范围。
6. 分离 Web 构建资产与运行缓存，建立独立稳定 worker target，修正 timer/oneshot 依赖但不升级 worker 代码。
7. 建立 blue/green systemd Web 槽位；只让当前槽位接公网普通流量。
8. 启动影子候选槽位，执行只读健康、资源、Action、缓存和多版本静态资源演练。
9. 建立完整 Nginx 配置 bundle、双重 `nginx -t`、原子激活、worker generation/observed traffic reconciliation 与不重新构建的回退命令。
10. 在批准的小窗口完成首次真实切换；旧槽位保持运行并处理受控 previous Action。
11. 完成公网、内容并发、后台单例、崩溃恢复、缓存和回退演练后，才把新脚本设为标准路径并更新 `docs/RELEASE.md`。
12. 后续如需无停机更新 collector/worker，另写后台任务 drain 与单例交接方案。

生产 systemd、Nginx、端口、服务重启或 Cloudflare 状态变更均需要独立批准。本 RFC 文档本身不授权部署。

## 9. 回退计划

### 9.1 应用回退

1. 确认 previous release、Action manifest、资产和数据库仍兼容；若进程已停止，先启动并通过完整 readiness。
2. 取得 public-change lease，按已批准的全发布者接入或写入冻结策略重新同步共享缓存并记录适用范围的 epoch。
3. 生成 previous upstream、Action 路由和资产 registry 的完整候选配置 bundle，并用临时主配置执行 `nginx -t`。
4. 原子激活 bundle，对实际配置再执行 `nginx -t` 并 reload。
5. 按原 affected-URL manifest 执行批准的 CDN 回退策略。
6. 通过 internal readiness 核对完整目标身份，通过公网 opaque release ID 核对 observed traffic，并验证适用范围的 epoch、核心页面、静态资产和错误率。
7. 公网确认 previous 后才写入 rolled_back；不删除失败 release 和证据。

回退不重新安装依赖、不重新构建、不运行数据库恢复。

### 9.2 自动回退限制

以下情况禁止脚本自动切回，必须进入人工数据库/安全流程：

- 已执行不兼容 contract migration；
- previous 版本健康或数据兼容性无法证明；
- Nginx 配置检查失败；
- 回退目标身份与记录不一致；
- 当前故障可能来自共享数据库、secret 或外部依赖，而非候选应用。
- previous release 含已知安全漏洞，或安全发布 kill switch 已禁用 previous Action/回退。

## 10. 验收标准

- 候选构建和启动期间，旧实例持续响应，核心探针无新增 5xx。
- 候选健康失败、commit/build 身份不符或资源不足时，流量绝不切换。
- 连续请求覆盖切换过程，无连接中断或显著错误峰值。
- 切换后 internal readiness 显示目标 commit/deployment/config identity；公网 health/header 只显示与部署记录匹配的 opaque release ID，不暴露 Git SHA、运行目录或 secret 信息。
- 回退不重新构建，并在批准的恢复时限内恢复 previous healthy release。
- CDN 旧 HTML 与受支持 release 的静态资源组合不产生 `/_next/static`、brand assets 或图片来源 404/内容错配。
- 客户端偏斜窗口内的 N-2 或更旧、仍受支持的静态资产按 registry 可访问；过期策略可解释且已演练。
- Web 可以双槽位运行，但 collector、timer、汇率同步、分析聚合和其他写入任务实例数始终为 1。
- 切流前已经打开的旧浏览器在切流后执行 hydrated Server Action：可按 deployment ID + Action manifest 安全路由到 previous，或得到应用已验证的可恢复刷新/重试；稳定 encryption key 未泄露。
- 所有 progressive-enhancement/native multipart Server Action 表单已经盘点；active 对旧表单的 Action ID、字段和副作用兼容测试通过，否则 classifier 拒绝蓝绿快速路径。Nginx 不解析或重放 multipart body，也不声称自动保存任意 no-JS 输入。
- 共享 cache handler 的跨槽位失效和 HTML/RSC `Vary`/TTL 测试通过；回退 previous 不会恢复旧内容。
- 热发布与候选验证/切流并发时，`managed_content_epoch` 不倒退；只有全发布者协议完成后才验证并宣称全站 `public_output_epoch`。
- Nginx reload 期间可观察并解释短暂 mixed-generation；成功状态只在新连接收敛、旧 worker 排空并通过公网样本阈值后写入。
- 发布脚本的正常、候选失败、候选配置失败、reload 失败、切流后失败、previous 不可用、数据库不兼容和每个关键步骤进程终止测试均通过。
- 慢请求、streaming 和待完成 `after()` 回调在 10-30 秒可配置 drain 内完成或按明确超时策略结束。
- 生产构建、核心页面、SEO、sitemap、后台管道、数据库和公网 CDN 验收通过。
- 完成一次真实生产切换和一次真实回退演练后，才允许替换当前标准升级路径。

## 11. 资源与容量门禁

实施前必须记录并验证：

- 旧 Web、候选 Web、构建进程、PostgreSQL、Directus 和后台任务同时存在时的内存峰值；
- CPU、磁盘空间、inode、构建时间和 release 保留成本；
- 两个 Web unit 的 `MemoryMax` 总量与系统安全余量；
- 候选启动、Nginx reload 和旧实例停止时的连接行为。

进入实施批准前必须把请求样本数、5xx 上限、回退 RTO、观察/客户端偏斜窗口、内存安全余量、磁盘余量和资产/release 保留数量写成数值，并定义任一门槛失败时“拒绝切流或立即回退”的动作。

若单机无法安全同时承载旧实例、构建和候选实例，应先采用“经完整供应链门禁批准的外部构建 artifact + 双槽位切换”或扩容，不能通过缩减健康检查或提前停止旧实例伪装成蓝绿。

外部 artifact 必须在受信、隔离且与生产兼容的 Linux ARM64、Node 22 和 Prisma native target builder 上构建，并附目标 commit、构建参数、依赖锁、build/runtime config hash、SHA256、签名/来源证明和组件 manifest。生产 `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` 通过最小权限的短时 secret 注入供构建使用；Next.js 会把它嵌入受控服务器 build output，因此整个 artifact 按 secret 等级保护，但密钥不得额外出现在日志、普通缓存或通用制品中。任务后销毁工作空间与临时凭据。artifact 经加密通道传输，落盘后复核签名/hash，只允许 root/geosub 受控账户读取，并按敏感服务器 artifact 保留和销毁。可信 builder、secret 注入/销毁、传输和权限任一门禁未获批时，外部构建不是可执行回退路径；来自不兼容平台的本地 `.next` 不能上传后直接运行。

## 12. 未决事项

实施前必须用生产只读证据回答：

1. 当前 Nginx upstream、静态资源 location 和 Cloudflare cache key 的准确配置是什么？
2. 单机在真实构建峰值下是否有足够资源同时运行两个 Web 实例？
3. `/_next/static`、brand assets、其他 build-referenced public URL 与 `/_next/image` 来源采用何种多版本 registry/内容哈希方案？
4. 首次观察窗口、最大允许 5xx、回退时限和 release 保留数量是多少？
5. 哪些现有发布步骤属于 Web code-only，哪些必须继续作为数据库或 worker 独立窗口？
6. 生产可接受的旧 Server Action 偏斜窗口多长；快速连续紧急发布如何处置仍活跃的 previous Action？
7. 哪些公开输出写入方已经接入 lease/epoch/共享失效；未接入方在切流窗口如何冻结和审计？
8. 可信 Linux ARM64 builder、短时生产构建 secret、artifact 签名传输与销毁如何实现？
9. 哪些 `<form action={serverAction}>` 仍支持 native multipart；其稳定 endpoint、版本标记、幂等和输入恢复方案是什么？

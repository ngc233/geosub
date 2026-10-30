# 2.12 滚动发布与回退操作边界

本手册属于已批准的大版本发布链路改造。当前只进行本地及隔离预生产验证，不表示获准上线。

## 首次接入（生产发布授权之后）

1. 推送明确提交并通过远端 CI。只读核对当前版本记录、运行构建、干净工作树、磁盘（至少额外 3 GiB）及可同时运行两份应用的内存。不要把开发工作树直接复制进生产运行目录。
2. 从该已获取提交导出 `geosub-backend/deploy/linux-arm64`，执行其中 `install-rolling-control.sh <完整提交>`。安装器再次 fetch、核对提交和版本，只安装 root 管理的正式控制脚本，不修改运行中的 checkout。后续统一使用 `$GEOSUB_RELEASE_DIR/control/upgrade.sh` 与 `rollback.sh`，不再调用旧 checkout 的旧版本脚本。
3. 在受控环境文件设置 `GEOSUB_DEPLOY_MODE=rolling-v1`。配置 `/etc/geosub/rolling.json`（root 所有、不可组写），参考 `rolling.example.json`。生产 OpenResty 使用 host 网络，已有 `/opt/1panel/www` → `/www` 的目录挂载；无需重建共享代理容器。容器名必须现场核对。
4. `GEOSUB_ASSET_DIR=/opt/1panel/www/sites/geosub.org/retained-static` 只存公开静态资源；源码、环境文件、账本、备份仍在非 Web 目录。`proxyAssets` 是容器内的同一公开目录。
5. 备份该站点原代理片段，移到 **不被 `*.conf` 匹配的非 Web 备份目录**。通过原站点已有 `proxy/*.conf` include 载入唯一的受控 route 文件；不得并存两个 `location /`。TLS、ACME、域名和其他站点配置保持原样。按 `rolling-origin.example.conf` 增加只绑定回环地址的检测入口，避免 HTTP→HTTPS 跳转把检查带到公网；脚本拒绝检测请求的重定向。先用旧端口 3000 生成 route 文件，`nginx -t` 通过后运行正式 `adopt-rolling.sh --confirm <当前完整提交>`，确认登记与回读成功。接入失败恢复原片段并重新测试/重载；应用一直保留旧端口运行。
6. 接入是独立的一次性配置窗口。本轮不执行。不能把示例容器名或未审查的站点配置直接投入生产。

## 正式升级

通过 [标准远程入口](operator-release-observation.md) 的 `geosub_ops.py start --kind web-upgrade` 启动；服务器 systemd 内调用 `$GEOSUB_RELEASE_DIR/controllers/<已核实SHA>/upgrade.sh`。不要将升级进程直接绑定 SSH 会话。默认 rolling-v1；缺少已登记运行基线、配置或 systemd 时拒绝。只有未接入滚动模式且明确设置 `maintenance-v1` 才走旧停站流程。已接入后拒绝维护模式，避免更新旧 checkout 而流量仍指向保留构建。

固定候选提交 → 版本和兼容迁移检查 → 独立目录安装/构建 → 静态资源冲突检查与保留 → 关闭内容发布围栏 → 记录并暂停定时器、等待在途任务 → 真实备份及校验 → schema/Prisma 迁移与数据库检查 → 新端口启动与健康检查 → 代理原子切换与回读 → 后台任务目录切换并恢复原定时器状态 → 标准完整健康检查 → 记录版本。

仅 `rolling-migrations.json` 中明确审核的新增 SQL 哈希可用于滚动升级。修改/删除现有迁移、未知新迁移、回填拒绝。更新迁移允许清单必须经过代码审核与旧版兼容验证；它不是自动迁移授权。

`current.env`、`rolling-state.json` 和 `attempts/<ID>/rolling.json` 分别记录成功版本、运行/回退构建和每次操作。进程同时保留当前与上一版；静态资源、历史构建不自动删除。同路径不同资源直接拒绝，不能覆盖。数据库备份仍遵循已有保留策略；缺失备份时拒绝回退。

## 正式回退与失败恢复

`sudo bash "$GEOSUB_RELEASE_DIR/control/rollback.sh" --attempt <成功升级ID> --confirm <同一ID>`。

确认当前运行版本与该升级匹配、备份校验成功、旧构建未变化且内容回退围栏允许后，启动已保留构建并切回。不会 npm 安装、重新构建、删除迁移或恢复数据库。重复、过期和错误确认请求拒绝。

切换失败或切换后健康失败时，自动尝试恢复原入口、任务目录、成功发布记录和之前的定时器状态。恢复失败会明确记为 incomplete；不能盲目重跑。内容发布围栏始终保持关闭，必须在源站/公网及内容回执核验之后另行恢复；不自动重放浏览器表单。

## 缓存与运行限制

- 仅 `/_next/static/` 由保留目录提供 immutable 缓存。后台和健康响应沿用应用 no-store，应用请求不增加代理缓存。
- 公网 Cloudflare 是否命中只能在部署后验证。隔离环境缺少 Cloudflare 响应头是明确警告，不用本地代理模拟公网命中。
- 切换不意味着旧后台表单可以继续提交。可能需要刷新；不得自动重试写操作。
- 不自动清理旧静态资源。磁盘清理需要单独确定旧页面存活时间、CDN 缓存窗口及回退点后实施。
- 单站点配置采用目录挂载。脚本在每次重载前比对代理实际展开配置，拒绝单文件旧 inode 挂载造成的配置不一致。
- 原来源 IP、转发协议/端口与升级连接头保留，避免改变流量统计和登录判断。

## 预生产

正式脚本支持 PostgreSQL 的 Docker（默认）和 native 客户端两种传输。隔离容器只连接专用本机库；生产继续使用 Docker。native 仍运行真实 pg_dump/pg_restore/psql，不跳过备份或迁移。

预生产访问地址与 canonical 可分别配置 `GEOSUB_PUBLIC_SITE_URL` 和 `GEOSUB_CANONICAL_SITE_URL`。sitemap 地址必须属于 canonical 域名，但所有 HTTP 状态检查发往预生产，不能拿线上成功响应冒充候选验收。

## 2026-10-17 生产前兼容修正

生产当前已有已验证的非默认热内容，原脚本一律要求先恢复代码默认内容会阻止应用回退。本版本登记 2.12.0 → 2.11.0 的精确内容读取契约（版本、校验器、存储读取、分发/回读、页面渲染、Prisma 模型、围栏脚本的 SHA-256 组合）。仅组合完整匹配审核清单时允许保留现有热内容并关闭发布围栏后切回；未知、反向、缺文件或字节变化仍走原代码默认限制。手动回退和失败自动恢复使用同一检查，并将策略写入操作账本。此例外不开放发布、不更改内容版本或回执、不允许数据库回退。

### 滚动发布后的手动采集环境

手动验收必须显式设置 `GEOSUB_ENV_FILE=/opt/geosub/releases/task.env`，再调用 live 目录下的正式入口。仅在 shell 中 source task.env 后调用入口是不够的：入口仍可能按默认 GEOSUB_ENV_FILE 重新读取旧配置，回到保留 checkout。

```bash
sudo -u geosub env GEOSUB_ENV_FILE=/opt/geosub/releases/task.env \
  /bin/bash /opt/geosub/releases/live/geosub-backend/deploy/linux-arm64/run-collector-jobs.sh \
  -JobId APPROVED_JOB_UUID -Force -DefaultCountryCodes US -SkipAutoReview
```

此例仅用于已授权的单任务美国区待审核验收。不得将退出0当成采集成功；必须确认实际运行记录、来源、套餐身份、观测审核状态和正式价格数量。没有选中任务也可能退出0。普通定时任务继续使用已安装 systemd 单元中的 task.env，不改调度范围。

## 2.14 组件独立运行补充（取代上文每次必迁移/全量暂停步骤）

当前网站仍由 rolling-state.json / current.env / live 管理。采集器由 collector-state.json / collector-current.env / collector-live 管理；collector-attempts 下保留发布及回退回执。仅 collector-jobs.service 使用 collector.env，其他定时任务使用原 task.env。

网站切换原子更新 web-runtime.json 和 web-runtime.env：前者供报告刷新读取一致的端口与构建，后者为新批次提供网站依赖路径。已运行采集批次固定代码目录，排队批次在取得共享锁后解析最新组件路径。/run/geosub 的锁目录在采集服务结束后保留，避免手动任务与定时任务锁文件 inode 分叉。

首次接入：先完成 2.14 网站滚动更新，确认无数据库输入变更则跳过迁移；后台手动入口随环境接入独立路径。再通过 collector-release.sh 提取同一版本的采集组件。可做采集器独立回退/重发演练，核对网站 PID、启动时间、代理摘要始终不变。

后续：采集器升级只运行 collector-release.sh，网站升级只运行 upgrade.sh。二者共享部署互斥锁，禁止并发改运行指针。采集器无法通过此入口执行数据库迁移；数据库契约不一致时拒绝发布。采集候选准备失败不暂停定时器；在途任务超过 120 秒不强制结束，恢复定时器并拒绝切换。

无迁移网站发布的日志/回执必须明确 skipped；仍执行只读数据库健康和上线账本检查。新增迁移、Prisma schema/清单/迁移器变化进入原迁移路径，不能用手动 skip 标记绕过。

## Claude 双语独立内容：精确回退与应用发布门禁（本地已准备，生产未激活）

部署控制器使用自己随提交保留的 `content-release-fence.cjs`，通过当前应用的 Prisma 运行时访问数据库。不会调用 N-1 应用中只识别 ChatGPT 的旧围栏实现。三个目标是旧 `overview:en:chatgpt`、`overview:zh:claude`、`overview:en:claude`；新目标必须先登记，未知 v2 state/fence 拒绝。

升级完成构建后，先用候选 → 实际保留版本做只读 `check-rollback`，不兼容时在关闭入口/暂停任务/迁移/切换之前拒绝。通过后在共享事务锁 721091101 内原子关闭全部已存在目标、递增各自 generation/epoch 并退休在途 attempt；任一目标不合格不提交部分写入。切换之前和 finalize 再执行 `verify-closed --production` 与 `verify-origin <回环实例地址> --production`。后者在连接级只读权限下检查全部指针、修订 hash、当前完整回执与推广关闭状态；不发布草稿、不改内容版本、不重开入口。失败仍按原操作账本留证，未知结果仍用 geosub_ops status，不重发。

兼容表 v2 每条精确对独立登记保留版本的文件范围、SHA-256 组合及各目标是否能解释事实 token；当前候选文件范围从策略顶层读取。双方文件/版本任一变化、缺文件、反向或未知组合均撤销匹配。历史 v1 对只证明旧 ChatGPT，不据此推断 Claude。对不支持当前模板的保留读者，须先在现应用通过正常内容操作追加 code-default 回退修订并完成真实分发验收，再关闭围栏/切回应用；原 token 修订、旧回执和所有效果/审计保留，不改指针、不删记录。关闭围栏不能把本地 origin_invalidated 升格成 verified。

本地可使用专属 `geosub_release_YYYYMMDD` 回环库执行 `npm run test:content-release` 与 `npm run test:content-store`。新增 CI job `Content rollback and admission safety` 使用相同标准迁移和检查，Git checkout 保留祖先供精确 Git reader 演练；配置已准备不等于远端 CI 已运行。当前登记的候选 → ead5051 本地兼容对只证明读者/追加 schema 兼容，HTTP/CDN 回执是明确 MOCK。为真实新版本准备发布时，仍需版本递增、用最终源文件重算并复验精确候选 → 实际保留版本的组合、标准 release-check/preflight:full、远端 CI、备份/迁移窗口与真实源站/CDN 验收，不能复用开发指纹或合成证据。

Claude 的生产 runtime guard、恢复服务接入和 admission 继续关闭。`verify-closed --production` 会拒绝 Claude 非默认内容；旧 ChatGPT 的 `resume <generation>` 仍需原生产配置和精确 generation，不能借这个命令打开 Claude。059 actor/actor_id 的 SQL 与 Prisma 文件哈希已列入候选的 additive migration 审查表；这不执行生产迁移，也不批准删除历史列、回填身份或数据库恢复。

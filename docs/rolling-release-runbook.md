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

运行 `sudo bash "$GEOSUB_RELEASE_DIR/control/upgrade.sh"`。默认 rolling-v1；缺少已登记运行基线、配置或 systemd 时拒绝。只有未接入滚动模式且明确设置 `maintenance-v1` 才走旧停站流程。已接入后拒绝维护模式，避免更新旧 checkout 而流量仍指向保留构建。

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

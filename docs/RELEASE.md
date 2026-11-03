# GeoSub 发布与回退规范

状态：v2.11 小团队规范基线

生效日期：2026-08-27

## 1. 发布原则

- 本地实现、GitHub 推送和生产部署是三个独立状态。
- 只有用户明确批准时才能推送或部署。
- 文档、测试和仅影响 GitHub CI 的修改不需要部署生产服务器。
- 只有改变生产运行时代码、配置或数据的已推送提交，才进入生产发布判断。
- 生产发布必须来自已推送的明确提交。
- 普通升级使用标准脚本，不手工拼接一组命令绕过备份和健康门禁。
- 数据迁移、批量回填和应用发布是不同变更窗口。

## 2. 版本与范围

- `VERSION`、前后端 `package.json`、两个 `package-lock.json` 的顶层及根包版本必须一致；后台显示前端包版本。
- 每次新的生产发布必须递增应用版本：修复使用 patch，新增能力使用 minor，不兼容变更使用 major。普通开发提交、文档或 CI 提交不需要独立应用版本。
- 版本号用于负责人直观识别线上内容，不能以提交 SHA 代替。每次汇报同时列出版本和 SHA。
- 不能为历史上实际共用的版本补造版本号；使用真实部署时间、提交号和范围补记历史。
- 一个版本只有一个主要主题。
- 发布说明列出提交、范围、不变项、迁移、风险、验证和回退。
- 文档状态不能把“本地完成”写成“已部署”。

## 3. 发布前检查

### 3.1 仓库状态

```bash
git branch --show-current
git rev-parse HEAD
git status --short
git diff --check
```

确认工作树只包含本次范围，不覆盖用户已有改动。

### 3.2 代码门禁

仓库级正式门禁用于准备生产运行时发布，不强制用于 L0 文档或不影响生产运行时的 CI-only 提交：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release-check.ps1
```

该脚本负责版本同步（含锁文件）、脚本语法、仓库卫生、敏感信息、迁移清单、依赖审计、SEO、内容唯一性、类型、Lint、测试和构建。准备发布时可加 `-BaselineRef origin/main` 对比已获取的分支；未传该参数只证明版本同步，不代表已检查生产版本递增。

需要真实数据库的前端完整门禁：

```bash
cd ai-price-site
npm run preflight:full
```

### 3.3 视觉与产品验收

按 `docs/TESTING.md` 完成受影响页面和核心回归页。未完成移动端或暗色验收时不得称为发布候选完全通过。

### 3.4 数据与迁移

- 检查数据库健康、迁移清单和待处理回填。
- 普通发布保持 `GEOSUB_RUN_BACKFILLS=false`。
- 不为让状态看起来整洁而运行无关回填。
- 数据变更需要单独说明影响记录、备份与恢复方式。

## 4. GitHub 推送

- 只暂存本次范围的文件。
- 提交信息描述一个明确问题。
- 推送后核对远端目标分支的提交 SHA。
- 不将 `.env`、私钥、dump、日志、`.next`、`node_modules` 或临时验证文件提交。
- `scripts/publish-release.ps1` 会暂存全部变更；工作树含无关文件时不得直接使用。
- 发布脚本先获取目标分支，再强制检查版本递增；`-SkipChecks` 和 `-NoTag` 不能跳过此检查。已有同名 tag 只能指向同一提交。

## 5. 生产升级

远程操作统一使用仓库 `scripts/geosub_ops.py start/status`，详见 [发布连接与探测流程](operator-release-observation.md)。该入口把执行交给服务器 systemd，连接断开后只查询同一请求，不重发。服务器内部从 2.12 起采用已核验控制目录中的正式 `upgrade.sh`，默认 `rolling-v1`。首次接入、配置、兼容迁移约束与回退步骤见 [滚动发布手册](rolling-release-runbook.md)。生产必须先完成用户授权、推送及远端 CI；本地预生产成功不等于生产已经部署。

滚动升级先固定候选与验证版本，在独立目录完成依赖及构建，再暂停任务、验证备份和兼容迁移。候选健康通过后才切换代理；完整健康检查通过才记录成功版本。旧构建及静态资源保留，回退不重新构建。关闭的内容发布围栏不自动打开。

旧停站升级保留为明确选择的 `GEOSUB_DEPLOY_MODE=maintenance-v1`，不允许缺少滚动配置时静默降级。非兼容迁移和数据恢复不属于滚动发布；仍需独立授权与窗口。

### 5.1 新控制器与操作工具的使用顺序

先按滚动发布手册，从**包含 T03a（候选提交绑定）和 T03（CI 检查）的已审核提交**安装并核验新控制器，再使用该版本的 `scripts/geosub_ops.py` 发起升级。控制器安装仍需满足原有授权、远端 CI 和版本门禁；不能把任意文档提交当作可安装的发布候选。旧网站控制器会忽略 `--commit` 参数，仅更新本地操作工具不能保证服务器发布的就是已检查 CI 的提交。

`--controller-commit` 是服务器已安装且由 `control` 指向的控制器完整 40 位 SHA；`--candidate-commit` 是本次要发布的网站或采集组件完整 40 位 SHA，两者分别核验、记录，不能相互代替。新版工具把候选 SHA 传给控制器的 `--commit`；新版控制器校验实际拉取结果，不一致时拒绝发布。

### 5.2 正常升级示例

下列变量须来自已核验的受控配置。`RELEASE_REQUEST_ID` 为本次操作指定唯一标识；每次新操作使用未占用的回执路径，查询同一操作时保持路径不变。示例不会替代发布授权。

```bash
mkdir -p .ops-evidence
python3 scripts/geosub_ops.py start \
  --host "$GEOSUB_SSH_HOST" --identity "$GEOSUB_SSH_IDENTITY" \
  --known-hosts "$GEOSUB_KNOWN_HOSTS" \
  --controller-commit "$VERIFIED_CONTROLLER_SHA" \
  --kind web-upgrade --candidate-commit "$VERIFIED_CANDIDATE_SHA" \
  --receipt ".ops-evidence/web-${RELEASE_REQUEST_ID}.json"

python3 scripts/geosub_ops.py status \
  --identity "$GEOSUB_SSH_IDENTITY" --known-hosts "$GEOSUB_KNOWN_HOSTS" \
  --receipt ".ops-evidence/web-${RELEASE_REQUEST_ID}.json"
```

采集升级使用独立回执和已核验的采集候选 SHA：

```bash
python3 scripts/geosub_ops.py start \
  --host "$GEOSUB_SSH_HOST" --identity "$GEOSUB_SSH_IDENTITY" \
  --known-hosts "$GEOSUB_KNOWN_HOSTS" \
  --controller-commit "$VERIFIED_CONTROLLER_SHA" \
  --kind collector-upgrade --candidate-commit "$VERIFIED_CANDIDATE_SHA" \
  --receipt ".ops-evidence/collector-${RELEASE_REQUEST_ID}.json"
```

两类升级均在创建回执和 SSH 派发前，通过 GitHub API 确认候选可从仓库 `main` 到达，并要求该候选上名称为 `CI` 的最新一次运行（含重跑）已完成且结论为 `success`，不能选择较早的一次成功。`web-rollback`、`collector-rollback` 不检查 CI；`web-finalize` 仍需候选 SHA，但不重复检查 CI。`status` 只查询已有请求，不重新检查或派发。

### 5.3 CI 查询不可用时的批准例外

只有**已通过 API 确认候选属于 main，随后首次 CI 列表请求因网络不可达或 GitHub HTTP 5xx 失败**时，才可按已取得的批准成对使用 `--allow-unverified-ci --approval-id "$CI_EXCEPTION_APPROVAL_ID"`。批准编号须为实际取得的 `APR-…` 编号；参数本身不产生授权。

以下命令是网站升级的例外替代示例，不是在正常升级之后追加执行的步骤。仅在确认请求尚未派发时使用；已派发或结果未知时仍查询原回执，不能换路径重发。采集升级仅将 kind 改为 `collector-upgrade` 并使用独立回执。

```bash
python3 scripts/geosub_ops.py start \
  --host "$GEOSUB_SSH_HOST" --identity "$GEOSUB_SSH_IDENTITY" \
  --known-hosts "$GEOSUB_KNOWN_HOSTS" \
  --controller-commit "$VERIFIED_CONTROLLER_SHA" \
  --kind web-upgrade --candidate-commit "$VERIFIED_CANDIDATE_SHA" \
  --allow-unverified-ci --approval-id "$CI_EXCEPTION_APPROVAL_ID" \
  --receipt ".ops-evidence/web-ci-exception-${RELEASE_REQUEST_ID}.json"
```

候选不在 main 或无法确认其归属、CI 失败/取消/运行中/排队/查不到、HTTP 3xx/4xx（含 401/403/404/429）、TLS 校验失败、响应异常、分页中断或最终复查失败，均不能用例外放行。完全无法访问 GitHub 时也无法确认 main 归属，因此不放行。回退和 finalize 不接受这两个例外参数。

可通过受控环境提供可选的 `GITHUB_TOKEN`（私有仓库需具备 Actions、Contents 读取权限），不要把令牌写进命令示例、提交或日志。回执的 `ciCheck` 记录候选与 main SHA、运行 ID/编号/attempt、结论、检查时间、是否请求/使用例外及批准编号；使用例外时终端输出醒目警告，无法取得的运行信息保留为 null。CI 门禁拒绝时退出码为 2，不创建回执、不派发 SSH；这与已派发请求的未知状态不同。

## 6. 发布后验证

公网验收使用标准 `geosub_ops.py observe` 保留分阶段日志；观察不完整不能计为成功。至少检查：

- `/api/health` 返回进程、数据库、目录和汇率正常。
- 目标提交记录在 `/opt/geosub/releases/current.env`。
- 首页、分类页、产品页和目标套餐页 HTTP 200。
- title、description、canonical、robots 和 H1 为本次预期。
- sitemap 数量、动态哨兵、正式路径和 HTTP 状态通过。
- 定时器 active/enabled，后台服务没有失败状态。
- 目标用户流程和数据样本正确。
- 后台 `/admin/pipeline` 至少抽样一个 AI 产品和一个流媒体产品，核对采集任务数、最近运行、正式价格数与运营状态彼此一致；已有成功采集和正式价格的产品不得显示“未开始”或“缺采集任务”。
- 后台手动采集入口只能选择与生产调度器相同的 canonical App Store 任务范围，即同时兼容 `ai_pricing`、`streaming_pricing` 与 `job_config.collector_kind=app_store`。

CDN 可能保留短缓存。必须区分源站与公网响应，并在宣布完成前确认公网最终输出。

## 7. SEO 通知

- 只有线上内容和 canonical 核验正确后才提交 IndexNow 或站长平台。
- 只提交本次真实变化的 canonical URL。
- 记录 HTTP 状态和 URL 数量，不输出密钥。
- IndexNow 不代表 Google 已抓取；Google 观察窗口从确认重新抓取后计算。

## 8. 回退

### 8.1 应用回退

使用标准 `rollback.sh`，并提供明确部署 ID 和确认令牌。回退前检查目标提交和备份校验。

应用回退不会自动恢复数据库。前向兼容迁移原则上保留。

### 8.2 数据库恢复

数据库恢复是高风险独立操作。只有生产数据确实损坏、已有新备份并得到明确批准时，才使用 `db-restore.sh ... DROP_AND_RESTORE`。

恢复前停止写入服务；恢复后运行数据库 smoke check 和完整生产健康检查。

### 8.3 SEO 回退

元数据实验通过一个独立提交恢复，保持 URL 和 canonical 稳定。不要用删除页面或批量 noindex 作为第一反应。

## 9. 完成报告

每次生产发布报告至少包括：

- 最终提交 SHA 和版本。
- 推送与部署状态。
- 备份是否成功。
- 构建、迁移和健康检查结果。
- 线上目标页面实际输出。
- 警告、未验证项和观察窗口。
- 可用回退点。

“脚本退出 0”不是唯一完成证据；线上页面和数据必须符合预期。

## 10. 2.14 起：网站与采集组件发布

依据 [组件发布 RFC](rfc-component-release-2026-10-20.md)，仓库版本表示候选包；网站与采集器独立记录实际版本，允许不同。采集发布不修改网站的 current.env，不要求网站跟随组件升级。

- 网站：标准 rolling upgrade。先比较数据库输入；无变更时记录 migration_skipped，跳过 SQL、Prisma 和 baseline 迁移执行，不为此暂停全部定时器或创建迁移备份。首次组件接入只等待采集任务完成以建立共享锁；后续网站更新保留采集组件。存在数据库变更时保留原备份和精确兼容门禁。
- 采集：按第 5.2 节使用 `geosub_ops.py start --kind collector-upgrade --candidate-commit "$VERIFIED_CANDIDATE_SHA"`，其余连接、控制器及回执参数也须完整提供；服务器内部执行器接收 `collector-release.sh upgrade --commit <完整候选SHA>`。必须通过 CI，批准例外仅按第 5.3 节使用。只安装 backend 依赖，不构建网站；候选数据库输入必须与现网站一致。只暂停采集定时器，等待批次和共享锁，不中止采集进程。关闭的定时器保持关闭。
- 采集回退：操作工具使用 `start --kind collector-rollback --attempt <采集发布ID>` 并提供连接、控制器及独立回执参数；工具向服务器内部执行器传递 `rollback --attempt <采集发布ID> --confirm <同一ID>`。校验当前组件、源文件和数据库兼容，恢复保留组件，不回退网站或数据库。
- 无数据库变更的应用回退使用保留构建，不要求该次生成迁移备份；历史迁移发布仍校验原备份。常规定时数据库备份不变。
- 控制目录、网站、采集器的提交必须分别记录。首次将当前网站内采集程序提取成独立目录允许相同提交/版本，之后升级必须递增组件版本。

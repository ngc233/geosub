# T09：四项任务完成心跳与启用清单

类型 Improvement，开发风险 L2；生产安装、凭据配置和启用属于 L3，必须另外批准。此 PR 不合并、不部署、不创建真实监控、不发送真实心跳。

## 1. 已裁定范围与任务书调整

2026-11-05 产品负责人裁定：采用固定审核提交、核验哈希、可重复安装和卸载的独立安装脚本；不修改 rolling-release.mjs、collector-release.mjs。四项任务各用独立 HetrixTools 地址：collector-jobs、db-backup、price-pipeline、exchange-rate-sync。地址只填写在服务器专用环境文件。

**替代原任务书的 OnFailure + Webhook 方案**：原 GEOSUB_OPERATIONS_WEBHOOK_URL 未配置，没有接收端；已有 HetrixTools 邮件告警经过验收。现在只在成功后发送一次 HTTPS GET，超时未收到由外部服务发邮件，恢复收到后发恢复邮件。OnFailure 模板和每日简报 Webhook 本轮暂缓，不改每日简报内容。

代价：不会立即报告退出码；一次失败后若下一轮在超时前成功，可能不告警；DNS/出口网络故障也会造成心跳缺失。它证明任务按时完成，不证明价格准确、价格新鲜或备份可恢复。保留 T08 公网 health 监控和恢复演练。见 [HetrixTools 心跳说明](https://docs.hetrixtools.com/add-a-cron-job-monitor-heartbeat-monitor/)及[可靠性限制](https://docs.hetrixtools.com/why-isnt-a-heartbeat-monitor-as-reliable-as-other-types-of-uptime-monitors/)。

## 2. 成功口径与实现

四个原服务均为 Type=oneshot。独立 installer 只增加具名 `50-geosub-heartbeat.conf` drop-in，追加 ExecStartPost，不覆盖 ExecStart、定时器或已有其他 drop-in。systemd 只在 oneshot 主命令成功结束后执行该钩子；退出 1 不执行。见 [systemd 官方服务文档](https://raw.githubusercontent.com/systemd/systemd/main/man/systemd.service.xml)。

| 任务 | 成功心跳条件 |
| --- | --- |
| collector-jobs | 整轮退出 0；现有调度器发现任一子任务失败会抛错。无到期任务的正常轮次属于调度存活，不证明数据已刷新。 |
| price-pipeline | canonical 采集包装器整轮退出 0；不改变收集、审核、发布或采集锁逻辑。 |
| db-backup | 整轮退出 0，且该次 INVOCATION_ID 的回执证明 dump、行数、checksum、最后完成标记均上传并回读校验成功。未配置 R2、失败或旧版脚本没有回执，均不发送。 |
| exchange-rate-sync | 整轮退出 0，且该次回执证明所有要求币种同步成功。原脚本的 partial 可退出 0；本次保留该行为，但不给 partial 发心跳。PowerShell 与 Node 两条路径都覆盖，dry-run 不记录成功。 |

备份/汇率的成功分支只写不含密钥的本次回执，不直接访问外网。最后由 systemd 钩子读取与本次 invocation 精确一致的回执再发送；失败、旧回执、损坏、权限不符均拒绝。回执和发送尝试记录在每个任务自己的私有 `/run/geosub-heartbeat-<任务>/` 下。

心跳 URL 只从进程环境读取；仅允许官方 HTTPS `sm.hetrixtools.net/hb/?s=…` 形式。URL 通过 stdin 交 curl，不放命令参数；禁用 curlrc、代理、重定向和重试，连接 5 秒、传输 10 秒、整个子进程 12 秒上限。非 2xx、TLS 错误和超时仅记脱敏警告。不输出地址、令牌、服务器响应正文、环境变量或异常堆栈。未知传输结果不重发，同一 invocation 最多尝试一次。

通知程序正常返回，避免把通知错误当成业务错误；现有服务总超时不变，ExecStartPost 的最多约 12 秒开销仍计入总启动期限。业务本身已接近硬超时时可能触发原有服务超时，不能承诺通知没有任何耗时影响。本轮不放宽原超时或改变成功/失败记录。

## 3. 实测调度、耗时和监控参数

2026-11-05 21:47:19（Asia/Shanghai）生产只读核查；统计窗口为此前 30 天，来自 system_task_runs 的聚合值，无业务数据、凭据或配置修改。

| 任务 | 实际调度 | 成功样本 / 全部样本 | 最长成功耗时 | 服务硬上限 |
| --- | --- | --- | --- | --- |
| collector-jobs | 启动后 8 分钟；距上次激活 30 分钟；随机 0–5 分钟；Accuracy 1 分钟 | 1250 / 1272 | 1274.559 秒（21 分 15 秒） | infinity，无硬上限 |
| db-backup | 上海时间每天 02:40；随机 0–20 分钟；Accuracy 1 分钟 | 30 / 31 | 32.109 秒 | 30 分钟 |
| price-pipeline | 上海时间每天 03:35；随机 0–20 分钟；Accuracy 1 分钟 | 29 / 29 | 125.333 秒 | 35 分钟 |
| exchange-rate-sync | 启动后 5 分钟；距上次激活 12 小时；随机 0–10 分钟；Accuracy 1 分钟 | 63 / 63 | 40.874 秒 | 3 分钟 |

备份有一条失败记录的起止跨度为 80,006.78 秒，与服务 30 分钟上限不一致，不能当作真实连续运行时长。本次不修改该记录、不扩展排障；列作后续核查。成功样本仍是 T10 上线前的本机备份，**不包含真实 R2 上传耗时**；启用后 Claude 须复核首次完整上传耗时。

计算原则：周期/日历点 + 最大随机延迟 + 1 分钟 Accuracy + 耗时预算 + 12 秒心跳上限 + 10 分钟余量，向上取整。有限硬上限取其值（大于目前实测）；采集无硬上限，暂取已观测最长成功耗时，不能当作永久上限。

| 监控名称 | HetrixTools 设置 | 计算和告警时间 |
| --- | --- | --- |
| GeoSub collector-jobs | Cron Job，Simple，Timeout **70 分钟** | 30 + 5 + 1 + 21.243 + 0.2 + 10 = 67.443，向上取 70。运行长期超过本次样本时需复核，不能单纯拉长阈值掩盖故障。 |
| GeoSub db-backup | Cron Job，Advanced，`40 2 * * *`，Asia/Shanghai，Grace Period **65 分钟** | 20 + 1 + 30 + 0.2 + 10 = 61.2，向上取 65；正常日约 **03:45** 后未收到则告警。 |
| GeoSub price-pipeline | Cron Job，Advanced，`35 3 * * *`，Asia/Shanghai，Grace Period **70 分钟** | 20 + 1 + 35 + 0.2 + 10 = 66.2，向上取 70；正常日约 **04:45** 后未收到则告警。 |
| GeoSub exchange-rate-sync | Cron Job，Simple，Timeout **750 分钟（12 小时 30 分钟）** | 720 + 10 + 1 + 3 + 0.2 + 10 = 744.2，向上取 750。单调时钟调度不能冒充固定墙钟 cron。 |

上述期限是检测“缺少成功”的等待时间，不是修改服务器任务运行时限。维护、回退、Persistent 补跑、长时间采集锁等待可能触发邮件，应结合实际服务回执调查。

## 4. 产品负责人启用清单

1. 等 Claude 验收本 PR、产品负责人合并；开发者准备精确合并 SHA 的发布及独立安装清单，再由产品负责人分别批准。先完成包含本版备份/汇率回执钩子的标准网站发布，再安装心跳。采集和价格流水线业务未改，不为心跳升级采集组件。未部署钩子时备份/汇率没有成功回执，不能宣称监控已生效。
2. 在已有 HetrixTools 账号打开 **Uptime Monitors → Add Monitor → Heartbeat Monitor → Cron Job**。按上表逐个创建四项；日历任务选择 Advanced 并填上海时区，另两项按 Simple 填 Timeout。选用已验证的产品负责人邮件 Contact List，确认故障及恢复通知已开启。界面不符或额度不足时停下交 Claude 核对，不自行换频道。
3. 为每项保存其独立 Heartbeat URL；四项不得共用地址。仅在服务器专用文件中填写，不贴到聊天、PR、截图或日志，不点击该链接来假装首次成功。服务器是主动访问 HetrixTools，不需为 geosub.org 增加 Cloudflare 入站放行规则；真实出口连通性留待启用验收。
4. 在已获批准的服务器终端，关闭命令跟踪并建立专用文件：

   ```bash
   set +x
   sudo install -d -o root -g root -m 0755 /etc/geosub
   sudo touch /etc/geosub/task-heartbeats.env
   sudo chown root:root /etc/geosub/task-heartbeats.env
   sudo chmod 600 /etc/geosub/task-heartbeats.env
   sudo nano /etc/geosub/task-heartbeats.env
   ```

   在编辑器中填四行，等号后分别粘贴对应的真实地址；不要把尖括号提示保留进去：

   ```text
   GEOSUB_COLLECTOR_HEARTBEAT_URL=<collector-jobs 的地址>
   GEOSUB_BACKUP_HEARTBEAT_URL=<db-backup 的地址>
   GEOSUB_PRICE_PIPELINE_HEARTBEAT_URL=<price-pipeline 的地址>
   GEOSUB_EXCHANGE_RATE_HEARTBEAT_URL=<exchange-rate-sync 的地址>
   ```

   保存并退出。不要运行 cat、printenv、systemctl show Environment，也不要发该文件的截图。此文件由 systemd 读取，不是 shell 脚本；不改、不读取或复制生产 geosub.env。本 PR 附 `task-heartbeats.env.example` 仅含空值。
5. 开发者按下一节执行已批准的独立安装；仅 daemon-reload，不触发任务、不重启现有服务或定时器。若某任务正运行，安装器拒绝，应等正常结束再安排；不要为安装强行停止任务。
6. Claude 等待四项任务各自**真实成功**完成，核对脱敏 journal 中 `Heartbeat accepted: <任务>` 和 HetrixTools 收到时间。备份同时核对 R2 四件套、最后标记、回读结果；不能只看 service success。官方要求首次访问链接后监控才开始，某项尚未首成功时必须明确记为“尚未激活”，不能靠超时邮件兜底。[官方初始化与 cron 说明](https://docs.hetrixtools.com/advanced-cron-job-monitoring/)
7. 确认四项均已激活、通知地址正确。故障/恢复邮件端到端演练只在另获批准后使用临时监控或隔离测试任务，不故意破坏生产任务、不改正式监控。此开发 PR 的本地 HTTPS 测试不等于真实邮件验收。

## 5. 开发者安装、回退与异常处理

安装源必须是审核过的精确提交。安装器从本地 Git 对象取 helper，不拉取网络；核对自身与指定提交一致，并核对负责人清单中的 helper SHA-256。安装到 `/opt/geosub/task-heartbeats/<完整SHA>/task-heartbeat.py`（只读），不修改 control/live/collector-live。

以下 `<…>` 均须由开发者在获批安装清单中替换为精确值，不是可直接照抄执行的生产命令：

```text
sudo python3 <审核过的检出目录>/geosub-backend/deploy/linux-arm64/install-task-heartbeats.py install --source <同一检出目录> --commit <完整40位SHA> --helper-sha256 <审核过的64位SHA256>
```

安装器仅写四个 `.service.d/50-geosub-heartbeat.conf`、固定提交 helper 和私有安装状态。旧文件及权限以原始字节保存于 `/var/lib/geosub/task-heartbeats/`，每次事务留独立回执。安装前验证服务类型及空闲状态；拒绝软链接、非受控目录、权限过宽凭据文件、篡改的已安装文件。重复同一安装只核验，不追加重复钩子。通知文件与备份凭据文件均不被安装器读取或改写。

失败时按事务前状态恢复已知文件并 daemon-reload。中断遗留 transaction.json 时拒绝重装；人工先检查私有状态，再单独决定 `recover`。recover 只恢复本次事务已知的前/后文件状态；发现第三方修改即拒绝覆盖。禁止盲目删除 transaction.json 重试。

卸载使用同一审核脚本的 `uninstall`：恢复初次安装前的具名文件（原来不存在则删除），保留原服务、其他 drop-in、定时器及凭据文件；仅 daemon-reload，不启动任务。发现管理文件漂移则停止。不要用 `rm -rf /etc/systemd/system/...service.d` 卸载，因为其中可能有别人的配置。

后续网站/采集发布会改主 `.service` 文件，但不改本安装器的具名 drop-in；测试执行当前控制器真实单元写入函数和采集 activate/restore 闭包，并在真实 systemd 上验证覆盖主文件、daemon-reload 后钩子仍生效。**应用回退不会卸载独立监控**；若回退到没有备份/汇率回执钩子的旧构建，两项不发送并最终告警，这是拒绝假成功，不应关闭告警掩盖问题。采集/价格流水线仍按真实整轮成功发送。

如果要彻底停用，产品负责人明确批准卸载，再由本人暂停或删除对应 HetrixTools 监控，避免把有意停用误当故障。安装器不会访问 HetrixTools 管理 API 或删除监控。

## 6. 验收与尚未执行项

- Python 行为测试：四路独立/成功一次/未配置不发；缺失、陈旧、损坏、越权和 partial 回执拒绝；URL 白名单、无敏感 argv/日志、HTTP/TLS/超时无重发；安装幂等、哈希绑定、旧文件恢复、权限/符号链接/漂移拒绝、失败与中断恢复。
- Node 行为测试：执行真实 web taskUnits、collector activate/restore 写入代码，验证四个 drop-in 逐字保留；FX 成功、partial、dry-run 与通知错误分支。
- 独立 CI `Task heartbeat safety` 在临时 Linux runner 上运行真实 systemd、四项合成服务及本机 HTTPS 端点；完整执行实际备份上传入口（S3 边界用替身）与实际 PowerShell 汇率脚本（网络/数据库替身）。验证四路成功、exit 1、R2 未配、最后标记失败、partial、旧脚本、主单元更新/回退、未配 URL、HTTP 错误及不泄漏日志；最后卸载并清理测试资源。
- 现有 `Backup restore drill` 继续验证真实隔离 PostgreSQL + 本机 S3 模拟服务。完整 CI 继续验证业务回归；不改受保护 ci.yml。
- **未执行**：生产部署和独立安装、真实心跳地址配置、真实 HetrixTools 四项激活及邮件演练。合并和 CI 通过不等于已上线。

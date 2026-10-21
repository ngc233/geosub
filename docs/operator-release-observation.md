# 发布连接与只读探测标准流程

生效：2026-10-21。类型：Bug，L2（操作工具与发布流程）。

问题：2026-10-20 操作端 Mac 的自动休眠中断了 SSH 与公网探测，旧日志缺少阶段信息，直接在 SSH 会话内运行构建也可能被连接断开终止。40 次历史失败有 36 次与休眠/唤醒相邻，另 4 次未能唯一归因。本规范将修复纳入仓库，不以历史样本宣称网站停站或所有超时已根治。

## 唯一远程入口

从已审核仓库使用 `python3 scripts/geosub_ops.py`（Python >=3.10、OpenSSH、curl >=7.72；macOS 使用系统 caffeinate）。只依赖标准库。SSH 身份、固定 known_hosts 和日志保存在仓库外或被忽略的 `.ops-evidence/`，不提交账号、地址、私钥或日志。

- `start`：在服务器 systemd 中独立启动已安装的 root 控制器；macOS 在连接期间临时防休眠。支持网站/采集升级及显式回退。
- `status`：查询同一请求，严格只读。SSH 断开、未知结果、systemd 超时都不自动重新发布。
- `observe`：有界、低频、只读探测，记录原始失败，不隐式重试，不重启任何服务。

不再使用工作区临时 Python 脚本、旧 checkout 的 upgrade.sh，或 `ssh ... bash upgrade.sh` 作为正式远程发布入口。`control/upgrade.sh`、`rollback.sh`、`collector-release.sh` 是服务器内部执行器，仍负责版本、迁移、互斥、健康与回退门禁；不直接绑到远程终端的生命周期。

### 发布示例（需已批准且 CI 通过）

先按滚动发布手册安装并验证指定控制器。下列值必须来自自己的受控配置；不得复制示例作为真实凭据。

```bash
mkdir -p .ops-evidence
python3 scripts/geosub_ops.py start \
  --host "$GEOSUB_SSH_HOST" --identity "$GEOSUB_SSH_IDENTITY" \
  --known-hosts "$GEOSUB_KNOWN_HOSTS" \
  --controller-commit "$VERIFIED_CONTROLLER_SHA" \
  --kind web-upgrade --receipt .ops-evidence/web-request.json

python3 scripts/geosub_ops.py status \
  --identity "$GEOSUB_SSH_IDENTITY" --known-hosts "$GEOSUB_KNOWN_HOSTS" \
  --receipt .ops-evidence/web-request.json
```

`--controller-commit` 指已安装控制器的完整 SHA；网站候选仍由原 rolling 控制器按受控分支 fetch 并固定，不能把控制器 SHA 冒充最终网站 SHA。发布前核对分支 CI，发布后核对原生回执的目标提交。

采集升级改为 `--kind collector-upgrade --candidate-commit "$VERIFIED_CANDIDATE_SHA"`。网站和采集回退分别用 `web-rollback` / `collector-rollback`，同时提供原生成功升级回执的 `--attempt`；工具将同一 ID 传给原控制器的 attempt/confirm 检查。

首次调用先保存本地请求文件，再向服务器提交，文件存在时拒绝覆盖。服务器在 `operator-requests/<id>/` 独占预留请求，保存参数与完成记录；同一请求只能派发一次。即使预留后断线、systemd 单元已回收或状态未知，也不重新启动。

退出码：0 = 原控制器退出成功并保存完成记录；1 = 已有明确失败记录；2 = 输入/连接错误；3 = 已提交、运行中或未知。2/3 **均不代表发布失败或成功**，先查询同一 receipt。服务器执行上限 20 分钟、CPU 200%、内存 3500 MiB，沿用本机已验证部署资源边界；超时后查询原生回执，不能盲目重发或强停已有任务。

成功后仍执行 RELEASE.md 要求的生产验收。未知状态需要核对 `systemctl show geosub-op-<id>`、该单元 journal 和 `attempts/<id>/rolling.json` / `collector-attempts/<id>.json`；操作请求 ID 与原生发布 ID 是不同标识。

## 探测与归因

```bash
python3 scripts/geosub_ops.py observe \
  --observer operator-mac --duration 300 --interval 30 \
  --output .ops-evidence/public-UNIQUE_TIMESTAMP.jsonl
```

每轮并发访问健康接口、中文首页和英文 ChatGPT Plus，每 30 秒一轮。持续时间允许 15–1800 秒，间隔 15–300 秒；curl 连接超时 8 秒、总超时 15 秒、最大响应 2 MiB，零重试。响应必须 200 且内容匹配；HTTP 200 后正文下载超时仍是失败。输出文件独占创建、0600 权限，禁止覆盖旧样本。

日志包含 start/sample/complete 三种记录。sample 保存唯一 User-Agent 请求 ID、观察点、UTC 起止时间、连接地址、DNS/TCP/TLS/首字节/总耗时、失败阶段、字节数、curl 退出码，以及允许的 CF-Ray/缓存/发布版本/编码头。不记录正文、Cookie、认证头。complete 给出总样本/失败数；没有 complete 或有 observerGap 表示观察不完整，不能算全绿。

在服务器上以同一已审核工具运行 `--observer server-public`，经公网 DNS/Cloudflare 访问；以 `--observer server-origin --resolve 127.0.0.1` 访问本机 TLS 源站。保留域名和证书校验，不使用 `-k`。服务器观察进程也应有独立 systemd 单元及有限 RuntimeMaxSec，不受本机 SSH 断开影响。这两条路径不冒充多个国家的独立监测点。

发生失败时先保存日志：按 sampleId 对齐代理 User-Agent、CF-Ray、源站日志和发布回执；检查观察端休眠、采样空档、代理实际路径。只确认有证据的阶段，不把本机代理故障等同于全站故障，不把源站健康等同于所有公网用户可达。

持续观察只运行 observe / status 和读日志，不触发 start、安装控制器、迁移、回退或重启。已有 4 次历史未定位超时继续标记未定位；新失败保留证据，只有实质变化才通知。

## 验收、迁移与回退

- 本次仅合入操作工具、测试、CI 与手册，应用版本保持 2.14.0，不部署或重启前台。
- 标准 `release-check.ps1` 与 CI 都运行 `test_geosub_ops.py`；覆盖断线未知状态、重复派发防护、持久完成记录、正文超时、内容错误和防休眠释放。
- 已安装控制器保持原样。新入口可调用其标准执行器；它不要求更新生产应用才能使用。
- 原任务工作区的旧发布/探测脚本停用，提示迁移到此入口，防止今后继续使用分叉副本。
- 回退工具改动只回退此提交；不回退网站、数据库或既有发布回执。正在服务器运行的请求必须先核对状态，不能以工具回退为由重发。

# 异地备份与恢复演练（T10）

状态：开发与本地模拟演练方案；合并不等于已启用。类型 Improvement，风险 L3。产品负责人批准开发、模拟测试和草稿 PR；生产安装、启用、真实数据恢复均须另外批准。本次未创建 R2 资源、未使用真实存储凭据、未读取或修改生产 `.env`。

## 1. 决策与只读基线

问题：数据库备份只在生产服务器本机，服务器或磁盘损坏会同时损失数据库和备份。目标是每天保留一个可校验、能在独立环境恢复的异地副本。本机 custom dump、14 天保留、目录检查、SHA-256、镜像目录和既有恢复断言不变；远端保留 30 天。未配置远端时只警告，原本机流程仍成功；配置后上传失败必须退出非零。

2026-11-05 17:10:36（Asia/Shanghai）只读核查：

| 项目 | 实测 |
| --- | --- |
| 最新单份 dump | 219,604,887 字节，约 219.6 MB / 209.43 MiB；三个附属文件合计 703 字节 |
| 每日计划 | 02:40，额外随机延迟 0–20 分钟；Persistent=yes，停机错过后可能补跑 |
| 当日实际 | 02:46:10–02:46:41，success，退出码 0 |
| 本机保留 | 元信息全部为 14 天；每次成功生成备份后按 mtime 清理超过 20,160 分钟的文件，并非整点清理 |
| 本机现存 | 27 份，含附属文件合计 5,222,763,735 字节，约 4.864 GiB |
| 容量估算 | 按当前单份大小 × 每日 1 份 × 30 天，约 6.588 GB；最近 7 个本地日有 12 份，若全部上传则约 11.294 GB / 30 天 |
| 可用传输工具 | 生产 curl 8.14.1；实现使用现有 curl + Python 标准库，不新增生产 SDK |

估算没有计入未来数据库增长、手工备份、未完成组和生命周期删除延迟，不能据此承诺免费。启用后观察实际对象量再调整预算。只读统计只读文件属性、元信息白名单、定时器状态和脚本源代码，没有读取数据库内容或凭据。

**一致性核查与已批准修正**：旧脚本先运行 `pg_dump`，再开启另一个连接统计行数，两者不是同一快照；期间提交的新增/删除可能导致恢复后行数不匹配。这是源码确认的风险，不代表已经证明线上某份备份损坏。产品负责人已批准“同一快照方案，并增加并发写入测试”。现在由一个只读 REPEATABLE READ 事务导出快照，dump 使用 `--snapshot`，计数事务导入同一快照；两者完成后才释放导出事务。任一失败均不发布本地完成元信息，也不开始远端上传。[PostgreSQL 快照说明](https://www.postgresql.org/docs/16/app-pgdump.html)

快照会短期保留旧版本；dump 最长 20 分钟、计数最长 2 分钟，导出事务空闲上限 25 分钟，原 service 总上限 30 分钟不改。大库或慢网络超时会失败，应调查后另行调整，不能跳过校验。

## 2. 完成标记、凭据与失败行为

每组远端路径是 `backups/<备份名>-<dump完整SHA256>/`，四个对象依次为：

1. `<备份名>.dump`，上传后下载回读并比对 SHA-256。
2. `<备份名>.counts.tsv`，同样回读比对。
3. `<备份名>.dump.sha256`，回读比对。
4. `<备份名>.txt`，最后上传并回读；它是完成标记，包含 dump 和行数清单的校验和。

只上传本地四件套校验通过的备份。已有同名同内容对象直接复核，不覆盖；不同内容立即失败。对象写入带 `If-None-Match: *`，支持重试未完成组，也兼容锁定后的不可覆盖行为。脚本不删除远端对象；过期由 R2 生命周期处理。单份 dump 超过 5 GB 会明确失败，本版不做分段上传。

下载按名称的 UTC 时间选择最新完成标记，支持分页；先下载该标记及其关联文件，再核对所有校验和及目录指纹。缺标记的组不参与选择；最新有标记却损坏时停止，不偷偷退回旧备份。下载目录必须原先不存在，未验证文件不会成为最终下载目录。恢复入口额外要求容器名和目标库名都以 `geosub_restore_drill_` 开头，并复用原恢复脚本的表、外键、视图、函数和关键表行数检查。

远端配置只通过进程环境进入程序，不读 AWS 配置、凭据文件或生产 `.env`。原备份脚本读取数据库运行环境的既有行为保留，远端变量在该步骤之前固定。curl 禁用 curlrc、重定向和详细日志，签名凭据从标准输入传入，不进入命令参数；HTTP 错误只记录状态码，不打印响应正文。传输必须 HTTPS，只有本机回环地址允许 HTTP 供模拟测试。[curl SigV4](https://curl.se/docs/manpage.html#--aws-sigv4)

出现 `ERROR` 或非零退出码：保留本机已验证备份，记录时间、备份名和安全错误信息，交开发者调查；不要贴环境变量、完整 systemd 环境或原始云端错误正文。原定时任务包装器会记录失败状态。T09 尚未完成，本任务**没有实现上传失败的主动通知**，需要负责人每日查看结果；后续 T09 接入退出码和任务日志。

## 3. 产品负责人在 Cloudflare 上操作

以下是未来启用清单，不是本 PR 的执行记录。每项勾选后继续；任何界面与说明不一致，停止并给出不含密钥的截图。

- [ ] 确认 Claude 已验收、产品负责人已合并，并另行批准生产安装和启用。由开发者按标准发布流程准备本次精确提交及安装清单，确认实际备份 service 执行的是本版脚本及两个 Python 文件。不要为备份启用重建线上 PostgreSQL，也不要假定网站发布自动更新备份定时器。
- [ ] 登录 Cloudflare，打开 **R2 Object Storage → Overview → Create bucket**，填写独立桶名，例如 `geosub-db-backups`，选择 Standard 类别。保持私有，不启用 r2.dev 公共访问或自定义公网域名。记录桶名与该桶显示的 S3 API endpoint，司法区域特殊桶必须使用对应 endpoint。[建桶说明](https://developers.cloudflare.com/r2/buckets/create-buckets/)
- [ ] 进入桶的 **Settings → Object lifecycle rules → Add rule**，名称 `backup-expire-30d`，前缀 `backups/`，选择删除/Expire objects，天数 **30**，保存。不要选转为 Infrequent Access。生命周期通常在到期后 24 小时内删除，也可能更久；应留容量余量。[生命周期说明](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)
- [ ] **推荐开启 Bucket Lock**：同一 Settings 页的 **Bucket lock rules → Add rule**，名称 `backup-lock-30d`，前缀同为 `backups/`，保留时长 **30 天**，保存。不要误选永久保留。锁优先于生命周期；对象各自满 30 天、锁解除后才可被生命周期删除。四个对象上传时间不同，临近到期可能短暂出现不完整组，下载会拒绝校验失败的组。[桶锁说明](https://developers.cloudflare.com/r2/buckets/bucket-locks/)
- [ ] 返回 R2 Overview，在 **Account Details → API Tokens → Manage** 创建专用令牌，选择 **Object Read & Write**，范围仅此桶；不要给服务器 Admin 或桶配置权限。保存 Access Key ID 和 Secret Access Key 到负责人自己的密码管理器。Secret 只显示一次；不要截图、粘到聊天/PR/日志，也不要把用于 Cloudflare 管理 API 的令牌值当 S3 Secret。[凭据说明](https://developers.cloudflare.com/r2/api/tokens/)
- [ ] 桶锁由负责人独立管理。对象读写权限本身也能删除对象，锁用于阻止服务器被控制后删除尚在保留期的备份；拥有桶配置权限的账号能修改锁，所以管理员令牌不能放服务器，负责人账号应开启多因素认证。锁不防止攻击者读取备份或写满桶；它不是对管理员账号被控制的绝对保护。

## 4. 产品负责人在服务器填写并启用

只由负责人在自己的服务器终端填写真实值，不交给聊天助手。不要使用 `set -x`、`env`、`printenv` 或显示密钥的排障命令。以下操作在上述单独批准后进行；遇到错误先停下。

1. 由开发者核验安装路径、文件哈希、Python ≥ 3.9、curl ≥ 7.75 和服务调用链。上传会额外暂存一份四件套并下载一份用于回读，临时磁盘至少另留两倍单份备份空间。只给 `geosub-db-backup.service` 配置远端变量；手工/发布流程的备份若没有这些进程变量仍只保留本机，不冒充已异地备份。
2. 在终端逐行输入以下命令，打开**新建的专用文件**（不是生产 `.env`）：

   ```bash
   sudo touch /etc/geosub/backup-remote.env
   sudo chmod 600 /etc/geosub/backup-remote.env
   sudo nano /etc/geosub/backup-remote.env
   ```

   在编辑器中填写下面六行；将占位说明替换为自己保存的值，不要把实际值粘到 shell 命令中：

   ```text
   GEOSUB_BACKUP_REMOTE_URL=s3://你的桶名/backups
   GEOSUB_BACKUP_S3_ENDPOINT=https://你的账户对应的R2端点
   GEOSUB_BACKUP_S3_REGION=auto
   GEOSUB_BACKUP_S3_ACCESS_KEY_ID=你本人的AccessKeyID
   GEOSUB_BACKUP_S3_SECRET_ACCESS_KEY=你本人的SecretAccessKey
   GEOSUB_BACKUP_S3_SESSION_TOKEN=
   ```

   按 Ctrl+O、Enter 保存，Ctrl+X 退出。长期 R2 密钥的 SESSION_TOKEN 留空；只有使用临时 S3 凭据时才填相应 token。此文件由 systemd 注入进程环境，Python 不自行读取它。不改已有数据库环境文件。
3. 运行 `sudo systemctl edit geosub-db-backup.service`，在编辑区加入以下内容并保存退出（若使用 nano，仍是 Ctrl+O、Enter、Ctrl+X）：

   ```ini
   [Service]
   EnvironmentFile=/etc/geosub/backup-remote.env
   ```

   执行 `sudo systemctl daemon-reload`。文件已存在或 drop-in 已有其他配置时保留原内容，不覆盖其他条目。不要为此重启数据库。
4. 等下一次每日备份。若单独批准立即验证，可运行 `sudo systemctl start geosub-db-backup.service` 一次；结果未知时查状态，不重复启动。查询：

   ```bash
   sudo systemctl show geosub-db-backup.service -p Result -p ExecMainStatus -p ExecMainStartTimestamp -p ExecMainExitTimestamp
   sudo journalctl -u geosub-db-backup.service --since today --no-pager
   ```

   预期 `Result=success`、`ExecMainStatus=0`，日志先出现四次 `Remote member verified`，再出现 `Remote backup complete`。出现“remote backup is not configured”只表示本机成功，异地尚未启用。
5. 在 Cloudflare 桶的 Objects 页打开 `backups/` 下最新目录，确认四个对象均存在，`.txt` 时间最后；同时检查 Settings 的两条 30 天规则、私有访问和令牌范围。然后按下一节在独立机器恢复一次。将脱敏时间、备份名、校验结果交 Claude；只有这一步真实验证完成，才能称“异地备份已生效”。本地 Moto 测试不替代 R2 权限、桶锁、生命周期的实际核验。

## 5. 每月独立恢复（负责人操作，Claude 核对）

恢复生产备份到独立机器仍包含敏感生产数据，先取得该次批准；仅在负责人控制的隔离机器执行，不能使用 CI、共享电脑或生产数据库容器。机器需 Docker、Python ≥ 3.9、curl ≥ 7.75、sha256sum、已验收版本仓库和足够磁盘。以下在 **bash** 终端、仓库根目录运行；可逐段复制，段落报错就停。

1. 在 Cloudflare 为演练另建仅此桶 **Object Read** 的凭据。关闭终端录屏/调试输出；用交互输入导入环境，输入的密钥不显示、也不进 shell 历史：

   ```bash
   set +x
   umask 077
   read -r -p '桶名: ' t10_bucket
   export GEOSUB_BACKUP_REMOTE_URL="s3://$t10_bucket/backups"
   read -r -p '该桶的 HTTPS S3 endpoint: ' GEOSUB_BACKUP_S3_ENDPOINT
   read -r -s -p 'Access Key ID（不显示）: ' GEOSUB_BACKUP_S3_ACCESS_KEY_ID
   printf '\n'
   read -r -s -p 'Secret Access Key（不显示）: ' GEOSUB_BACKUP_S3_SECRET_ACCESS_KEY
   printf '\n'
   export GEOSUB_BACKUP_S3_ENDPOINT GEOSUB_BACKUP_S3_ACCESS_KEY_ID GEOSUB_BACKUP_S3_SECRET_ACCESS_KEY
   export GEOSUB_BACKUP_S3_REGION=auto GEOSUB_BACKUP_S3_SESSION_TOKEN=
   ```

2. 创建全新的隔离容器，不映射主机网络端口，不挂任何生产目录。密码临时生成，不显示：

   ```bash
   export GEOSUB_DB_CONTAINER="geosub_restore_drill_$(date -u +%Y%m%dT%H%M%SZ)"
   export GEOSUB_DB_USER=drill GEOSUB_DB_NAME=postgres GEOSUB_ENV_FILE=/dev/null
   export POSTGRES_PASSWORD="$(python3 -c 'import secrets; print(secrets.token_hex(24))')"
   docker run -d --name "$GEOSUB_DB_CONTAINER" -e POSTGRES_PASSWORD -e POSTGRES_USER=drill postgres:16-alpine
   unset POSTGRES_PASSWORD
   ```

   接着执行下面一段等待命令。正常会返回 `1`；若失败，停止，交开发者检查**此演练容器**，不要改用生产容器：

   ```bash
   t10_ready=0
   for t10_attempt in $(seq 1 60); do
     if docker exec "$GEOSUB_DB_CONTAINER" psql -h 127.0.0.1 -U drill -d postgres -Atqc 'SELECT 1' 2>/dev/null; then
       t10_ready=1
       break
     fi
     if [ "$(docker inspect -f '{{.State.Status}}' "$GEOSUB_DB_CONTAINER")" = exited ]; then break; fi
     sleep 1
   done
   test "$t10_ready" = 1
   ```

3. 下载最新完整组并恢复到新库。选择全新目录名称，重复演练不能复用它：

   ```bash
   t10_download="$PWD/t10-drill-$(date -u +%Y%m%dT%H%M%SZ)"
   python3 geosub-backend/deploy/linux-arm64/db-backup-remote.py restore-latest "$t10_download" --database geosub_restore_drill_check
   t10_result=$?
   printf 'restore_exit=%s\n' "$t10_result"
   ```

   成功必须同时看到 `Remote backup downloaded and verified`、`Key-table counts match the backup-time snapshot`、`Restore drill passed`，以及退出码 0。对照 `.txt` 中 `created_at_utc`，人工确认确为最近每日备份；“能恢复”不等于“足够新”。失败只调查，不在生产库尝试恢复，不跳过行数校验。
4. 记录演练日期、仓库提交、备份名、dump SHA-256、开始/结束时间、退出码、关键表行数一致结论，交 Claude 核对。不要提交 dump、行数文件或包含生产业务数据的原始日志。核对后用下面命令只删除本次容器及其匿名卷；下载目录由负责人在文件管理器核对路径后删除，不执行通配删除：

   ```bash
   case "$GEOSUB_DB_CONTAINER" in
     geosub_restore_drill_*) docker rm -fv "$GEOSUB_DB_CONTAINER" ;;
     *) printf '拒绝清理：容器名不符\n' ;;
   esac
   unset GEOSUB_BACKUP_S3_ACCESS_KEY_ID GEOSUB_BACKUP_S3_SECRET_ACCESS_KEY GEOSUB_BACKUP_S3_SESSION_TOKEN
   ```

   在 Cloudflare 撤销本次只读演练凭据，关闭终端。恢复演练只证明备份可恢复；真正故障切换/覆盖生产另立计划和批准。

## 6. 开发验收、迁移与退出方案

本地/CI 运行：

```bash
GEOSUB_RUN_BACKUP_INTEGRATION=1 python3 -m unittest discover -s scripts/tests -p test_backup_remote.py -v
```

使用 PostgreSQL 16 和 Moto 5.1.16 独立容器、随机生成测试凭据；S3 仅绑定 127.0.0.1，测试后清理容器、临时目录，PostgreSQL 数据在 tmpfs。测试先阻塞 dump 的表锁，在已导出快照后提交新事件，再释放锁；断言清单和恢复库都不包含该新事件，源库包含。另测计数失败无完成组、上传最终标记失败、孤立对象被忽略、幂等重试、403/500、损坏备份拒绝、分页和日志不含测试密钥。

[Moto server 文档](https://docs.getmoto.org/en/latest/docs/server_mode.html)及[认证限制](https://docs.getmoto.org/en/latest/docs/iam.html)：本地模拟不宣称验证真实 R2 的认证/锁语义；403 用故障服务器验证拒绝路径。真实账号、权限、Bucket Lock、30 天生命周期与首次生产恢复均 **not verified**，留在启用验收中。

新增独立 `Backup restore drill` 工作流，使用普通 pull_request/push、只读仓库权限、无 secrets；不改受保护的 ci.yml。本 PR 全为普通文件；它不变更当前必需检查设置。

迁移：不做数据库迁移，不自动上传历史 14 天备份。先合并审核通过代码；另行批准安装与填写远端环境；确认首次上传及隔离恢复，再确认每日计划成功。旧备份仍保持原格式，但旧 dump/计数可能不同快照，不应在行数不符时绕过校验。

退出：如果远端持续失败，由负责人决定仅取消新增远端 EnvironmentFile drop-in 的那一行，再 daemon-reload，后续备份回到本机并发出未配置警告；保留原有数据库配置、定时器和所有远端数据/锁。快照机制无需回退数据。若需回退程序，先批准并恢复上一版整组脚本，核验本机备份；不删除任何生产数据。T09 通知与真实 R2 启用不在此开发 PR 中完成。

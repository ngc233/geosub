# 2026-10-20 数据库恢复与防复发决策

类型：Bug；风险：L3（数据库启动行为）。状态：生产恢复完成；启动保护本地实现及隔离测试完成，尚未推送、CI 或生产启用。

## 已核验证据

- 10 月 19 日 23:11:52（北京时间）宿主日志记录 `hypervisor initiated shutdown`；重启后 PostgreSQL 在 23:34 执行 initdb。旧目录消失原因未定，不能据此归责 Directus 或服务商。
- 先保全故障库逻辑和冷物理副本，再用正式脚本将 10 月 19 日 02:52 的备份恢复到隔离库，结构及关键计数通过后恢复生产。恢复后的数据库通过 100 表、147 外键、10 视图、68 函数核验。
- 原应用 2.13.1 未替换。恢复后新备份成功。恢复点至关机约 20 小时 20 分钟的完整增量仍未找回；新采集不能代替缺失历史。
- 最新正式健康报告：0 失败、1 警告。恢复采集任务于 10 月 20 日 01:10:14 完成。恢复批次 260 条观测已处理为 `superseded_by_published_price`，未遗留更新的同币同价待刷新记录；这不表示新增了 260 条正式价格。
- 现有三项终止任务分别为 Perplexity 官网（7 月 23 日）、ChatGPT 官网（7 月 22 日）、ChatGPT 旧 price_check（10 月 18 日）的 403，均 retry_exhausted。保留失败，未反复强制重试，未绕过访问限制。
- 推广 enabled / placement_enabled 均 false。Canva / Notion 维持待审核边界，ChatGPT 内容草稿不发布。

## 4 条过期价格的分类

以下来自数据库留存的商店快照，并非今天重新核验的官方报价。

| 产品 / 地区 / 套餐 | 证据 | 处理 |
| --- | --- | --- |
| ReelShort / FR / subscription | 10 月 18 日快照有 5 个同名 Subscription 不同价格，未标周期 | 保留异常待审；不能选最低价 |
| Viki / VN / standard | 10 月 18 日快照同名 Standard 有 4 个价格，未标周期 | 保留异常待审；不能用 Plus 替代 |
| HeyGen / BR / creator | 10 月 18 日 Creator Monthly 与 Creator Credit Monthly 两种月付名称、不同价格 | 需要产品映射证据，不能凭名称相近合并 |
| Kling / NL / premier | 10 月 12 日留存展示列表无 Premier，仅 Standard / Pro 等 | 保留过期；列表缺席不等于套餐停售 |

## 保护方案及不变项

新增生产专用 compose overlay 和 existing-cluster entrypoint。原开发 bootstrap compose 保留。生产必须使用 overlay；只合并代码不会自动保护已运行容器。

1. 长格式 bind mount 设置 create_host_path=false，路径不存在时拒绝自动建目录。
2. 启动前要求 PG_VERSION=16、global/pg_control、base 都存在。
3. 使用 pg_controldata 对照独立只读身份文件；错误集群即使有 PG_VERSION 也拒绝启动。
4. 不设置允许空库初始化的环境开关。身份文件不得在每次启动时自动生成；否则无法发现换库。
5. 不改价格审核、推广、内容版本或数据模型；不修改 Directus 镜像。

这只能阻止缺失/替换目录后自动建空库，不能替代异机备份，也不能检测同一集群内部误删表。

## 上线、备份与回退

必须在已推送提交和 CI 通过后，于独立数据库维护窗口启用，不能把普通滚动应用升级当作数据库容器升级。

- 先核对真实 docker inspect 挂载、现有 compose 项目与配置、镜像 ID。当前生产与仓库 Directus 镜像存在差异，禁止直接重建整个 compose 项目。
- 新做完整备份、校验、隔离恢复；记录现有容器参数及 PostgreSQL image ID，保护现有恢复证据。
- 固定已核实的绝对 PGDATA 路径；本次不搬迁数据。将经过 CI 的 guard 安装到独立运维目录；身份文件保存在数据目录外，由 root 管理、容器只读挂载。身份值只从已验收现有库 pg_controldata 人工登记，不从疑似空库登记。
- 设置 GEOSUB_POSTGRES_DATA_DIR、GEOSUB_POSTGRES_GUARD_FILE、GEOSUB_POSTGRES_IDENTITY_FILE。私密环境配置不进仓库、不输出 compose 展开后的凭据。
- 先验证合并配置只有一个 PGDATA mount 且 create_host_path=false；使用与现有环境匹配的 compose 参数，仅重建 postgres 服务（--no-deps），不升级镜像，不动 Directus。
- 启用后核对数据库身份、业务结构与价格计数、后台登录、备份/采集/审核、正式健康报告和推广关闭。再观察一次自然调度。
- 回退必须先验证数据目录和身份仍完整，再用留存容器参数恢复原入口。若目录缺失或身份不符，不能简单移除保护启动，必须停止、保全、隔离恢复并另行批准数据恢复。

## 验收状态与后续

已验证：10 个本地 guard 用例；独立无网络、无生产挂载 PostgreSQL 16 容器的正常身份检查、缺失 PG_VERSION 与错误身份拒绝，未执行 initdb；sh 语法与 git diff --check。

初始阶段验收记录：当时仅完成定向测试；后续完整门禁、CI 及生产保护启用见下方补充。认证后的管理员业务操作尚未验证。

需继续获取宿主平台的重启/存储/快照操作记录，并核对是否存在异机或服务商快照。没有证据前保持根因未定。规划异机备份与恢复演练告警；后续已获明确授权并保存一份本机私有灾备副本；尚未建立自动异机备份体系。

## 2026-10-20 正式启用补充

- 最终候选 `ea44ef50e6077c2207cea3933fd4a5b261da90c9`，CI `39295097808` 四项成功。首次 CI 揭示旧版 Compose 在 JSON 中省略 false 字段；修复读取方式后新增真实缺失 bind 目录拒绝测试，并在 CI 与 ARM64 隔离容器通过。
- 新备份 `geosub_app_20261019T172813Z.dump` 已在独立恢复库通过正式结构及关键计数验证。维护窗口另做切换前备份。
- PostgreSQL 启动保护已生产启用。维护流程 38 秒，关键表计数前后相同，结构验收通过；镜像 ID、PGDATA 路径及集群身份均保留。数据库只读挂载已核验发布提交的 guard 与独立身份文件，日志显示跳过初始化。
- 运行配置与原 Compose 不一致的原因是后端 `.env` 缺失；仅从当前容器恢复相同配置到服务器私有文件，未改凭据或导出。私有默认 override 保留生产保护。
- 根因调查新增事实：PGDATA 目录本体的出生时间为 8 月 12 日，内部 PG_VERSION 在事件后重新创建；无法证明目录内容由谁清空。故障前启动周期内核日志未找到 EXT4/I/O 错误，主机无 auditd 历史记录。不能据此排除存储或人为操作。
- 首次正式应用升级因仍有自然采集批次运行而被门禁拦截，尚未迁移或切换应用；旧版继续服务。等待真实终态后重试，不停止采集或清理失败伪造成功。
- 首次异机备份导出被自动审批拒绝；随后用户明确批准敏感数据及本机私有目的地，复制完成且 SHA256 一致，未绕过审批。

### 价格调查的新证据

[ReelShort 法国官方页](https://apps.apple.com/fr/app/reelshort-stream-drama-tv/id1636235979) 当前描述为 7 天、按周续费，但旧目录规范把 subscription 标记 monthly，35 条正式记录关联该计划。采集器仅做币种换算，未找到周转月归一化。需要单独审核周期、历史价格与展示影响；本次未改正式价格。

[Kling 荷兰官方页](https://apps.apple.com/nl/app/kling-ai-ai-image-video-maker/id6738049229) 当前重新展示 Premier 月付 99 EUR，与旧正式值一致；后续仍须走真实采集/审核记录刷新。不能仅凭网页读数手改 last_checked_at。HeyGen 两种月付名称/权益和 Viki 同名多价的映射歧义仍保留。

## 最终生产验收补充

应用 2.13.2 正式重试成功，发布检查 0 失败/1 告警；C4 源站公网回读一致，fence 14 开放，草稿不发布、推广关闭。独立数据库端口变更通过隔离测试与配置差异验证，生产仅监听回环 127.0.0.1:5433，原身份及关键计数保留，Directus 内部 SQL 成功。完整证据及限制见 release-2.13.2.md。

服务器证据：incidents/20261020-db-recovery 内 guard-production-cutover.log、upgrade-2.13.2.log（安全拦截）、upgrade-2.13.2-retry.log（成功）、port-restriction.log、port-restriction/ 下变更前后配置与计数；私密文件不可提交。异机 dump 位于本机 work/private/db-recovery-20261020/offhost-backup，权限 700/600。

安全线索：原 PostgreSQL 日志 84,753 次认证失败，时间跨度 2026-07-05 至 2026-10-19；未发现 connection authorized 或 DROP DATABASE/DROP SCHEMA/TRUNCATE 语句日志，因日志配置限制不能排除成功访问。端口曾公开但要求密码；不能把这一事实直接认定为丢库原因。

最终报告虽发布门禁 0 失败/1 告警，但运行总体 attention：36 个采集积压、5 项缺近期成功（日级 retention/Bing/Google/brief/pipeline）、5 个最新子任务失败（3 官网及恢复点前 Canva/Notion）。Canva/Notion 已 active 排队；不能沿用恢复前成功当作恢复后验收。汇率 36 币种均未超 18 小时，未发现 stale running。保留自然调度跟踪。

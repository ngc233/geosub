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

测试已接入正式 release-check 和 CI。未验证：完整发布门禁、远端 CI、生产 overlay 配置合并与容器重建、认证后的管理员业务操作。因此不能宣布保护已上线。

需继续获取宿主平台的重启/存储/快照操作记录，并核对是否存在异机或服务商快照。没有证据前保持根因未定。规划异机备份与恢复演练告警；本次未配置异机目标，不能宣称已经实现异机容灾。

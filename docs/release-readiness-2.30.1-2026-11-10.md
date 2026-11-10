# 2.30.1 发布准备：V4/V5 与 sitemap 管道检查修复

Bug / L2 发布准备。产品负责人批准合并 #69，并从最新 main 准备、提交、推送 2.30.1 发布 PR、等待完整 CI；未批准合并本发布 PR 或部署。未来生产发布仍是独立 L3 操作。本记录不代表已上线或生产验收通过。

## 基线与本批范围

- #69 已合并，基线 main 为 `1c3ce720464e53fea2adba8679dbc4fdc1c3e7e0`；#69 获审远端提交 `d4887a44519998a6358c83a12c012a0ad08d8cf1` 的 5 个工作流、13 项检查全部首次成功。最终发布 PR 的远端 CI 须另行核验，不借用 #69 的结果。
- 独立分支 `release/2.30.1`。用标准 `prepare-release.ps1 -Version 2.30.1` 同步五个版本文件，VERSION 规范为单换行后计算指纹；不升级依赖。
- 本批继续交付已审核 V4 中文产品页及 V5 非 Plus 中文套餐页：套餐卡/矩阵、最低价与分布、地区筛选、共用币种控件、紧凑说明和合格名义收入的工作时长。额外长说明按已批准方案默认收起，原文和原链接仍在服务端 HTML。
- 保留原价格口径、新鲜度、SEO 元数据及 H1/导语，保留已批准的 V4/V5 链接重组，不把内链变化说成零变化。中文 ChatGPT Plus 与英文继续原分支；首页及最近变价不再改动。
- #69 修复三处 sitemap 检查：grep 完整读取管道，避免提前退出令 printf SIGPIPE；立即读取 PIPESTATUS，区分确实未匹配与执行异常，异常一律失败。pipefail、3 条哨兵、80–192 URL 预算、禁用语言/查询参数、逐 URL HTTP 200、超时和重试均不变。
- 本发布 PR 只改八个标准发布文件：VERSION、前后端 package.json/package-lock.json、CHANGELOG、本记录、rolling-content-compatibility.json。#69 两个实现文件与基线逐字节一致；19 个 isolate 文件不改。无数据库、采集器或服务器配置变更。

## 2.30.0 状态与回退目标

此前 2.30.0 部署未成功，sitemap 门禁失败后恢复到 2.29.1。依据已保留的 2026-11-10 停止回执及后续只读诊断，不把失败的候选或已经合并当成正常上线。本轮没有连接生产重新核实状态。

诊断用真实 sitemap 复现了 grep 提前结束导致的误判；失败瞬间的原始 XML 和 PIPESTATUS 未留存，不能声称已重建当时每一步。#69 的执行测试同时覆盖正向误报、反向误放行与命令执行错误。

优先应用回退目标仍为记录中健康的 2.29.1：`01c32b7edd6d4c8a9319fa5c53840bb01709a500`。部署前须只读核实实际 active/live/current.env、保留构建及控制器；未知 SHA、构建不存在或契约不符即停止。失败的 2.30.0（`42ca770a1ca08cb4aa781538facb7801fa256143`）不新增为回退目标。

回退到核实后的 2.29.1 会恢复改版前的产品/套餐页，保留其已有首页和最近变价修复；不恢复数据库。历史兼容条目不等于所有历史构建都还存在或均可作为推荐回退点。

## 精确兼容与数据库输入

- 注册文件共 35 个，相对基线仅 VERSION 改变，其余 34 个读模型/围栏/渲染依赖逐字节不变。
- 基线指纹：`6ae1b8ae149e0e475df841b74a88db2d24908956d251d4cf67fbd7dc5acc9d3d`。
- 2.30.1 指纹：`ec715a6c56d6c1e80d48488656dd73f8241769c85f1dff25b0b9e9ce99f4bea5`。
- 原 184 条登记逐字段不变，沿用基线 13 条精确关系，仅替换 from/reason/evidence，总计 197 条。retainedCommit、toFiles、targets、facts 和其他限制全部保留，不使用版本范围或通配 SHA。
- 逐一检查 13 个历史读取器真实字节与指纹：正向精确回退通过，反向和篡改读取器均拒绝。包含上述健康 2.29.1 的精确关系；不新增失败的 2.29.0 或 2.30.0。
- 相对基线、记录中的 2.29.1 与 2.28.2，数据库输入均应为 `required=false / database-inputs-unchanged`，未来部署记为 `migration_skipped`。不迁移、不回填、不恢复数据库、不发布采集器。

## 必须安装并核验新控制器

本轮只准备发布，不安装控制器。未来获批准后，必须从**最终已合并且完整 CI 成功的 SHA**导出正式控制器，执行标准 install-rolling-control.sh，并逐文件核对全部 82 个 SHA-256。不能只更新本地工具、直接手改服务器旧策略或放宽门禁。

相对上次记录已安装的 2.30.0 控制器（42ca770a）及记录中的 2.29.1，82 个文件中仅以下三个不同：

| 文件 | 2.30.1 SHA-256 |
| --- | --- |
| post-deploy-check.sh | `0c5324859a26f151e2ef7b4afacb00c3b9c27ce713d038d708e981dfcabc88a6` |
| rolling-release.test.mjs | `f4cefd2297fa7f2edd93fbdbcda87b4945ccd065617569a26ad373909fdf1a2d` |
| rolling-content-compatibility.json | `a99301d78e1045bc15933ff596c2c6a4e843d7c9ed22c344791b9b91ed4c90eb` |

这是本地 Git 字节比较，不能替代服务器安装前后的核验。应用回退和控制器身份分别记录；回退网站不能假定服务器控制器也随之退回。

## 本地验证与限制

- 精确契约正向/反向/篡改检查已通过。真实独立本地 PostgreSQL 内容回退演练 51 项通过，含 9 个历史生产读取器场景，historyPreserved=true；Next cache 和 HTTP/CDN 回执明确为 MOCK，不能冒充生产验证。
- 完整标准 `pwsh -NoProfile -File scripts/release-check.ps1 -BaselineRef origin/main`：已完整通过：版本递增 2.30.0 → 2.30.1、脚本语法、卫生与敏感信息检查、迁移清单、依赖审计、SEO、类型、Lint、前端单测、生产构建和发布安全测试。没有 SkipBuild、跳过门槛或过滤产品。前端 1168 项：1167 pass / 1 既有 PostgreSQL traffic SQL 条件 skip；控制器 42 项：41 pass / 1 既有 Linux flock 平台条件 skip；Python 45 项、版本测试 10 项通过。新增 7 组管道测试无 skip，#69 远端 Linux 已验证控制器 42/42。前端有 8 项既有 moderate，后台 0，本次不升级依赖。
- `preflight:full` **未通过**：本地 CI seed 只有 1 个产品，完整 check:plans 缺少 37 个产品；此前的本地环境、迁移清单和 schema/Prisma 审计通过。串行命令后续 logos/prices/country-pages/sitemap/code 未执行。未导入生产数据、编造产品、放宽断言或为消除提示执行无关回填。
- 首次 Prisma generate 因沙箱无法更新本机工具缓存被拒绝；在获准的本地测试环境重跑成功，没有修改代码或门禁。
- 完整代码构建的通过不能替代失败的完整数据预检。发布 PR 准备完成不等于已具备生产部署条件；仍需部署前完整生产只读数据门禁通过。
- 最终范围、19 个 isolate、五个版本文件、依赖/lockfile 仅版本变化、35 个契约文件仅 VERSION 变化、184 条历史登记不变、全部控制器文件哈希及数据库输入检查均通过。
- UI 实现与已审 main 完全相同；V4/V5 原 build + start 四态、Plus/英文锁页及手机性能证据沿用之前的本地复核，不冒称本轮重新截图或生产验收已完成。
- 日志和哈希保存在仓库外 release-2.30.1-evidence；证据、环境值、凭据、数据库导出不进仓库。远端 CI 在 PR 创建后等待并另记最终 SHA。

## 未来部署前后顺序（不在本次授权内）

最终 main 完整 CI → 只读核实线上身份及保留回退点 → 完整生产只读数据门禁（check:plans 全部产品、check:prices、check:country-pages -- --strict）→ 新控制器安装及全部哈希 → 新唯一请求标准 start/watch/observe → 五分钟观察 → 页面和数据验收。任何失败立即停止；状态未知只查同一回执，不自动重发。

重点检查 V4/V5 四态及 CNY/USD、原始价格口径、收入和分布隐藏条件、手机性能、Plus/英文锁页、首页最近变价、SEO 元数据和 sitemap 逐 URL 前后对照。记录取样与缓存时间，不写缓存强行对齐。本次不部署、不补造生效时间，预览和临时数据库继续保留。

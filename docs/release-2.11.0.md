# 2.11.0 — 英文 ChatGPT 内容独立发布通道

状态：2026-10-11 已推送、部署并完成生产热发布/回退验收。Architecture / L3。

解决内容完善必须与应用版本绑定的问题。范围仅英文 ChatGPT 总览，复用后台认证、
SiteSetting 私有修订和既有页面。内容版本 Cxxxx 独立于应用版本；不改变价格、
套餐身份、URL、索引、canonical、中文 Plus 实验或其他产品。

发布同一事务切换不可变修订、创建尝试并递增缓存代次。Next 缓存失效后核对源站、
精确清理一个 Cloudflare URL、再核对公网，最终持久化成功或失败证据。核对包括
标题、摘要、H1、正文、来源和可见/结构化 FAQ。并发、租约超时、旧结果和重试有界。

生产运行时显式启用且数据库范围固定；新生产状态默认关闭发布入口。应用升级关闭
持久化入口并作废未完成尝试。旧应用回退前必须先成功发布并验证代码默认内容。
首次系统能力部署后才能独立发布内容；此次无 schema migration 或价格回填。

迁移、回退、授权与逐项证据见 rfc-content-pilot-2026-10-11.md。
已验证：release-check 全通过，650 项测试，依赖审计 0 漏洞，GitHub CI 四项全绿。
本地真实浏览器发布/回退与 SSR 全字段校验通过。本地 preflight:full 的旧恢复库
新鲜度未通过，未伪造数据；生产标准健康检查独立通过（0 失败、0 警告）。

生产代码提交 `42a1a5574c2dfff0592f00f0bb42b47479e7c1ef`，系统版本 2.11.0。
成功部署尝试 `20261011T101135Z`，备份 `geosub_app_20261011T101137Z.dump` 已验证。
首次尝试 `20261011T100325Z` 的备份保留，前一应用提交 `9fa42f9`（2.10.5）。
首次部署被并发采集新增的 75 条同价观测门禁阻止，采集结束后标准重跑成功；未跳过门禁。
环境文件权限回归已恢复为 root:geosub 0640，采集与聚合恢复，Logo 35/35 通过。

生产内容验收：

- C0001 首版发布：源站/公网全字段一致，回执 verified。
- C0002 回退：源站已恢复，公网旧缓存导致三次分发失败，失败证据保留。
- 已修复 Cloudflare 原规则仅匹配 GET/HEAD 导致单 URL purge 不匹配的问题：
  只为 `/en/ai-pricing/chatgpt` 补充 PURGE 方法匹配；其他页面与普通 GET/HEAD 规则不变。
- C0003 重新回退代码默认内容：双端 verified，公网 MISS。
- C0004 重新发布审核内容：双端 verified，公网 MISS；这是最终线上内容版本。
- Mac 独立公网回读再次核验 C0004：title、H1、三种 description、canonical、
  4 段正文、5 个来源、6 个可见及结构化 FAQ、版本与运行代次全部通过。
- 中文 Plus 实验页 title、description、canonical 与发布前完全一致。
- 后台抽样 ChatGPT 与 Anghami：采集成功、任务数和正式价格均正常显示；仍存在
  被隔离的价格异常（分别 577、9 条待决），本次不自动批准或扩大内容修改范围。

未运行全站缓存清除或 IndexNow；未修改价格、路由、索引状态。未创建 Git 版本 tag；
应用 VERSION、远端提交与生产成功发布记录均为 2.11.0。搜索增长效果尚需后续真实数据观察。

应用回退前须先通过内容通道发布并验证代码默认内容，再按标准 rollback.sh
使用首次部署尝试的 2.10.5 回退点。内容回退本身无需重建或重启应用。

缓存规则依据：
https://developers.cloudflare.com/cache/how-to/purge-cache/purge-by-single-file/#cache-rules-that-match-on-request-properties

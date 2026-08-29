# Apple Music 官方 Web 价格五地区试点

状态：本地实现与生产初始化包待审

日期：2026-08-28

工作类型 / 风险：Feature / L2

## 用户问题

GeoSub 的产品目录还不够完整，但现有通用网页采集器只能保存价格提示，不能可靠地把 Apple Music 的当地价格映射到套餐。直接公开这些提示会把试用、Apple One 或错误货币混入正式价格。

## 范围

- 为 Apple Music 官方网页增加来源专用解析器。
- 第一批只覆盖美国、巴西、土耳其、日本和德国。
- 只识别 Individual、Family、Student 的官方 Web 月付正价。
- 解析完整时写入 `price_observations`，状态固定为 `pending`，平台固定为 `web`，来源固定为 `official_page`。
- 保存官方 URL、最终 URL、HTTP 状态、页面正文 hash 与套餐证据片段。
- 通过现有 `pricing_page` 调度入口和配置键启用，不在调度器中增加 Apple Music 产品分支。

## 不变项

- 不修改 schema、审核函数、App Store 稳定性规则或正式 `region_prices`。
- 不创建公开页面，不修改导航、SEO、sitemap、多语言或设计 token。
- 不把 Apple One、免费试用或 FAQ 重复价格写成套餐价格。
- 本任务不推送、不部署，也不修改生产数据库和生产定时任务。

## 验收标准

- 五个官方地区页各解析出且只解析出 3 个核心套餐，价格和当地货币与页面一致。
- 任一核心套餐缺失、出现多个不同价格、货币不符或页面不可达时，该地区写入 0 条 observation，并返回失败证据。
- 非 dry-run 写入的 observation 均为 `pending + web + list_price`，`converted_usd` 保持空值，不能触发正式价格发布。
- 同一产品、套餐、地区、当地价格和日期默认去重；`Force` 才允许重复观测。
- 解析单元测试、采集器聚焦测试、脚本语法检查和 `git diff --check` 通过。

## 回退与观察

代码回退只需删除来源配置和解析器调度，不涉及 schema 回退。已产生的 pending observation 不会进入公开读模型；如试点失败，可按 parser version 精确归档或删除，但任何生产数据操作仍需另行批准。后续至少连续三次相同的 `raw_price + currency + plan + country` 观测通过后，才能单独设计 Web 稳定性审核规则。

## 生产初始化包

`sql/backfill/053_seed_apple_music_official_web_pilot.sql` 只准备采集前置数据：

- `apple-music` 产品保持 `review`。
- Individual、Family、Student 三个 canonical 月付套餐保持 `review`。
- 注册 `apple-music-official-web` 一级来源。
- 创建 `streaming_pricing + pricing_page` 任务，但初始状态固定为 `paused`。
- 在写入前校验 US、BR、TR、JP、DE 及其 canonical 货币。
- 不写入 `price_observations` 或 `region_prices`，不产生公开页面、SEO 或 sitemap 扩张。

该回填文件进入仓库不等于允许应用生产数据。以后如批准生产窗口，顺序固定为：验证备份、部署包含解析器的提交、单独应用该回填、确认任务仍为 paused、运行无数据库写入的 live dry-run。启用任务和首次写入 pending observation 需要再次明确批准。

如果回填后尚未产生 observation 或 job run，可在备份保护下删除该 paused 任务、来源、三个 review 套餐和 review 产品。若已产生任何证据记录，则不得级联删除；回退方式改为保持产品 review、归档任务并保留证据，后续清理由独立生产数据变更处理。

# RFC：App Store 采集任务可靠性修复

状态：已批准实施
日期：2026-08-26
工作类型：Architecture（包含一个独立调度 Bug 修复）

## 问题

生产快照显示两类确定性故障：

1. `run-collector-jobs.ps1` 只调度 `ai_pricing`，导致启用且已到期的
   `streaming_pricing` 任务永远不进入队列。
2. App Store 采集只要一个地区出现临时错误，就把整个任务计为失败；连续失败后，
   即使其他地区已成功写入，也会把产品任务置为 `retry_exhausted` 并永久停跑。

同时，失败运行只保存汇总错误，没有稳定保存失败国家、页面状态和解析路径，无法可靠复盘。

## 范围

- 让调度器覆盖 `ai_pricing` 与 `streaming_pricing`。
- 保留运行级 `succeeded` / `failed` 语义，在 `raw_payload.collection_outcome`
  中记录 `complete`、`partial_success` 或 `transient_failure`。
- App Store 临时失败保持任务 `active`；前三次使用短退避，之后回到任务正常周期，
  不再因临时地区故障永久隔离整个产品。
- 重试时只请求上一轮临时失败的国家；完整成功后恢复原始国家范围。
- 保存国家级失败代码、计数、HTTP 状态、最终地址和解析器信息。
- 增强 App Store 页面解析与“页面存在但没有可解析内购”的区分。

## 不变项

- 不改变 `price_observations -> review -> region_prices` 的发布链路。
- 不删除或覆盖上一次有效正式价格。
- 不改变公开页面、默认计费平台、价格极值、SEO、URL、设计 token 或布局。
- 不在本次实现中修改生产数据库；生产恢复只在单独批准的发布窗口发生。
- 真正的配置缺失、身份不匹配和未实现采集器仍然进入永久失败。

## 状态与兼容策略

数据库中的运行状态保持现有四值，不新增枚举或约束：

- 完整完成：`status=succeeded`，`collection_outcome=complete`。
- 部分地区成功：`status=failed`，`collection_outcome=partial_success`，任务保持 active。
- 全部地区临时失败：`status=failed`，`collection_outcome=transient_failure`，任务保持 active。
- 永久配置错误：`status=failed`，任务继续隔离。

这样不会把部分结果错误计入“最近完整成功”，也不会触发仅限完整成功的公开产品晋升门禁。

## 迁移计划

本方案不新增表、字段或约束，无 SQL schema 迁移。

应用代码上线后，任务执行器在每轮启动时只恢复满足以下条件的历史任务：

- `collector_kind=app_store`；
- 当前为 `retry_exhausted`；
- 最近错误明确包含 App Store 临时 storefront 失败；
- 配置仍然完整。

恢复动作只把任务改回 active、安排重新执行并保留审计说明，不修改价格记录。

## 回退计划

1. 应用回退到发布前提交。
2. 停止 collector timer，确认没有运行中任务后再回退。
3. 回退不恢复数据库，因为本方案不迁移 schema，也不删除价格。
4. 若需要阻止已恢复任务继续执行，只暂停对应 collector job；不得删除观测或正式价格。

## 验收标准

- Dry-run 能选中至少一个到期的 `streaming_pricing` 任务。
- App Store 部分失败后，运行记录包含失败国家列表和 `partial_success`，任务仍为 active。
- 全部临时失败超过三次后，任务仍为 active，且退避回到正常任务周期。
- 永久配置错误仍被隔离。
- 完整成功清除临时重试国家并恢复原始国家范围。
- 静态页面、浏览器页面和嵌入 JSON 至少有两条解析路径。
- 现有价格、迁移、类型、Lint、测试和发布门禁通过。

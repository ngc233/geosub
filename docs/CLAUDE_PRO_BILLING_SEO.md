# Claude Pro 计费内容优化

2026-09-06 · Improvement / L2 · 本地实现，尚未发布。

用户问题：阅读地区价格表后，仍需分清月付与年付折算价，以及订阅费和 API 使用费的边界。该问题是内容假设，尚无查询词证据证明它导致了多少流量损失。

范围仅为 `/zh/ai-pricing/claude/pro` 和 `/en/ai-pricing/claude/pro`。复用 ProductEditorialSection 加入计费说明和官方依据，复用 FaqSection 展示两条新增 FAQ；可见 FAQ 和 JSON-LD 使用同一 effectiveFaqs。没有新增客户端组件。

不变项：标题、描述、H1、价格数据、路由、canonical、hreflang、robots、sitemap 和其他套餐内容。冻结的 ChatGPT Plus 中文页、Pro 5x 英文页保持不变。AI API 分支继续暂停。

内容只在 Claude Pro、中英文、非空且全部为 iOS 的月付数据上显示，避免未来平台或周期变化后继续描述 App Store 月付。官方计费说明于 2026-09-06 复核，来源链接保留在正文内；不写固定价格、地区数或购买成功保证。

验收：范围与数据边界测试、相关 SEO/内容测试、类型、Lint、生产构建、SEO 与 sitemap 检查；目标页面桌面/手机明暗展示、FAQ 展开和键盘焦点；渲染 HTML 与基线比较元数据和冻结页面，可见 FAQ 对照 JSON-LD。

发布和观察：获得本次推送部署授权后按 RELEASE.md 独立发布并更新应用版本。以实际发布时间建立观察起点；分别观察两页搜索曝光、点击、CTR 和官方说明点击。数据结算完整、抓取确认后再判断变化，不把短期波动归因于文案。回退为撤回本次内容提交，无数据库变更。

## 验收结果

- verified：623 项测试通过；typecheck、Lint、生产构建、check:seo、check:content-uniqueness 通过。最初的测试失败为 FAQ 拼接方式的旧静态断言，已更新并复跑全量测试。
- verified：对照 main 基线构建的六个 HTTP 页面，目标两页 FAQ 从 7 条变为 9 条，可见答案与 JSON-LD 相同；title、description、H1、canonical、hreflang、robots 及非 FAQ 结构化数据完全相同。两个冻结页、Claude 中文概览页和英文 Max 5x 页的正文与结构化数据未变化。
- verified：内置浏览器检查中英文页面在 1280×720、390×844 下的明暗排版，无横向溢出。暗色为当前系统主题；浅色为仅在本机代理中禁用 dark CSS 媒体查询的测试预览，未切换系统主题。中文手机与英文桌面 FAQ 的点击、Enter/Space 展开通过；来源链接 Tab 焦点可见，链接触控区域至少 44px。浏览器记录中未出现警告或错误。
- structurally checked：空数据、未知/年付周期、其他或混合计费平台会隐藏新内容；边界单元测试通过。新增静态内容不引入加载、错误、弹窗或动画状态。
- verified：另在 Chrome 实测中文桌面正文、英文 390px 页面及 API FAQ 的 Enter 展开，无横向溢出，未记录警告或错误。验收跨至 2026-09-07 完成。
- not verified：原生系统浅色、远端 CI、生产发布和增长效果尚未完成。浅色 CSS 测试预览结果不冒充系统主题切换结果。

## 独立发布检查问题

2026-09-07 收尾：用户明确批准分类上限从 96 校准为 98，总上限仍为 148。政策文本、精确政策测试与统一常量已同步，作为独立提交保存。623 项测试、check:seo、typecheck、Lint、生产构建和真实本地隔离数据库 check:sitemap 全部通过，分类 98/98、总量 144/148；新构建 HTTP sitemap 与校准前的 144 条路径完全相同，新增和删除均为 0。以下为已解决问题的历史记录，今日生产回读及推送部署仍未完成。

`check:sitemap` 未通过：套餐页 `98/96`，总 URL `144/148`，重复和暂存语言 URL 均为 0。在新代码和未改动的 main 基线中，使用同一本地隔离数据库均得到相同结果；两边质量门禁均为 `enforce`。本次未调整预算、路由或数据。发布就绪不能标为通过，需单独核对线上当前 sitemap 与套餐晋升记录，确定超限来源后再收尾。

本地证据：工作区 `work/private/claude-pro-billing-seo/` 下的测试、构建、类型、Lint、sitemap 日志和 `page-comparison.json`。本机预览为 `http://127.0.0.1:3109/zh/ai-pricing/claude/pro`，数据来自既有本地隔离数据库，无生产写入。

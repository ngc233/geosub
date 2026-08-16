# GeoSub P0-C 国家页发布体检记录

状态：P0-C1 本地实现和验收完成；未提交、未部署、未操作站长平台
体检时间：2026-08-16 08:30 UTC
价格证据日期：2026-08-16
搜索观察截止：Google 2026-08-12，Bing 2026-08-13

## 1. 发布门禁

每个试点必须同时满足：

- 至少一个已发布 App Store 月付套餐，正式价格全部为 `verified` 且可信分不低于 80。
- 正式价格不超过 14 天，最新可发布观测没有异常。
- 每个套餐都有精确的 `apps.apple.com` 来源链接。
- 美元基准汇率存在，来源明确，抓取时间不超过 18 小时。
- 税务资料可信度为中或高，并且复核状态为 `verified`。
- 存在 Google、Bing 搜索曝光或已通过 A2 的可信本币价格事件。
- 中英文标题、摘要和三段本地决策正文达到独立内容门槛。
- 价格事件页的当前本币价格与已复核事件一致。
- 不存在人工标记的可用性阻断项。

报告命令：

```bash
cd ai-price-site
npm run report:country-pages
```

## 2. 本地结果

本地汇率快照最初停留在 2026-08-14，7 页因此全部被门禁拦截。执行现有汇率同步后，36 个必需币种全部更新，体检结果变为 4 页通过、3 页阻断。

| 国家页 | 套餐 | 精确来源 | 搜索旁证 | 结果 | 剩余阻断 |
| --- | ---: | ---: | --- | --- | --- |
| Claude 韩国 | 3 | 3/3 | Google+Bing，1,339 展示、58 点击 | 本地批准 | 无 |
| Grok 韩国 | 3 | 3/3 | Google+Bing，949 展示、37 点击 | 本地批准 | 无 |
| Grok 泰国 | 3 | 3/3 | Google+Bing，949 展示、37 点击；另有可信价格事件 | 保持关闭 | 税务为 `medium/needs_review` |
| ChatGPT 印度 | 4 | 4/4 | Google+Bing，6,635 展示、158 点击 | 保持关闭 | 税务为 `medium/needs_review` |
| ChatGPT 菲律宾 | 4 | 4/4 | Google+Bing，6,635 展示、158 点击 | 本地批准 | 无 |
| Gemini 日本 | 3 | 3/3 | Google，463 展示、1 点击 | 本地批准 | 无 |
| Netflix 印度 | 3 | 3/3 | Google+Bing，40 展示、1 点击 | 保持关闭 | 税务为 `medium/needs_review`；Basic 新用户可订阅性未确认 |

搜索数据是产品或套餐页的上游需求旁证，不冒充国家关键词搜索量。Claude、Grok 和 ChatGPT 的两个国家页共享各自产品级观察，因此不能把表中展示数解释为每个国家页已经获得的流量。

## 3. 可批准名单

如果进入 P0-C1，建议只从以下 4 个组合中批准，不改变另外 3 页：

1. `/zh/ai-pricing/claude/regions/south-korea` 及对应英文页。
2. `/zh/ai-pricing/grok/regions/south-korea` 及对应英文页。
3. `/zh/ai-pricing/chatgpt/regions/philippines` 及对应英文页。
4. `/zh/ai-pricing/gemini/regions/japan` 及对应英文页。

这里的一个“组合”包含中文和英文两个 URL。若四组全部批准，最多新增 8 个索引 URL，仍需先经过 sitemap 总量预算检查。

## 4. 保留关闭的页面

- Grok 泰国：先核验泰国税务资料，再重新运行体检。
- ChatGPT 印度：先核验印度税务资料，不因搜索量高而绕过数据门槛。
- Netflix 印度：除税务外，必须确认 Basic 是否仍对印度新用户开放；若只允许存量续订，应调整页面套餐范围和正文后再复核。

## 5. P0-C1 本地实现

- 仅批准 Claude 韩国、Grok 韩国、ChatGPT 菲律宾、Gemini 日本 4 个组合。
- 每个组合只开放中文和英文，共 8 个可索引 URL。
- 批准页在本地输出 `index,follow`、自身 canonical，以及 `zh-CN`、`en-US`、`x-default` hreflang。
- Grok 泰国、ChatGPT 印度、Netflix 印度继续输出 `noindex,follow`，不声明 hreflang，也不进入 sitemap。
- sitemap 地区页预算固定为 `8/8`，站点总预算由 `140` 明确调整为 `148`；本地实际为 `146/148`。
- `npm run check:country-pages` 只在“已批准组合重新不达标”时阻断发布；未批准的预览页保持阻断不会妨碍其他合格页面发布。
- `preflight:full` 已接入上述严格门禁。
- 地区页语言菜单只显示真实存在的中文和英文版本，避免其他语言链接到 404。

## 6. 当前没有执行的动作

- 没有向 Google 或 Bing 提交 URL。
- 没有修改生产数据库或服务器。
- 没有提交 Git、推送仓库或部署生产。

下一步是在完整发布回归通过后单独决定是否提交和部署。若部署，观察 14 至 21 天后才决定是否继续扩展。

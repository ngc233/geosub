# V3 首页（Feature / L2）

基线：0eadf845（#48、#49 已合并）；依据任务书 V2 第 7、8.1 节、画布第 3/7/13 块和 2026-11-06 最新裁定。

目标：用户在首页选择订阅，比较同一代表套餐的地区价格，理解数据覆盖和国家节省中位数。
范围：仅中文首页主体；服务端导航过滤隐藏项。复用 V2 组件，不改变英文、Plus 内容、SEO 字段、H1、导语、URL、DATA-1 筛选/缓存策略或生产状态。
产品区块仅 loadHomepageRepresentatives；D1 和国家榜仅完整 loadComparablePrices。无数据整块隐藏；DATA-2 不渲染。国家按套餐等权中位数、保留负数、至少五个套餐；只有四个既有国家页链接。条形使用固定 100% 尺度。

验收：纯计算边界、服务端 HTML、导航隐藏路径、桌面/390px 亮暗、键盘、触控、轮播暂停、减少动态效果、币种失败回退、无 JS、Plus/英文与 main 对比；完整测试、类型、Lint、构建、移动性能。虚构数据仅用于本地测试并显示标记；证据在仓库外。

回退：撤回本任务实现即可，无迁移。本地复核后已获准推送建 PR；远程 CI 全通过后交 Claude，不合并、不部署。

## 数据方法

`homepageStatistics` 对完整 `loadComparablePrices` 结果按产品、国家去重，价格数按行计数，核验时间取有效时间的最大值；空集合不显示统计行。
地图、排行、分类卡只投影 `loadHomepageRepresentatives` 的结果，不回退到其他套餐。排行榜用原始美元值 `(usPrice - lowestUsd) / usPrice` 排序，每个产品一行；分类数字来自这些代表产品。显示币种仅乘已读取且有效的汇率，缺失时明确显示 USD，不新增汇率查询；搜索沿用本页选择。
国家方法：按产品、套餐、平台、周期组成的可比键去重，每套餐一票，`s = 1 - usd / usPrice`；保留负值，至少五个套餐。排序后奇数取中间值，偶数取中间两值均值；便宜个数按原始 `s > 0` 判断。美国不参加国家榜。首页显示前六项，只有 TR/IN/PH/JP 可链接到已有国家页。正数“以上”的显示值向下取一位小数，避免夸大；不足 0.1%、零和负数分别说明。所有条形以 100% 为满量程，不把最高约 14% 拉满。

## 与画布的差异及原因

- 保留原 H1、导语、SEO 字段及结构化数据；画布替换文案未获批准。
- DATA-2 暂不渲染；游戏等未上线分类不添加占位入口，教程使用已有价格指南、支付与账号、方法论。
- 国家榜采用已批准的 D8 中位数和实际数值，替换画布平均值及夸张示例；无现有国家页的卡片不加链接。
- 地图使用仓库已有 world-atlas 数据投影；拿不到真实坐标时只显示价格摘要，不编坐标。桌面地图图形区在暗色下也保留白底，确保最低价、更贵和美国标记符合白色面板的对比度条件，周围框架仍为暗色。
- 国旗复用本地 SVG 及代码降级；旧 CountryFlag 私有于锁定价格表，新建轻量展示组件避免引入或修改该表。
- 本地虚构样本显示醒目标记；生产模式只要检测到 GEOSUB_V3_FIXTURE（包括空值）就立即失败；实际 next build 失败用例已通过。真实测试库没有合格价格时隐藏相关区块。

## 本地验收记录（2026-11-06）

- 单测 1,132 项：1,131 通过、1 项既有跳过、0 失败；类型、Lint、设计检查、SEO 检查、编码检查、生产构建通过。
- 首页浏览器 8/8：桌面/390px 亮暗、键盘、币种切换和缺汇率回退、分类、轮播暂停、减少动态效果、无 JS 价格及统计、搜索币种、横向溢出、隐藏导航 HTML。
- Plus/英文各 1280/390px、亮暗，8/8 与精确 main 基线逐像素一致；正文、全部链接的文字/顺序/href/rel、SEO 信息一致。比较使用相同构建器和依赖；旧 3151 构建的 lab/oklch 转换造成微小色差，已改用 0eadf845 同工具重建，未放宽像素阈值。
- 390px 冷缓存字体共 45,408 字节（Inter Tight 600：22,660；700：22,748），无中文字体下载。
- 同工具生产构建、同一本地测试库的单次 Lighthouse 手机测量：main 91，V3 96；LCP 3,476 → 2,790 ms，CLS 均为 0。测试库合格价格为零，此结果仅证明空数据状态，不能外推生产全量地图/排行性能。
- 未验证：远程 CI（推送后单独记录）、生产全量数据下性能；本任务没有再次读取生产数据。8 项浏览器用例中 7 项需要显式本地虚构开关，CI 默认执行常规 HTML 验收。
- 证据保存在仓库外 `v3-evidence`，包含四态截图、短录屏、严格锁定页对比及哈希清单；不纳入代码提交。

## 本地复核后的修正

共用 `formatPublicPrice` 实现 CNY ¥ / USD $ / JPY JP¥ / HKD HK$ / TWD NT$ / EUR € / GBP £，其余保留 ISO 代码，统一空格及金额格式。`PublicPriceNumber` 的新 currency/cycle 参数让首页及公共搜索复用同一格式，并把小号辅助色周期放在同一行；旧调用保持原样，Plus 与英文不切换。币种下拉继续显示 ISO 代码。
首页套餐和搜索使用 `getPlanDisplayName`，该现有函数只负责去重产品名，不翻译。已有中文原样保留；缺中文时保留原命名、不自动翻译。当前仓库未找到可复用中文显示名的代表套餐如下（按产品 → 配置套餐列出；不据此修改正式数据）：
Anghami → plus；Captions → max；Character.AI → plus；ChatGPT → plus；Claude → pro；Crunchyroll → mega-fan；Deezer → premium；Disney+ → premium；DramaBox → membership；F1 TV → access；Gemini → pro；Grok → super；HBO Max → standard；HeyGen → starter；invideo AI → plus；Kimi → moderato；Kling AI → pro；Mistral Vibe (Le Chat) → pro；Leonardo AI → essential；Manus → basic；Microsoft Copilot → personal；MUBI → monthly；Netflix → standard；Perplexity → pro；Podimo → premium；Poe → basic；Pollo AI → pro；ReelShort → subscription；RunwayML → standard；SoundCloud → go-plus；Suno → pro；Rakuten Viki → plus；X Premium → premium；YouTube Premium → individual。
分类卡增加“查看全部 AI 订阅 / 查看全部流媒体”，以及排序后第一项代表产品的完整套餐名、原值计算的节省率；不使用示例中的 Netflix 85% 常量。
生产配置阶段检测本地测试开关并抛错，阻止误带样本构建或启动。开发模式仍需显式 fictional 值及 loopback 数据库，关闭开关时样本与横幅均不显示。

# X Premium 内容完善与索引待审核

日期：2026-09-08。类型：Improvement，风险 L2。状态：本地实现与验收完成，未推送或部署。

## 用户问题与范围

用户希望按后台浏览证据补齐低质量产品资料，避免凭感觉扩大索引。X Premium 的正式中英文概览及套餐路由在 18 个完整 UTC 日有 38 次原始 PV，在新版 eligible 口径的两个完整 UTC 日有 4 次 PV；这些不是独立用户或自然搜索流量，不足以推断增长效果。

本次完善中英文 Basic、Premium、Premium+ 的适用人群、套餐差异、订阅条件、四项渠道与权益 FAQ，以及官方来源。保留 App Store 月付数据范围。权益复核日期与价格采集日期分开说明。

## 决策

用户已批准将内容完善与自动开放索引分离。代码中对 `x-premium` 显式登记索引待审核，优先于质量分数及 observe/enforce 模式；概览与套餐返回 noindex/follow，sitemap 排除。即使加入套餐推广名单也不能绕过该待审核状态。质量评分仍真实计算。

这不启用数据库 observe-only 生命周期决策，不增加 schema、迁移、价格或预算。未来解除待审核需单独决策，并重新检查容量、内容和线上输出。冻结的 ChatGPT 实验及 Claude Pro 内容保持不变。

## 依据

权益来源复核于 2026-09-08：

- https://help.x.com/en/using-x/x-premium
- https://help.x.com/en/managing-your-account/about-x-bluecheck
- https://help.x.com/en/using-x/x-premium-faq
- https://docs.x.ai/grok/faq

不承诺蓝标自动通过、完全无推广内容、创作者收入或与直接购买 SuperGrok 完全相同。官方描述存在不一致的 Articles 排他性未写入。

## 验收

- verified：625 项单元测试；lint、生产构建、SEO 策略与内容重复度检查通过。
- verified：本地 fixture sitemap 为 144/148，产品和套餐为 98/98；无重复 URL。与原 3109 预览相比，在归一化预览域名后路径集合完全相同，无 X Premium 路由。
- verified：中英文概览及三个套餐共 8 个 HTTP 页面均为 noindex/follow。六个套餐页 FAQ 结构化数据存在，问题文本与页面一致。
- verified：两项冻结 ChatGPT 路由及中英文 Claude Pro 的 title、description、robots、JSON-LD 与原预览一致（归一化预览域名）。
- verified：代表性 Premium+ 页面桌面 1365px 与手机 390px 浅色、深色排版；深色通过本地 CSS 媒体查询 fixture 模拟，并非原生系统切换。手机宽度与 scrollWidth 均为 390，无页面横向溢出。FAQ 点击和 Enter 展开收起、焦点轮廓正常。
- 新增的是静态内容，复用现有 FAQ/编辑区组件；没有新增加载、错误或动画状态。空数据、非 iOS、年付及非中英文不展示新增渠道 FAQ，有单元覆盖。
- not verified：生产输出、实际搜索引擎收录或流量改善；本次没有部署或提交索引。

## 发布与回滚

这是基于 2.10.1 的本地候选变更，尚非新发布版本。正式发布时需独立版本号与发布记录，并执行部署验收。回滚内容时应保留索引待审核；不得仅删除 hold 而保留质量达标内容，否则可能意外开放索引。无数据库写入或迁移需要回滚。

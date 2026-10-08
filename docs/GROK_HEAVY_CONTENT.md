# SuperGrok Heavy 套餐身份说明

2026-09-13 · Improvement / L2 · 本地实现与本地验收完成，尚未推送部署。

用户问题：比较 Heavy 地区价格时，分清 Plus、Heavy 与 X Premium+ 所附 SuperGrok 的权益边界。仅 `/zh/ai-pricing/grok/super-heavy`、`/en/ai-pricing/grok/super-heavy`。

复用 PlanBillingContent 与 ProductEditorialSection，新增一段说明和两条 FAQ。可见 FAQ 和 JSON-LD 继续共用 effectiveFaqs。沿用已有非空、月付、全部 iOS 数据门槛；缺失/混合平台/非月付时隐藏，避免未来数据范围变动后误用审核稿。无新组件、无样式变更。

本地隔离库只读核对：grok/super-heavy 名称 SuperGrok Heavy，monthly / published，39 条 iOS 价格记录；这不代表今日生产价格或全部通过公开质量过滤。代码内容不写固定价格与额度。官方核验来源 https://x.ai/pricing 和 https://help.x.com/en/using-x/x-premium，复核日期 2026-09-13；不是价格采集日期。官方列表另有 Plus，不据此新增价格、路由或将 Plus 价格映射到 Heavy。

保持元数据、H1、URL、价格、canonical、robots、hreflang、sitemap、冻结页和其他套餐不变。选择 Heavy 是内容缺口与未结算搜索线索共同形成的假设，不是已证明的增长因果。

验收：局部边界测试、全量相关测试、类型/Lint、构建、SEO/内容/sitemap；新旧 HTTP 对照目标页与冻结页、代表性非目标页；四态浏览器、FAQ 键盘操作、焦点、溢出和 JSON-LD 对照。暂无新增加载/错误/动画状态。

发布独立处理；递增版本在实际发布准备时进行。回退撤销本次内容提交，无迁移。发布日不计完整观察日；重新抓取确认并形成同源/同页/同口径的完整结算窗口前，不判定增长改善。两语言分别观察，不改既有冻结实验。

## 2026-09-13 验收结果

- verified：626 项测试全部通过，typecheck、Lint、生产构建、check:seo、check:content-uniqueness、check:sitemap 通过。第一次测试因 PATH 缺 PowerShell 失败，补齐本机既有运行时路径后全量重跑通过；没有修改测试规则或依赖。
- verified：实际本地隔离库 monthly / iOS 套餐身份与配置对应。两个构建的 sitemap HTTP 200，144 条唯一路径集合相同；分类 98/98，总量 144/148。
- verified：8 路由新旧 HTTP 对照。Heavy 中英文 FAQ 7→9，可见 FAQ 与 JSON-LD 一致，元数据、H1、canonical/hreflang、robots 与非 FAQ JSON-LD 不变。两冻结 ChatGPT 页、Claude Pro 中文页、标准 SuperGrok 英文页、Grok 中文概览及 X Premium+ 英文页全部对照一致。
- verified：使用本机 Google Chrome 的独立临时测试会话，在 1280×720 / 390×844、中英文、明暗配色共八个组合检查；浏览器原生 colorScheme 媒体模拟，未修改 CSS。正文和 FAQ 截图已目视复核；无页面横向溢出，来源链接不小于 44px 高，Tab 焦点可见，FAQ Enter/Space/点击展开通过，pageerror 为零。使用 reduced-motion 设置；没有新增动画。
- not verified：生产价格复核、远端 CI、部署和增长效果。本次验收是本地构建及隔离数据，不冒充线上验收。

证据保存在工作区 work/private/grok-heavy-content/：tests.log、typecheck.log、lint.log、build.log、seo.log、content.log、sitemap.log、page-comparison.json、sitemap-comparison.json、browser-qa.json 和八组正文/FAQ 截图。运行时与数据库凭据不进入提交。

2026-09-17：官方描述与生产套餐身份重新核验。发布候选2.10.3增加必要依赖安全修复，并用新生产快照隔离库完成完整预检、Chrome/WebKit16组状态验收。最新状态见 release-2.10.3.md；未推送部署。

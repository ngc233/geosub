# V1 inactive public design foundation

Scope: V2 taskbook sections 2–4 and V1 acceptance; canvas boards 1, 2 and 13.
Base: `ed3ec9bb42ef9ca210b70384e64e29c5bfc45fbe` (main, including U1).
Classification: Architecture / L2. This document records the small design decision;
product behavior and data contracts remain those of the approved taskbook.

## Choice and boundaries

Retain U1's `.gs-public-unified` boundary and four-file architecture. Rewrite the
inactive palette, typography and motion tokens; preserve shared primitives and
`formatPublicDate`. No production layout imports these files and no production
component calls `usesUnifiedPublicStyle` (which still returns false everywhere).
The sample is a separate Next application under `design/preview`, not a route in
the production app. It has no database connection and is bound to loopback.
Its own app/zh/page.tsx provides /zh only in that separate app. Startup requires
GEOSUB_V1_SAMPLE=1 and next dev; production build/start always throw, even with
the flag enabled. The main app does not read this flag or import the sample.
V2 will introduce the Chinese framework with the explicit Plus-page exception;
V3–V7 own page-specific rules. Data queries, SEO, dependencies and lockfile do not
change here. Old U2 work is retained outside this branch and is not imported.
Rollback before activation: revert V1; no data or routing migration is necessary.

## Foundation API

- Edit `design-tokens.json` / `public-theme-compatibility.json`, then regenerate
  `public-tokens.css`. Dark colors follow system preference only.
- `public-base.css`: Chinese system fonts, numeric roles, focus and touch defaults.
- `public-components.css`: U1 shared controls, cards, tables, tags and states.
- `public-motion.css`: feedback 120ms, switches 220ms, data 480ms, entry 320ms /
  stagger 40ms, pulse 1200ms × 2; one cubic-bezier(0.2, 0.8, 0.2, 1). The 4500ms
  carousel token is reserved for V3. Reduced motion completes immediately.
- `PublicIcon`: named Lucide icons, stroke 1.75, sizes 16/20/24, currentColor;
  decorative by default, optional label for a semantic icon.
- `PublicPriceNumber`: already-converted numeric input, SSR final text. Only a
  changed `changeKey` from a user action rolls the value; passive refresh snaps.
  Invalid input renders nothing. No exchange-rate or substitute-value logic.
- Entry replay changes animation-name on retained DOM nodes. Use viewport entry
  once; no price opacity animation. Height transitions retain the content node.

## Font provenance

Self-hosted `@fontsource/inter-tight` 5.3.0 Latin normal 600 (22,660 bytes) and
700 (22,748 bytes): 45,408 bytes total, below the 50,000-byte budget. Source:
https://registry.npmjs.org/@fontsource/inter-tight/-/inter-tight-5.3.0.tgz
The archive's npm SHA-512 integrity was verified; the unmodified files and OFL
license are in `assets/fonts`. CSS declares Latin unicode-range, swap and
`tabular-nums`. No Google Fonts request. Noto/IBM font-face declarations are gone;
old asset files are retained because deleting historical assets is outside V1.

## Local verification

Run from `ai-price-site` with Node 22:

```sh
node scripts/public-design-tokens.cjs
node scripts/public-design-tokens.cjs --check
npm test
npm run typecheck
npm run lint
npx playwright test --config playwright.foundation.config.ts
GEOSUB_V1_SAMPLE=1 node node_modules/next/dist/bin/next dev design/preview --webpack --hostname 127.0.0.1 --port 3140
```

Open `http://127.0.0.1:3140/zh`. Set `PLAYWRIGHT_CHANNEL=chrome` to use installed
Chrome instead of Playwright's bundled Chromium. No database is needed for these
browser tests. Production-build verification must use local test data only.

The CSS gate still checks exactly four public stylesheets. It rejects literal
colors/font sizes, non-variable shadows, scope leaks, misplaced motion/transforms,
hover resets and main-text-colored backgrounds except buttons/tags. Executable
fixtures verify cancellation failure. No component stylesheet is added in V1.
`postcss` remains an indirect dependency pinned by the existing override/lockfile;
this works with today's install but is not a stable direct-dependency contract.
Declare it directly and update the lockfile in the separately approved follow-up.

Screenshots, short recordings, font/contrast measurements and logs stay outside
Git. The approved contrast policy has three categories, without changing colors:
text >=4.5:1 (low/subtle is forbidden); standalone cheap points/lines >=3:1 using
bar-low on surface (white in light mode); redundant decoration only via the
reasoned CONTRAST_ALLOWLIST in the checker. Nav/selection state, adjacent numbers,
progress values, labelled pulse rings and labelled emphasis borders have separate
role/token/support entries. Unknown roles or absent supporting evidence fail.
The usage-policy check is not a CSS cascade/DOM audit: future page integrations
must verify the declared adjacent text/state actually exists in browser tests.

The six earlier failures classify as: low/subtle = text, forbidden;
graphic/page, graphic/surface, graphic/subtle = redundant decoration only;
bar-low/page and bar-low/subtle = standalone graphics, forbidden (use surface).
A numbered bar/progress bar may separately use category 3 only with its explicit
allowlisted role and supporting value; color alone never grants an exemption.

## V2 中文框架（Architecture / L2）

基线：PR #40 合并后的 c67505ca50ad8df4bb1162e78cea2315bece6c3b，独立分支重新实现。
选择：Header/Footer 在现有导航解析后按显式路径切换；Plus（V8 删除例外）和所有非 zh 路径继续返回旧 JSX。
新样式只在 app/zh/layout.tsx 引入，作用域只在新头尾/控件，不包住旧正文。根布局不增加读取或导入。
不改变 SEO、正文、导航目标、原有数据读取器/缓存或发布流程。回退为恢复 usesUnifiedPublicStyle 返回 false。

共享控件：PublicSegments、PublicDisclosure、PublicComparisonBar、PublicTutorialCard、PublicPromotionPlaceholder、PublicEmphasis；
PublicCurrencySelect 自带同页面/跨标签偏好订阅，只在隔离本地样例中演示；正式页面不挂载。PublicPriceNumber 复用 V1。
SharePriceModal 新增可选 unifiedTrigger，默认分支保持原有按钮和模态框。教程缺文章不显示，推广默认关闭。
抽屉和搜索使用原生 modal dialog，负责背景 inert、Escape、焦点限制和关闭后焦点恢复。

搜索：/api/search 的 zh + view=chrome 分支复用既有搜索匹配、getPublicPricingProduct/getDefaultPlanRegions 和 getCountryHub，
没有增加数据库字段、SQL、采集或缓存。只投影小 DTO；每组最多三条，缺可用最低价不编造。最低价仅 verified、7 天内、正数，
对应默认平台；产品最低项标明套餐及原计费周期，国家只搜索现有四页。金额明确为 USD，不引入汇率降级值。
此为 V2 搜索展示，不实现 D1–D8 或 DATA-1/2。是否缺合格行以本地测试库结果报告。

画布差异：保留已有导航文案、链接目标和四组名称（价格数据/指南/站点/政策），不照抄画布的新内链。
搜索价格使用明确标注 USD 的既有美元原值；画布 CNY 示例不作为数据。Logo 保留 G 标识，本次不重设计。
旧字体删除前检索全部 Git 文件名引用：5 个 WOFF2 无读取引用；subset-public-font.py 只有生成 Noto 文件名模板，保留原始源字体与许可。
图形检查新增 low/bar-high/baseline，仍只准 surface（亮色白面板，暗色对应面板）并实际计算 >=3:1；文字门槛不变。

验收：四态截图/动效、键盘/触屏/减少动效；Plus/英文头尾逐像素及链接文本顺序 href rel；页面正文/metadata 对比；
字体冷缓存传输、CSS 隔离、类型/Lint/全量单测/构建。截图录屏和哈希只存仓库外，先本地评审再开 PR。

### V2 本地验收记录（2026-11-05）

- 本地预览：3143（只读测试库），隔离控件样例：3144；旧预览和数据库保留。
- 构建、typecheck、lint、token gate 通过；V2 浏览器 23/23，V1 底座 14/14。
- Plus/英文首页 × 头/尾 × 桌面/手机 × 明/暗 = 24 对固定视口截图逐像素相同（页脚分上下两段，覆盖全部内容）；链接文本、顺序、href、rel 相同。
- 7 类页面正文、正文内链相同；title/description/H1/canonical/hreflang/robots/JSON-LD 比对只归一化两个本机 SITE_URL 端口。
- 手机冷缓存中文首页字体 0 bytes；英文和后台登录页请求的新公开 CSS 为 0。
- Lighthouse 13.2.0 手机：基线/V2 均 92，CLS 均 0；本机单次对照，不冒充线上指标。
- 关闭 JavaScript 后首页测试价格仍可见；手机触控开关菜单/搜索、键盘选择、空态/失败/重试、减少动效均已测试。
- 测试库搜索只有 ChatGPT/Plus 可显示合格价格；Netflix 与四个国家未返回合格最低价。不补写数据，国家分组仅用浏览器交互夹具验证。
- 本机全量单测 1092 通过、3 失败、1 跳过；3 失败均为现有采集器测试缺 pwsh，未改测试。这些测试使用跨平台 PowerShell，并非只允许 Windows。本地失败不冒充 CI 通过；远端结果在 PR 中实时记录。
- V1 字体测试原来绑定 3140，改为核对当前页面同源，50KB 门槛保留；主项目排除隔离样例生成的 next-env 类型，避免两个应用的路由声明冲突。
- 桌面搜索由头部按钮展开对话面板，手机全屏；原生 dialog 保证焦点限制、Escape 和返回焦点。分组三组、每组最多三条及方向键行为按画布实现。
- 证据位于仓库外的 `../v2-evidence/V2-visual-evidence.zip`，只含图片/短录屏/哈希。本地复核通过后的三项修正已补齐；按产品负责人指令开草稿 PR，不部署。

### 复核修正与 CI 边界

全站 globals.css 只追加 html 的 scrollbar-gutter: stable，覆盖所有锁滚动弹层；其余公开样式仍仅中文加载。
浏览器关闭默认隐藏滚动条参数，并强制 12px 滚动条：旧构建 Logo 从 x=58 到 x=64，修复后保持不变。
桌面/390px、明/暗均覆盖搜索、手机抽屉和导航下拉。固定视口分段截图避免截图工具扩高视口时改变滚动条/粘性定位。
带下拉项的文字+箭头是一个展开控件，4px 间距，所有菜单项相同内边距/44px 点击高度。
保留原 a 标签 href 与文字，普通点击/Enter/空格展开；修饰键或新标签页仍可访问原目标，不制造重复内部链接。
空搜索结果提供 ChatGPT、Claude、Netflix、印度四个建议词和 /zh/contact；点击相同建议也会重新请求，输入框恢复焦点。
V3 后续：搜索金额接入用户所选显示币种，目前 USD 已获批准。

本地运行 `npx playwright test --config playwright.chrome.config.ts`（预览 3143、基线 3142、隔离样例 3144）。
默认 CI 的 Browser E2E 同时运行其中 15 项实际应用测试，包括新增坐标与空态测试；8 项依赖单独 main/样例进程的像素及控件矩阵只在专用本地配置中运行，已有完整本地证据，不假装 CI 执行了它们。

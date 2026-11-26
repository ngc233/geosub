# 管理后台全新视觉语言与阶段 1 页面重构 RFC

日期：2026-11-26（北京时间）  
分支：`feat/admin-redesign-phase1`（基于 `origin/main`）  
类型：Architecture / L2（全新后台设计系统、共享导航与外壳、多页面模板重构、遗留路由清理）  
状态：阶段 0 契约已定稿，进入阶段 1 本地实施

## 1. 背景与目标

基于源码审计结论，当前管理后台存在多轮局部修补导致的架构断层：
- 三套样式体系混用（Tailwind 语义令牌、`1,106` 处原始色板、`Workspace.module.css` / `TrafficDashboard.module.css`）；
- 夜间模式切换不持久化，刷新即失效；顶栏搜索写死指向采集流水线而非产品目录；
- `AdminDataTable` / `AdminFilterBar` 等标准化模板组件在核心页面闲置；
- 产品维护仍分散在 7+ 个页面，缺少真正的“单产品多页签工作区”；
- 遗留页未收口：`/admin/commercial` 空占位、`/admin/analytics/details` 独立挂载旧 `LegacyDashboard`、`/admin/pricing-preview` 无条件全量加载所有已发布产品与地区价格。

本方案采用**“先页面设计 + ViewModel 契约解耦（阶段 1），后底层架构收口（阶段 2）”**的两阶段路线，确保阶段 2 调整数据库查询、连接池或写管道时，阶段 1 重构后的页面组件无需推倒返工。

## 2. 范围与不变项

### 阶段 1 范围
1. **全新后台视觉语言（GeoSub Studio — Editorial Operations）**：脱离 2026-10-28 的通用浅蓝后台风格，与 GeoSub 公开站暖纸面（stone canvas）+ 森林绿品牌语义统一，建立高密度、低噪、高对比度的现代运营工作台设计语言。
2. **后台外壳与设计系统收口**：
   - 升级 `app/globals.css` 后台作用域 `[data-admin-theme]` 令牌（亮/暗双主题，WCAG AA ≥ 4.5:1）；
   - 夜间模式通过 Cookie（`geosub_admin_theme`）+ `localStorage` 双重持久化，SSR 首屏即读 Cookie 避免闪烁；
   - 顶栏搜索改指向 `/admin/products?q=`，提供清晰的角色标识与快捷操作；
   - 统一共享原语组件（`AdminCard`、`AdminButton`、`AdminBadge`、`AdminAlert`、`AdminDataTable`、`AdminFilterBar`、`AdminSegmentedControl`、新增 `AdminTabs`），消除 `Workspace.module.css` 与 `TrafficDashboard.module.css`。
3. **首页工作台（`/admin`）**：引入薄适配层 `workspace-adapter.ts` 解耦页面与底层查询，精简工程免责文案，以高可读性操作队列与指标卡呈现核心待办。
4. **产品目录与单产品多页签工作区（`/admin/products`、`/admin/products/[id]/edit`）**：
   - `/admin/products` 迁移至 `AdminDataTable` + `AdminFilterBar` + 适配层 `products-adapter.ts`，支持按列排序与紧凑浏览；
   - `/admin/products/[id]/edit` 升级为 URL 驱动的多页签产品工作区（`?tab=overview|plans|sources|prices|seo`），通过 `product-workspace-adapter.ts` 在单产品上下文内聚合基础资料、套餐列表、采集来源与运行摘要、正式价格概览与 SEO 配置。
5. **遗留页面彻底清理合并**：
   - 删除 `/admin/commercial` 占位页；
   - 将原 `LegacyDashboard` 并入 `/admin/analytics?tab=details`，`/admin/analytics/details` 保留参数兼容重定向至 `/admin/analytics?tab=details`；
   - 将 `/admin/pricing-preview` 改造为按产品按需加载（未选产品仅加载轻量产品索引，选中 `?product=<slug>` 后才加载该产品套餐与地区价格）。

### 严格不变项（阶段 1 不触碰）
- **不修改任何 Prisma Client、连接池配置（`prisma` / `adminPrisma`）或数据库迁移**；
- **不修改写操作业务规则、乐观锁版本检查、服务端权限边界（`requireAdmin`）、采集/审核/发布逻辑**；
- **不修改公开站样式、路由、SEO 元数据与任何受保护治理文件**；
- **不推送、不建 PR、不部署生产**。

## 3. 全新视觉语言规范（方向 A：Linear / Vercel 极简冷灰工程风）

产品负责人确认采用 **方向 A：Linear / Vercel 极简冷灰工程风**，彻底脱离传统灰底卡片 ERP 骨架：

- **色彩基调（95% 黑白灰 + 语义信号仅用于状态）**：
  - 亮色：纯白贴边工作区 `#ffffff`、极浅冷灰侧栏 `#fafafa`、1px 细线 `#eaeaea` / `#d4d4d8`、主字 `#09090b`、次字 `#52525b`、弱字 `#63636e`（对比度均 ≥ 5.9:1）、主按钮极黑 `#111113` 配白字（对比度 18.8:1）。
  - 暗色：纯碳黑工作区 `#09090b`、侧栏 `#111113`、细线 `#202024` / `#2e2e34`、主字 `#fafafa`、次字 `#a1a1aa`、弱字 `#8e8e98`（对比度均 ≥ 6.0:1）、主按钮反白 `#fafafa` 配碳黑字 `#09090b`（`--admin-on-primary`）。
  - 语义状态色仅用于真实业务状态（成功/已发布绿、超期/待审琥珀、失败/阻断红）。
- **App Frame 与导航压缩（19 项 → 6 大工作中心 + 48px 上下文二级顶栏 + `⌘K` 命令面板）**：
  - 左侧 `220px` 极简导航栏仅保留 6 大中心：**收件箱 / 产品目录 / 价格运维 / 增长分析 / 内容管理 / 系统运维**；
  - 顶部 `48px` 上下文顶栏自动展示当前中心的二级模块页签，所有现有 40+ 路由均可 1–2 步直达且零断链；
  - 全局 `⌘K` 命令面板支持跨模块跳转、产品快捷搜索与明暗主题切换。
- **核心工作台空间重构**：
  - `/admin`：左右分栏收件箱（左 380px 紧凑待办流，右实时检查器 + 三状态矩阵 + 5 页签快捷直达）；
  - `/admin/products`：单行指标条 + 单行组合工具栏 + 贴边全宽可排序表格；
  - `/admin/products/[id]/edit`：贴边身份栏 + 5 页签下划线导航 + Vercel/Stripe 风格双栏设置表单；
  - 几何规范：卡片圆角 `8px`、控件 `6px`、零多余阴影（`--admin-card-shadow: none`），全量 `tabular-nums`。

## 4. 阶段 1 → 阶段 2 解耦契约

阶段 1 新增以下薄适配层，作为 UI 与底层数据层之间的稳定接口：
- `app/admin/workspace-adapter.ts`：对外暴露 `WorkspaceViewModel`（阶段 2 切换统一状态读模型时仅替换适配器内部查询）；
- `app/admin/products/products-adapter.ts`：对外暴露 `ProductsCatalogViewModel`（阶段 2 切换 SQL 真分页与 `adminPrisma` 时页面无感）；
- `app/admin/products/[id]/edit/product-workspace-adapter.ts`：对外暴露 `ProductWorkspaceViewModel`（按 `tab` 按需查询对应页签数据，避免单次进入拉全量图）。

## 5. 验收与回退

- **自动化门禁**：`npm test`（更新受视觉令牌与路由合并影响的静态守卫测试，保留全部对比度、无障碍、状态与安全断言）、`npm run typecheck`、`npm run lint`、`npm run build`。
- **四态视觉与交互验收**：桌面 `1280×720` 与移动 `390×844` 的亮/暗模式、夜间模式持久化刷新验证、键盘焦点与移动端抽屉、无页面级横向溢出。
- **回退方案**：所有改动集中在独立分支 `feat/admin-redesign-phase1`，无数据库迁移与外部状态变更，回退直接切回 `origin/main` 即可。

## 6. 批次 1 本地验收记录（2026-11-26）

在独立隔离的本地 Docker PostgreSQL 临时预览库（`127.0.0.1:55499`，验收后已销毁）上运行完整生产构建 `next build` 与 `next start`（`127.0.0.1:3130`，验收后已停止），只读验证：

- **`verified`**：
  - 7 个受影响后台自动化测试套件 **53/53 pass**（含明暗双主题 WCAG AA ≥ 4.5:1 对比度检查、导航可达性、令牌守卫、工作台路由、流量指标卡与品牌资产策略）；
  - `npm run typecheck`（0 错误）、`npm run lint`（0 错误 0 警告）、`npm run check:encoding`、`git diff --check`、`scripts/check-approvals.mjs --mode=error`、`scripts/tests/protected-files.test.mjs`（24/24 pass）；
  - 完整 `next build`（Next.js 16.4.6 Turbopack，编译 4.4s + TypeScript 9.7s + 页面数据收集与路由清单生成全部通过，退出码 0）；
  - 浏览器实测（`1280×720` 与 `390×844` 明暗四态，零控制台报错，零页面级横向溢出）：
    - `/admin` 左右分栏收件箱：切换「需要处理 / 执行中 / 全部产品」，点击左侧不同产品后右侧检查器原地更新（三状态矩阵、诊断依据与 5 页签快捷直达）；
    - 夜间模式持久化：切换侧栏夜间模式后执行 `page.reload()`，`[data-admin-theme="dark"]` 保持不回弹；
    - `⌘K` 命令面板：输入 `chatgpt` 展示搜索与跳转项，按 `Escape` 关闭；
    - `/admin/products`：单行指标条、单行筛选栏与贴边可排序 `AdminDataTable`（点击“价格”列升序生效）；
    - `/admin/products/[id]/edit`：5 页签（`overview` / `plans` / `sources` / `prices` / `seo`）全部正常切换与渲染；
    - `/admin/analytics` 双页签与 `/admin/analytics/details` 重定向；`/admin/pricing-preview` 默认轻量索引与按单产品按需展开；`/admin/commercial` 返回 404；
    - 移动端 `390×844` 导航抽屉打开、按 `Escape` 关闭并恢复焦点至菜单触发按钮。
- **`structurally checked`**：`prefers-reduced-motion` 保护与其余未修改子页对新 6 大中心外壳及上下文二级顶栏的继承兼容性。
- **`not verified`**：Safari / WebKit 与物理手机软键盘；生产数据写入与真实采集触发（本批严格只读，未修改任何写入逻辑、Prisma 连接池或受保护文件）；远端 GitHub CI（尚未推送）。


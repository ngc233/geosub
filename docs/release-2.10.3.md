# 2.10.3 发布候选：SuperGrok Heavy 套餐辨识

状态：推送部署已获批准；2026-10-07 复核遇到新的依赖审计阻塞，尚未推送、部署或验证增长效果。生产仍为 2.10.2 / a7320f6。

## 结果与边界

改善中英文 Heavy 页面用户容易混淆 Plus、Heavy 与 X Premium+ 所附权益的问题。实现见 GROK_HEAVY_CONTENT.md。2026-09-17 重读 x.ai/pricing 与 X Premium 官方说明，原文案仍成立。当天生产只读确认 Heavy 为 published monthly，39 个地区、39 条 published/verified iOS 价格；检查日期范围为 2026-09-10 至 09-17 UTC。

保留价格、元数据、URL、canonical、robots、索引预算、X 待审核和冻结实验；无迁移、无回填。远端 main b290932 已合入。

## 发布门禁阻塞与限定依赖修复决策

工作类型 Improvement / L2；依赖安全修复是发布必要前置，生产部署另属 L3。9月17日正式 release-check 的前端审计失败，报告 1 critical、2 high 包。原 9月13日内容验收不能代替今日依赖门禁。

限定更新 next 16.2.12 → 16.3.3、匹配的 eslint-config-next 16.3.3、sharp override 0.35.3 → 0.35.4、js-yaml override 4.3.1 → 4.3.2；以安装和重新审计结果为准。不使用 audit fix --force，不更新无关依赖或修改 Next 配置。依赖变更独立记录，合并验收用于同一候选，因为未修复就不能通过当前内容发布的安全门禁。框架跨次版本需重新运行完整门禁与核心页面验收，不能仅复用旧 UI 证据。

安全公告：
- https://github.com/advisories/GHSA-p293-qw3h-jr36：Windows 条件，不应直接当作 Debian 已受利用。
- https://github.com/advisories/GHSA-2xp9-vwfh-vxw4：AVIF 图片优化相关。
- https://github.com/advisories/GHSA-rgj7-g3m4-5g8c：不可信 HEIF/AVIF 解码，在特定 glibc Linux 条件下有风险。
- https://github.com/advisories/GHSA-2883-xcg3-v3hh：YAML merge CPU 消耗。

审计命中不等于已入侵；目前没有进行入侵归因。新锁文件必须通过 npm ci、前后端审计、release-check、真实本地数据库 preflight 与相关浏览器验收。CI 和生产页面检查须推送/部署后另验。生产后台登录抽样仍未验证。

## 部署与回退

得到明确发布批准后，从已推送固定 SHA 运行标准 upgrade.sh；保持 GEOSUB_RUN_BACKFILLS=false，验证备份、迁移、健康、目标 FAQ、sitemap 和冻结页。保留 Bing 的 bash 启动 drop-in。回退用标准 rollback.sh 回到已验证 2.10.2；这会恢复原依赖，因此仅为应急回退，不能视为安全问题已解决。无数据库恢复需求。IndexNow 不在此次准备授权内。

## 2026-09-17 验收进展

限定依赖更新后 npm ci 成功，前后端安全审计0漏洞；正式 release-check（含版本递增、626测试、类型、Lint、生产构建）通过。首次 npm ci 后补生成 Prisma 客户端类型，未改业务代码。

旧9月5日隔离库在 preflight 的价格新鲜度门禁失败，这是测试快照过期，不能据此声称生产异常。已只读导出9月17日生产快照到本机私有目录，恢复到专用 geosub_release_20260917；排除管理员及会话数据，相应可空管理员外键仅在隔离副本清空。没有伪造采集时间或放宽新鲜度门槛；需要在恢复成功后重跑完整预检。

## 候选验收结果

新隔离库恢复成功，preflight:full 全部通过，未放宽任何数据新鲜度阈值。Chrome 与 WebKit 双语、桌面1280/手机390、明暗共16组通过：无横向溢出、无页面脚本异常，来源链接触达尺寸、键盘焦点、FAQ Enter/Space/点击均已实际验证。WebKit 使用 Option+Tab 链接导航；普通 Tab 的默认导航范围不同，不以跳过焦点断言代替验收。

相同新隔离数据库下，2.10.2 与候选8路径对比通过：目标两页 FAQ7→9，元数据和非FAQ JSON-LD不变；其他6页完整对照一致。sitemap集合仍144路径、无增删或重复。证据保留 work/private/grok-heavy-content 下20260917日志、page-comparison.json、sitemap-comparison.json及qa-20260917-*。生产与CI仍未验收，不将本地通过写成已上线。

补充核心验收：12个首页/分类/产品/套餐/健康/robots/sitemap路径均200；手机暗色币种菜单展开与Escape关闭、桌面中英切换及html lang均通过，pageErrors为空。见 core-release-qa.json。

## 2026-10-07 重新验收（取代9月17日门禁时效）

用户已批准此版本推送部署，无须重复索取相同发布授权。生产只读确认仍为2.10.2 / a7320f65b1c757bf4f82dc96edb01bcbee068c6d。

新审计发现10项告警。已限定更新Next/eslint-config-next 16.3.6、sharp 0.35.5、fast-uri 3.1.8、brace-expansion 1.1.21/5.0.12、source-map-js 1.2.2。该依赖组合的626测试、类型、Lint、构建通过。最终锁文件重新从原提交生成，npm ci成功，npm ls确认fast-glob 3.3.1 → micromatch 4.0.8 → braces 3.0.3真实依赖链；生产依赖审计为0，完整审计仍5 high（开发工具链传递告警），正式发布门禁未通过。

尝试将插件局部fast-glob替换为tinyglobby，兼容性测试发现绝对路径与目录尾斜杠语义不同，已完整撤回；不以该尝试的临时audit 0作为最终结果。不使用audit fix --force或静默降级框架，不修改安全门禁。后续应修复兼容依赖或提交有期限、有范围的例外评估，不能直接部署。

本次生产数据库下载被自动审批拒绝，原因是发布授权不包含将可能含用户数据的完整数据库导出到本机。改为服务器端强制default_transaction_read_only检查，仅保留检查结果：local、migration-manifest、migrations、plans、logos、prices、country-pages、sitemap通过；首次SSH中断后只重试剩余两项。sitemap仍144/148，产品套餐98/98。此证据不冒充新的本地preflight:full或候选生产验收；9月17日本地快照仍旧。

Bing续期属于独立运维修复：原账号既有Read授权续期，refresh token写回原服务器env（原文件仅服务器端备份），10月7日03:18:50 CST collector success/0，原timer active。未更换client secret、未新增权限、未改变调度。次日自动续采尚待验证。

当前无推送、标签、CI或生产部署。私有证据：work/private/grok-heavy-content/*20261007*。周报独立输出 outputs/GeoSub-Growth-Weekly-2026-10-07，不将此次采集修复或候选内容当作SEO增长证明。

## Next ESLint 目录适配修复（2026-10-07，验证中）

分类：Architecture / L2，作为已批准发布的依赖安全前置。最新16.4.0插件仍依赖fast-glob 3.3.1；braces暂无官方补丁。5项告警源于同一GHSA-vfj7-8cjw-p6xm在依赖链传播。

采用仅匹配@next/eslint-plugin-next@16.3.6的本地目录适配包，底层tinyglobby 0.2.17为已存在的MIT工具依赖；不替换框架、不禁用ESLint规则、不改变审计阈值。官方插件只有get-root-dirs使用globSync(string,{onlyDirectories:true})。适配层恢复绝对/相对路径语义、禁止自动展开目录、去除目录尾斜杠，并对过长/过深模式显式报错。其他API或选项直接失败，防止上游升级静默改变行为。本地源码约30行，不进入网站运行时bundle；增加维护责任，未来上游移除该链时删除适配及override。

验收：从npm ci重装，实际插件rootDir默认/绝对/相对/数组/花括号/缺失/文件过滤与恶意深嵌套回归；全量审计、完整release-check。失败时恢复此前已记录5 high的候选，不跳过门禁。部署沿用本文件标准备份与回退流程。


2026-10-08 更新：继续验收时Next 16.3.6出现新公告，采用官方16.3.8安全补丁及匹配eslint-config-next，适配override精确限定插件16.3.8。通过根devDependency的$fast-glob引用本地包，避免npm嵌套file路径解析问题。新的锁文件审计0；仍须npm ci、聚焦和正式门禁验证。

2026-10-08 最终本地代码门禁：npm ci成功、npm ls正常、3组目录适配回归通过；正式release-check（BaselineRef origin/main）通过，629测试0失败、类型/Lint/build通过，前后端依赖审计0。ESLint仍有既有ManualCollectionProgressForm.tsx导航warning，未禁用规则或顺带改业务。服务器Node22.23.1/npm10.9.8满足适配运行要求。Bing原定时器10月8日03:24:55 CST再次success/0，自动续采验证完成。生产仍2.10.2，推送/CI/部署待执行。

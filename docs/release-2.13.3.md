# 2.13.3：HeyGen 月付套餐身份修复

状态：已按用户批准推送并部署；修复后的采集审核验证另附实际结果。

问题：巴西 App Store 的 Creator Weekly 59.90 BRL 被宽泛 creator 别名映射到 monthly Creator，与明确的 Creator Monthly 149.90 冲突，旧价格无法刷新。自动审核正确阻止了歧义观测发布。

修复：使用既有精确别名能力登记 HeyGen 四个明确月付身份；排除周付、年付、Creator Credit 与未知后缀，保留 Pro 1000/1500 Credit Monthly。价格区间、审核阈值、数据库结构、URL、页面样式、推广及待审核内容均不变。原 learn.chatgpt.com 源码改动不纳入发布。

验证：12 个身份用例、BR 实际快照回放、27/27 已发布 Creator 价格关联明确月付历史证据；collector 测试10项、目录测试4项、完整本地 release-check 通过。版本递增后完整门禁再次通过。CI 39301101866 四项成功；正式部署 c8b5ee89a8c31002d20173a9a789c7bc5f0d77c8，发布检查0失败1过期价格警告。144个sitemap URL返回200，后台浏览器确认v2.13.3。内容C4保持、围栏16开放、推广关闭。

数据：不手动更新 last_checked_at，不修改历史价格；上线后通过正式入口重新采集 HeyGen BR，只有原审核规则通过才刷新正式价。ReelShort/Viki 歧义继续待审。

回退：保留2.13.2构建与备份，按正式应用回退脚本；数据库不恢复，PostgreSQL 启动 guard 和回环端口配置保持。内容契约精确兼容仅 VERSION 改变，公开内容C4保留且草稿不发布。

恢复队列与根因证据见 collector-recovery-2026-10-20.md。真实推广始终关闭。

最终验收：HeyGen anomaly_watch 任务 0e0693c9-9585-4135-8a39-7fba228a21fe 于2026-10-19 18:38:33–18:39:17 UTC真实成功（手动），原审核链路刷新BR Creator 149.90 BRL，last_checked_at=18:38:37.775298 UTC。正式过期价4→2，仅ReelShort FR和Viki VN，继续待核验。collector timer已显式恢复。发布备份geosub_app_20261019T183449Z.dump校验通过。

队列快照：02:39 CST按 active 且 next_run_at超过2小时的动态口径为32项；不能把先前36→31再减手动5项推算为26，因为期间有任务进入到期窗口，且各产品有不同用途任务。积压未清空，继续按原调度观察。已成功的批次有数据库终态，未成功或未触发的任务不记成功。完整恢复周期最早至10月21日01:58 CST，且10项必须各自自然完成，当前仅确认analytics与collector，不能按到时直接通过。

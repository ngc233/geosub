# 2.13.3：HeyGen 月付套餐身份修复

状态：用户已批准独立推送、CI 通过后部署；本地候选。

问题：巴西 App Store 的 Creator Weekly 59.90 BRL 被宽泛 creator 别名映射到 monthly Creator，与明确的 Creator Monthly 149.90 冲突，旧价格无法刷新。自动审核正确阻止了歧义观测发布。

修复：使用既有精确别名能力登记 HeyGen 四个明确月付身份；排除周付、年付、Creator Credit 与未知后缀，保留 Pro 1000/1500 Credit Monthly。价格区间、审核阈值、数据库结构、URL、页面样式、推广及待审核内容均不变。原 learn.chatgpt.com 源码改动不纳入发布。

验证：12 个身份用例、BR 实际快照回放、27/27 已发布 Creator 价格关联明确月付历史证据；collector 测试10项、目录测试4项、完整本地 release-check 通过。版本递增后再验收。CI、正式部署、新采集审核结果待记录。

数据：不手动更新 last_checked_at，不修改历史价格；上线后通过正式入口重新采集 HeyGen BR，只有原审核规则通过才刷新正式价。ReelShort/Viki 歧义继续待审。

回退：保留2.13.2构建与备份，按正式应用回退脚本；数据库不恢复，PostgreSQL 启动 guard 和回环端口配置保持。内容契约精确兼容仅 VERSION 改变，公开内容C4保留且草稿不发布。

恢复队列与根因证据见 collector-recovery-2026-10-20.md。真实推广始终关闭。

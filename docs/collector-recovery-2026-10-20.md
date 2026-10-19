# 恢复后的采集与过期价格核查

工作类型：Bug；价格套餐映射修复为 L2，生产数据操作按 L3 执行。真实推广保持关闭，软件产品仅待审核，不放宽自动审核阈值，不把手动采集当自然调度成功。

## 已验证

- 2.13.2 运行提交 ea44ef50 已上线，前一轮文档提交 a4b1485 的 CI 39299195560 已成功；不为文档重新部署。
- 通过正式 task.env 和带串行锁的采集入口逐项复查 Kling NL、ReelShort FR、Viki VN、HeyGen BR，四项子任务及后续自动审核流程真实成功（北京时间 02:04–02:06）。这是手动验收，非自然调度。
- Kling NL Premier 99 EUR 被正式审核链路刷新，last_checked_at 为 2026-10-19 18:04:51.788479 UTC；过期正式价格从 4 条降为 3 条，未手动改日期。
- 剩余三条均有新观测，但因身份歧义保持 pending。采集成功不等于观测可发布。
- HeyGen 当前 27 条已发布 Creator 地区价格全部能按 product/plan/country/platform/price/checked_at 精确关联到 Creator Monthly 原始证据，未发现这些正式记录来自 Weekly。

## HeyGen 修复

实际 BR 快照含 Creator Monthly 149.90 BRL、Creator Weekly 59.90 BRL、Creator Credit Monthly 199.90 BRL。原有通用 creator 别名误收周付；Credit 项已被消耗品过滤，因此造成冲突的直接来源是 Weekly，而不只是此前推测的 Credit。

本地新增权威 HeyGen 套餐规范，使用已有 exact_plan_aliases，仅接受明确月付名称，排除周付、年付、Creator Credit、新增未知后缀；保留 Starter 和 Pro 1000/1500 Credit 的明确月付名称。原价格区间、计费周期和自动审核规则不变。

验证：12 个身份用例、BR 快照回放、原阈值一致性；collector reliability 10 项通过；目录静态测试 4 项通过。正式本地 release-check 已通过（初次受沙箱网络限制审计失败，获准联网正常重跑通过，未跳过审计）。用户已批准作为 2.13.3 独立推送，CI 通过后部署；尚未上线，不能声称线上 HeyGen 已刷新。

回退：仅回退 HeyGen 规范和测试提交；不回滚数据库、不修改历史观测。由于旧规则会重新误收 Weekly，若生产验证失败应保留待审核，不通过恢复宽泛匹配来消除告警。上线前需完整相关门禁、CI 和正式发布验收。

## 暂不能自动通过的价格

- ReelShort FR：同名 Subscription 五档价格 6.99/8.99/9.99/17.99/22.99 EUR，无逐档身份。[官方说明](https://apps.apple.com/fr/app/reelshort-stream-drama-tv/id1636235979) 为按周，而既有计划 monthly 关联 35 条正式记录。需要独立审查周期、历史来源及展示影响，不能将所有记录直接改 weekly 或人为月折算。
- Viki VN：Standard 109000/149000/1119000/1499000 VND 同名，未给逐档周期；不能按价格大小猜月/年。保留 109000 原值及真实旧日期。
- HeyGen BR：本地匹配修复后还需正式上线重新采集审核；不能用本地快照回放代替生产发布。

## 自然调度与根因证据

02:08:55 自然 collector 批次于 02:12:36 退出 0，数据库确认 Gemini/Canva/Notion App Store、Claude/Gemini 官网五项成功。analytics 同次自然触发成功。两个旧 Canva/Notion coverage 任务在正式锁串行下手动复验，分别于 02:13:19、02:13:54 成功；不计入自然调度。新观测 Canva 92 条、Notion 50 条均 pending/anomaly=true，产品 draft、正式价格 0。积压从 36 降至 31。恢复后的日级任务尚未全部自然到点，旧数据库成功记录缺口保留。积压基线 36 项，不删除不同用途的 daily/stale/anomaly/coverage 任务来减少计数。

服务器新增保全 journal-incident-window.txt 和 history-evidence/。故障窗口有 hypervisor initiated shutdown，未发现 EXT4/I/O/OOM 线索；shell 历史唯一匹配清理命令针对旧 geosub-web.service，并非 PGDATA，但无时间戳且历史不完整，不能据此排除人为或存储问题。已请求服务商控制台只读访问，以查 10 月 19 日 23:00–23:40 北京时间磁盘、快照及操作记录。根因未定，缺失增量未找回。

私有证据：work/private/db-recovery-20261020/followup-20261020.sql 与同名 txt、heygen-regression.log；生产四项 *-stale-recheck.log。只提交摘要，不提交日志、数据库或凭据。

用户无法确认服务商控制台入口，外部关机/存储操作记录暂缺。2.13.3 版本递增后的完整本地 release-check 已通过。

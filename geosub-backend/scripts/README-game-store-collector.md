# 游戏商店采集首期

本地功能分支以 GeoSub 2.33.2 为基线，按 L2 Feature 验收官方购买项的采集、送审和读取。GTA 6 配置 PS5 和 Xbox 在香港、美国的标准版与终极版，以及各商店的独立升级包。中文页面复用 V7 的头图、版本卡和升级包横条。

## 配置与运行

正式结构迁移为 `sql/schema/062_game_offers.sql`，由仓库迁移清单管理。已有 HK 和 US 地区后，单独运行 `sql/isolated/configure-gta6-stores.sql` 注册 8 个本体目标和 4 个升级包目标。首次只启用 PS5、Xbox 港服标准版，其余 10 个任务带首期暂停标记。重复注册保留已有任务的状态。新建游戏产品默认草稿。

对每个任务执行以下命令，经过常规调度器、采集器和运行日志。在 Linux 部署中使用同一入口的加锁包装脚本 `deploy/linux-arm64/run-collector-jobs.sh`。

```powershell
pwsh -NoProfile -File scripts/run-collector-jobs.ps1 -JobId <job-uuid> -Force
```

`collector_job_runs.raw_payload.game_offer` 保存来源、核价时间和原币价格。成功采集生成待审记录。运营人员在「异常审核 → 游戏报价审核」对照官方商品、两次报价和异常原因，通过或驳回并填写理由。服务器验证 manage 权限，在同一事务内保存状态、审核人、时间、理由和上次核准快照，审计日志关联采集 run ID。核准基线发生变化时，旧表单须刷新。旧审核记录缺少经办人或理由时按实际缺失显示。

```sql
SELECT platform, market, edition, offer_type, status,
       verified_at, valid_until, currency, price->>'public_price' AS public_price
FROM game_offer_public_state
WHERE product_id = (SELECT id FROM products WHERE slug = 'gta-6');
```

## 取价证据

- PlayStation 使用未登录商品页的主购买组件。核对目标市场、商品 ID、SKU、购买动作、OUTRIGHT 资格和结构化 ISO 币种，再把港币最小单位转换为元。确定的会员买断价可作为明细。升级包页面的 `DONT_OWN` 保留在证据中，`unavailable` 描述本次匿名网页渠道。
- Xbox 使用目标商品首选 SKU 的可购买项，并与该商品的公开结构化 Offer 核对。订阅资格、附加内容、其他版本分别处理。港服样本中的 568、708、140、38 均保留在离线样本。Xbox 首期仅发布可确认的公开买断价，有会员资格但档位证据不足时留空。
- 三份精简样本来自 2026-11-23 匿名访问的官方商品页，文件附原始页面 SHA-256。测试使用实际购买数据的最小字段；会话、遥测和整页商品描述不入库。[PS5 标准版](https://store.playstation.com/zh-hant-hk/product/EP1004-PPSA01547_00-GTAVISTANDARD001) · [Xbox 标准版](https://www.xbox.com/zh-HK/games/store/grand-theft-auto-vi/9np019g7nzxt) · [PS5 升级包](https://store.playstation.com/zh-hant-hk/product/EP1004-PPSA01547_00-ULTEDTIONUPGRADE)

## 促销到点与重试

读视图在 `now() >= valid_until` 时返回空价。审批事务同时按目标与结束时间登记重采，首次派发时间为促销结束后 5 分钟。可选的 `geosub-game-promo.timer` 每分钟检查一次，与常规任务共用采集锁。两个 unit 文件位于 `deploy/linux-arm64/systemd/`。配置安装与启用是独立操作。健康运行时首次派发目标为到期后 5–10 分钟；共享批次长时间占锁会推迟调度。运营可从 `game_promo_rechecks` 监测首次派发积压、租约与耗尽状态。

重复触发由事件主键、行锁和租约令牌去重。失败后分别退避 5、15 分钟，最多尝试 3 次。新证据仍需审核。已有公开促销延长或撤销时，旧事件自动取消。

## 本地验收与回退

```sh
node --test tests/game-store-offers.test.mjs
psql -X -v ON_ERROR_STOP=1 -f tests/game-store-database.sql
```

数据库用例在独立测试库事务内构造调价、过期、延期、重复派发、超时、晚审批及不可售记录，并回滚。回退时停用新增的游戏目标任务和可选促销计时器，切回此前的采集版本。游戏证据和审核历史可保留。

## 页面与读接口

`/zh/games/gta-6` 首屏由服务端渲染，状态切换从同源的 `GET /api/games/gta-6/offers?platform=xbox&display_currency=CNY` 读取。产品需要已发布，目标观测需要审核通过。PC 入口返回空报价。网页和接口均使用动态读取；页面保留 noindex。原币金额来自审核观测，折算使用同一来源和日期的美元基准汇率。缺少可用汇率时仍展示原币。首次待核验、已过期或不可购买的目标均保留官方链接。已打开标签页会在报价有效期或会员价结束时更新，恢复前台时重新核对。

在隔离库内核准观测、发布测试产品并载入 HKD、CNY 汇率后即可预览。只读浏览器回归使用 `ai-price-site/e2e/game-store-offers.spec.ts` 与 `GEOSUB_GAME_TEST=1`。逐条审核回归使用 `ai-price-site/e2e/game-offer-review.spec.ts`、`GEOSUB_GAME_REVIEW_TEST=1` 与名称以 `_test` 结尾的独立本地数据库，预览服务连接同一测试库。用例从 HK$568 开始，通过 HK$500 并驳回 HK$5，核对旧表单、审计日志、对美差价和其余 11 条报价。

## 生产迁移与首批运行安排

1. 发布负责人对照发布分支核对迁移 062，按发布流程备份并确认恢复点，为运行记录表创建组合唯一索引预留窗口。锁等待为 5 秒，语句超时为 60 秒，失败时事务回滚。已有独立研发稿的开发库需先核对结构。
2. 在采集器和后台审核已就绪的窗口执行注册脚本。核对两条启用任务均为 HK / standard / full_game，另外十条处于暂停状态。已有任务保留原状态，升级旧试点时需额外核对。游戏保持草稿，通过现有定时器采集，核对调度日志、两条成功 run、`game_run_mode=regular_due` 和两条待审记录。
3. 审核人分别打开 PS5 和 Xbox 的港服官方商品，核对商品 ID、版本与普通用户公开港币价，填写实际核对理由，并在审核历史和 `game_offer_public_state` 中确认结果。出现驳回、缺价或过期时，维持两目标试点。
4. 试点验收并获扩容批准后，单独运行 `sql/isolated/expand-gta6-stores.sql`。脚本检查两个平台最新有效报价的常规采集证据和人工核准日志，只解除带首期标记的暂停任务。其余目标继续逐条审核。发布游戏产品和对外展示另行安排。
5. 回退时暂停本游戏的采集，保留观测与审核证据。已经对外展示时，先将游戏撤回草稿，再按正式发布流程回退应用。

## 2.34.0 发布候选

062 的 SHA-256 为 `ff408048598ca60f6c84a4d73a6c3eb6701799739470739947eeac4a76adf3e3`。发布控制器按此值核对脚本。内容读取契约的 35 项输入中只有 VERSION 变化，34 项文件与 2.33.2 主线逐字节相同。候选指纹为 `1011974ddcea8bdfb0cce4e9970d6391e800e5a25b55b9b7a280cb6f5c1fd9f0`，2.33.2 指纹为 `6b96303dc2ef2e950fb981d273cd8f537908173c4818e70b5d1073c83257412a`。沿用 18 个已经审核的旧版读取范围，并登记到 2.33.2（`8a92e0a14568a1f681f0d1a88438617e752ad8d8`）的精确内容兼容关系。该登记用于发布控制器的兼容性检查。试点异常时只停用新增游戏任务与已启用的促销定时器，保留观测、审核和数据表。

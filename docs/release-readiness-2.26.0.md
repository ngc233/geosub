# 2.26.0 T10 发布准备（2026-11-05）

类型 Improvement，风险 L3。本 PR 只做发布准备，不安装控制器、不发布、不配置 R2、不运行生产备份或恢复。Claude 审核后由产品负责人合并；合并 SHA 的 CI、版本门禁、迁移判定和生产基线复查后，再单独批准发布。新增备份能力按版本规范使用 minor：2.25.1 → 2.26.0。

## 候选范围与线上基线

基于 main `00a71a82e96a502d32f7a8c29e1740ac3596cc3e`（PR #41 合并）。本 PR 仅同步 VERSION、前后端 package.json/lock、CHANGELOG、追加精确内容兼容登记和本说明，不改运行逻辑或受保护规则。

2026-11-05 21:15:34（Asia/Shanghai）只读复查：

- 当前线上：2.25.1 / `ed3ec9bb42ef9ca210b70384e64e29c5bfc45fbe`，构建 `ed3ec9bb42ef-20261105T023956Z-586` 存在。
- control 指向该提交的控制目录；发布锁不存在。
- previous 为 2.25.0 / `ad71456c3d50bdf89ad64d7ec4e10e714b6cec5d`，构建 `ad71456c3d50-20261104T083011Z-346` 仍存在。此次若发布成功，直接回退点应为上面的 2.25.1，届时以实际回执为准。
- 对线上 active 构建的 28 个内容契约文件逐个计算 SHA-256，全部等于该提交的 Git 文件；不读取数据库业务数据或凭据。

**发布 main 会包含已合并的全部差异，不是只带 T10**：相对线上包含 PR #40（公共设计基础）、PR #39（中文 Plus 撤回记录）及 PR #41（备份）。本 PR 不重写这些内容；Claude 和产品负责人须在实际发布批准时核对完整范围。完整 CI 的浏览器检查仍须通过。

## 版本、迁移与安装路径

五个版本文件及两个 lock 的 root package 同步为 2.26.0。运行 `scripts/release-check.ps1 -BaselineRef origin/main`，并以线上 SHA 再执行 `scripts/check-release-version.mjs --baseline-ref ed3ec9bb42ef9ca210b70384e64e29c5bfc45fbe`。

使用生产控制器同一 `component-release-lib.mjs` 的 `migrationPlan()`，输入线上 SHA 到本候选的完整变更文件列表：`required=false, files=[], reason=database-inputs-unchanged`。不运行生产 SQL/Prisma，不升级采集组件，不重建 PostgreSQL。测试库的初始化和迁移仅用于隔离验收，不能当作生产变更授权。

目前备份 service 经 `releases/live/.../run-system-task.sh` 调用 `releases/live/.../db-backup.sh`。标准网站滚动发布切换 live 后，后续备份会使用新脚本及两个同目录 Python 文件。控制器脚本相对线上未变，无须为 T10 单独改写或重装控制器；正式发布前仍核验 control、调用链和哈希。新脚本的 SHA-256：

| 文件（均在 geosub-backend/deploy/linux-arm64/） | SHA-256 |
| --- | --- |
| db-backup.sh | `20bf9304bf3eb08807f45b223775775c7ee48a58f7ed4f8e33c3b06e87b92e79` |
| db-backup-snapshot.py | `a657e7ceb41376b17b95cf4fa21f904ad446e2629a0b3ec5e13c7df0f55d0822` |
| db-backup-remote.py | `fc399fc499f027e8340da6924c2b5b82db50cef8885cf9cea47afc1d712a5300` |

每日 02:40 + 0–20 分钟随机延迟、service 30 分钟上限、本机保留 14 天不变。未配置 R2 时本机备份成功并警告，不代表异地备份已启用。发布后由产品负责人按 [启用手册](operations/backup-restore-drill.md) 填写独立环境文件和凭据；不读取/复制/修改生产 `.env`。首次真实上传及隔离恢复由 Claude 验收；T09 上线前由 Claude 每日核查上传完整标记、校验结果和日期。此 PR 不实现通知。

## 精确回退登记与验证

原有 79 条登记保持原文，只追加 5 条；前四条继承 2.25.1 已有登记的 retainedCommit、toFiles、targets 与 facts 范围。新候选指纹重新计算为：

`a9c431f571880f0a5387624639591e50802896b2c6208724a05feafd779e47f6`

只对**当前线上 2.25.1**作如下差异断言：28 个契约文件中仅 VERSION 不同，内容读取器、rolling-release.mjs 和 rolling-release-lib.mjs 均逐字相同。T10 备份脚本不在内容契约内。较老历史目标仍含原有控制器差异，本说明不把它们说成“仅 VERSION 不同”。

| 保留目标 | 登记范围 | 本次实际验证 |
| --- | --- | --- |
| `ead5051bb786a6cc16d0791ad463667e9fe1b0b4` | 英文 ChatGPT（无 facts）；中英文 Claude（含 facts），原 26 文件 | 原始 content-store 套件：51 项 + a3e1cf7 的 9 场景，通过 |
| `a3e1cf78ffe4f163384dfd578846feb4ba36a50f` | 仅英文 ChatGPT、无 facts，原 9 文件 | 9 个真实 PostgreSQL 场景，含历史/新写入读取、渲染一致、越权范围拒绝，通过 |
| `ad71456c3d50bdf89ad64d7ec4e10e714b6cec5d` | 三目标，facts 同第一行，原 28 文件 | 替换读取源为该精确 Git 提交，原断言不改：51 项 + 9 场景，通过 |
| `d4f80b96f59b443e297a15f956e6bde776b7e9eb` | 仅英文 ChatGPT、无 facts，原 28 文件 | test-price-version-upgrade：16 项，通过；真实隔离库、5,000 合成行、旧客户端、备份恢复、权限及事务失败断言 |
| `ed3ec9bb42ef9ca210b70384e64e29c5bfc45fbe`（本次线上回退点） | 三目标，facts 同第一行，28 文件 | 线上文件哈希与 Git 一致；精确 Git 读取器 51 项 + 9 场景，通过 |

各组独立重算 from/to 指纹；逐组验证允许精确登记、反向拒绝、缺登记拒绝、任一文件字节变化拒绝。正式指纹见追加的 JSON 记录；所有范围不授予内容激活权限。真实 PostgreSQL 断言验证历史保留；Next 缓存和 HTTP/CDN 回执明确使用测试替身，不冒充公网验收。

额外读取器演练可在已迁移、空白的本机 `geosub_release_YYYYMMDD` 测试库、前端依赖就绪后复现。设置仅指向该测试库的 DATABASE_URL，在仓库根目录运行下面代码，参数分别用 ad71456… 和 ed3ec9b… 的完整 SHA。它只在内存中替换读取器来源，不编辑测试文件或改变断言：

```bash
node - ad71456c3d50bdf89ad64d7ec4e10e714b6cec5d <<'JS'
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const target = process.argv[2];
if (!['ad71456c3d50bdf89ad64d7ec4e10e714b6cec5d', 'ed3ec9bb42ef9ca210b70384e64e29c5bfc45fbe'].includes(target)) throw Error('Unexpected retained SHA');
const root = process.cwd();
process.chdir(path.join(root, 'ai-price-site'));
const file = path.join(process.cwd(), 'scripts/test-content-release-gates.cjs');
let source = fs.readFileSync(file, 'utf8');
source = source.replace("retained='ead5051bb786a6cc16d0791ad463667e9fe1b0b4'", `retained='${target}'`);
source = source.replace('function retainedSource(ref,file) {', `function retainedSource(ref,file) {
 if (ref === '${target}') return require('node:child_process').execFileSync('git', ['show', ref + ':' + file], {cwd: root, encoding: 'utf8'});`);
const m = new Module(file, module);
m.filename = file; m.paths = Module._nodeModulePaths(path.dirname(file));
m._compile(source, file);
JS
```

## 发布后验收及回退边界

- Claude 对照最终合并 SHA 检查 health 版本/完整提交号、核心页面/静态资源、定时器、后台采集及保留回退构建；运行至少 5 分钟标准 observe。因含 PR #40，检查公共样式和浏览器回归。
- 对照上表确认 live 下备份脚本和 Python 文件；未配置 R2 不能宣称完成异地备份。负责人配置后，核验真实四件套顺序、完成标记、回读校验、隔离恢复及关键表行数；不得在生产库恢复。
- 本地/CI T10 10 项测试通过：同一快照并发写入、主环境远端赋值不影响本机备份、S3 完成顺序/重试/错误/损坏/分页、凭据不泄漏和隔离恢复。只使用本机模拟服务及测试凭据；真实 R2 的认证、Bucket Lock、生命周期和上传/恢复仍待上线后验收。
- 如需回退，另获批准，按标准 retained-build rollback 回到记录中的 2.25.1；不恢复数据库、不删备份、不改采集版本或内容锁。控制器在本次失败发布中自动恢复旧构建按该次发布授权处理。
- **应用回退也会使 live 指向旧备份脚本**：旧版没有 T10 同一快照与 R2 上传，可能继续本机备份却不再异地上传。远端既有对象不删除；回退后必须明确报告上传已停止，由 Claude 核查和负责人裁定恢复方案，不能把 service 成功等同于远端上传成功。
- 生产部署、R2 配置、首次真实备份及隔离恢复均未执行。PR 的最终 CI 结果与运行链接见 PR 描述；本文是准备证据，不替代最终合并提交的复核和一次性发布授权。

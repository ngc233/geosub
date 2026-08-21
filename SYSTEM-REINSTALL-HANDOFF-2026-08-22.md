# GeoSub 系统重装无缝交接档

更新时间：2026-08-22（Asia/Singapore）

适用项目：GeoSub 生产基线

仓库：`https://github.com/ngc233/geosub.git`

## 1. 唯一可信恢复点

重装后不要从旧压缩包、旧工作区或其他日期目录拼接代码。唯一可信代码源是 GitHub `main`。当前生产应用基线为：

```text
版本：2.9.0
提交：51c8d4d8b547c15160c01a1389a1416b12b25b64
提交说明：feat(analytics): add cookieless daily page totals
```

应用发布完成时以下引用均指向同一提交：

- `origin/codex/deepmerge-cve-2026-40345`
- 生产服务器 `/opt/geosub/geosub` 的 `main`

本交接档会作为后续纯文档提交推到 `main`，所以重装后 `main` 的 HEAD 应晚于上述应用提交。`51c8d4d` 必须仍是 HEAD 的祖先；生产服务器无需为了纯文档提交重新构建。本交接档生成前，本地工作树为 clean。重装后的第一项工作必须再次验证提交和工作树，不要凭目录名称判断版本。

## 2. 当前生产状态

生产站点：`https://geosub.org/zh`

健康接口：`https://geosub.org/api/health`

最近一次成功发布：

```text
部署 ID：20260821T170126Z
状态：succeeded
步骤：complete
上一提交：f2d6e0220e1501b590bbcf7b3225a0b882a954f4
当前提交：51c8d4d8b547c15160c01a1389a1416b12b25b64
部署时间：2026-08-21T17:04:54Z
验证备份：/opt/geosub/backups/geosub_app_20260821T170131Z.dump
```

发布完成时：

- Web 服务和 8 个生产定时任务均为 `active`。
- 生产健康接口的 process/database 均为 `ok`。
- 生产构建成功，共生成 141 个页面。
- Post-deploy：0 failures，2 warnings。
- Sitemap：142 个规范 URL，动态哨兵和所有公开 URL 的直接 HTTP 200 检查通过。
- Prisma：14 个迁移已应用，无待执行迁移。
- 常规升级明确跳过 backfills。

两个非阻断警告：

1. 3 条已发布 App Store 价格超过 14 天，需要正常采集周期处理。
2. Cloudflare 公开价格页缓存状态仍显示 `DYNAMIC`，源站已经发送正确的 `cdn-cache-control`。

生产数据库和服务器不会因为本地 Windows 重装而消失。不要为了“恢复本地”去覆盖、还原或重建生产数据库。

## 3. 最新功能与修复

当前提交包含：

- 第二套无 Cookie 页面汇总：只保存 UTC 日期、标准化页面路径和累计次数。
- 不创建访客 ID、会话 ID，不写单次访问事件，不在应用统计中保存原始 IP、User-Agent 或 Referrer。
- `/api/page-views` 具有路径、请求大小、Origin、Fetch-Site 和 Referer 校验。
- Cookie 同意统计继续单独负责用户级访问、点击、归因和漏斗。
- 后台增加“今日全站浏览”，趋势图和 CSV 区分全站汇总与已同意行为。
- 隐私说明已更新到 12 种语言。
- 后台同页筛选和表单操作保留滚动位置，不再自动跳回第一屏。
- 后台 30 天及更长周期查询已经过合并和性能优化。

发布前验证：完整 `preflight:full`、500 个测试、TypeScript、ESLint、生产构建全部通过。

## 4. 重装前必须手工备份的私密资料

下面内容不在 GitHub。重装前必须复制到加密 U 盘、加密磁盘或可信密码库；不要提交到仓库，也不要发送到聊天或普通网盘：

```text
<仓库目录>\ai-price-site\.env
<仓库目录>\ai-price-site\.env.local
%USERPROFILE%\.ssh\geosub_codex_deploy_v2_ed25519
%USERPROFILE%\.ssh\geosub_codex_deploy_v2_ed25519.pub
%USERPROFILE%\.ssh\known_hosts
%USERPROFILE%\.codex\memories
```

已确认本机存在前端 `.env`、`.env.local`、部署公钥和 Codex memories；部署私钥及 `known_hosts` 已实际用于本次成功发布。由于权限保护，交接过程没有读取或复制私钥内容。

还需要自行确认：

- GitHub 登录或 Personal Access Token 能否重新取得。
- 服务器控制面板账号与服务器地址是否保存在密码管理器。
- GeoSub 后台管理员密码是否保存在密码管理器。它不在 GitHub。
- Google Search Console、Bing Webmaster Tools、Cloudflare 和域名注册商的登录/二次验证恢复方式。
- 浏览器登录状态重装后会丢失；这不是代码故障。

不要把生产 `/etc/geosub/geosub.env` 下载进仓库。它保留在服务器上，本地系统重装不会修改它。

## 5. 是否备份本地数据库

生产数据以服务器 PostgreSQL 为准，本地 Docker 数据主要用于开发验证。若不需要保留本地采集和测试数据，可以重装后创建新的本地数据库。

如果需要保留当前本地数据库，重装前在一个专用备份目录运行：

```powershell
docker exec geosub-postgres pg_dump -U geosub_admin -d geosub_app -Fc -f /tmp/geosub_local_before_reinstall.dump
docker cp geosub-postgres:/tmp/geosub_local_before_reinstall.dump .\geosub_local_before_reinstall.dump
```

把 dump 与私密配置一起放入加密备份，不要提交 Git。恢复只能针对新建的本地数据库，绝不能把本地 dump 指向生产。

## 6. 重装后的基础软件

建议安装：

- Git for Windows
- Node.js 22 LTS（项目要求 `>=22 <23`）
- Docker Desktop
- PowerShell 7
- Codex / ChatGPT Desktop（如继续使用）
- 一个可靠的密码管理器

验证：

```powershell
git --version
node --version
npm.cmd --version
docker version
```

## 7. 从零恢复代码

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\Documents\Codex\GeoSub" | Out-Null
Set-Location "$env:USERPROFILE\Documents\Codex\GeoSub"
git clone https://github.com/ngc233/geosub.git geosub-production-baseline
Set-Location .\geosub-production-baseline
git switch main
git status --short --branch
git rev-parse HEAD
git merge-base --is-ancestor 51c8d4d8b547c15160c01a1389a1416b12b25b64 HEAD
```

预期：最后一条命令退出码为 0，说明当前 `main` 包含已部署应用基线：

```text
51c8d4d8b547c15160c01a1389a1416b12b25b64
```

GitHub `main` 会至少包含本交接档对应的纯文档提交，因此 HEAD 通常不会等于上面的应用提交。以最新 `main` 为准，但先阅读本文件之后新增的提交，不要强行 reset 回旧提交。

## 8. 恢复本地私密配置

把加密备份中的文件恢复到新克隆目录：

```text
geosub-production-baseline\ai-price-site\.env
geosub-production-baseline\ai-price-site\.env.local
```

把部署密钥恢复到：

```text
%USERPROFILE%\.ssh\geosub_codex_deploy_v2_ed25519
%USERPROFILE%\.ssh\geosub_codex_deploy_v2_ed25519.pub
%USERPROFILE%\.ssh\known_hosts
```

不要用 `.env.example` 覆盖恢复出的真实 `.env`。示例文件只能用于字段对照。

## 9. 恢复依赖和本地数据库

```powershell
Set-Location "$env:USERPROFILE\Documents\Codex\GeoSub\geosub-production-baseline\ai-price-site"
npm.cmd ci
npx.cmd prisma generate
npm.cmd run db:doctor
npm.cmd run db:up
npm.cmd run db:migrate
npm.cmd run db:status
npm.cmd run check:local
```

若 npm 全局缓存出现 EPERM，可使用仓库内缓存重试：

```powershell
npm.cmd ci --cache .npm-cache
```

注意：

- 不要为了消除状态提示运行 `db:backfill`。
- 当前有 10 个历史内容 backfill 未执行，这是有意保留的边界，不是安装失败。
- Prisma 出现大量异常类型错误时，先重新运行 `npx.cmd prisma generate`。
- 不要把任何本地 E2E 或恢复命令指向生产数据库。

## 10. 启动与浏览器验证

```powershell
npm.cmd run dev -- --port 3012
```

打开：

```text
http://127.0.0.1:3012/zh
http://127.0.0.1:3012/zh/privacy
http://127.0.0.1:3012/admin-login
```

最低验证项：

1. 首页、产品列表、ChatGPT Plus、隐私页均可打开。
2. 桌面和 390 x 844 移动视图没有横向溢出。
3. 控制台没有新增错误。
4. 拒绝统计后，用户级事件不增加，但 `cookieless_page_views` 日汇总仍增加。
5. 后台同页筛选/按钮操作后，滚动位置不会跳回顶部。

## 11. 完整发布前验证

普通代码检查：

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

数据库健康时的完整门禁：

```powershell
npm.cmd run preflight:full
```

只有完整门禁通过、工作树内容明确且用户明确批准后，才允许提交、推送或部署。

## 12. 生产服务器操作边界

生产目录：

```text
/opt/geosub/geosub
/opt/geosub/geosub-backend
/opt/geosub/ai-price-site
/opt/geosub/releases
/opt/geosub/backups
/etc/geosub/geosub.env
```

常规升级命令：

```bash
sudo bash /opt/geosub/geosub-backend/deploy/linux-arm64/upgrade.sh
```

升级脚本会备份数据库、拉取 `main`、安装依赖、构建、执行 schema/Prisma migrations、跳过普通 backfills、重启服务并运行 post-deploy 门禁。

部署密钥文件名：

```text
geosub_codex_deploy_v2_ed25519
```

服务器地址不要写入公开仓库；从加密访问笔记、密码管理器或服务器控制面板取得。首次连接不要关闭主机密钥校验。

2026-08-22 发布时曾发现服务器仓库 `.git/objects` 中混有 root 所有的对象目录，导致 `geosub` 用户无法 fetch。已将整个 `.git` 恢复为 `geosub:geosub` 并通过 `git fsck --connectivity-only`。如果未来再次出现 `insufficient permission for adding an object`，先检查所有权，不要删除 `.git` 或重新克隆覆盖生产工作树。

## 13. 回滚边界

查看最近部署证据：

```bash
sudo cat /opt/geosub/releases/latest-attempt.env
```

应用回滚必须使用仓库提供的 `rollback.sh`，并提供准确 deployment ID 与确认参数。不要手工 `git reset --hard`，不要把数据库跟着代码一起恢复。数据库恢复会丢弃备份之后的线上写入，必须单独获得明确授权。

## 14. 重装后给 Codex 的第一条提示词

复制以下内容到新任务：

```text
继续 GeoSub。先完整阅读仓库根目录 SYSTEM-REINSTALL-HANDOFF-2026-08-22.md 和 PROJECT-HANDOFF.md。
唯一可信代码源是 https://github.com/ngc233/geosub.git 的 main；先验证 git status、HEAD、VERSION、Node 22、Docker/PostgreSQL 和 http://127.0.0.1:3012/zh。
不要从旧目录复制代码，不要自动运行 backfill，不要修改生产数据库、SEO 站长设置、GitHub 或服务器，除非我明确授权。
当前生产基线为 v2.9.0 / 51c8d4d8b547c15160c01a1389a1416b12b25b64；如果 main 已前进，先审阅新增提交再继续。
需要浏览器可见的改动时，必须运行真实本地站点并验证桌面、390x844 移动布局、交互、控制台和横向溢出。
先汇报当前环境与仓库状态，再提出下一步。
```

## 15. 重装前最终勾选清单

- [ ] 本文件已提交并推送到 GitHub `main`。
- [ ] GitHub 页面能看到本文件。
- [ ] `.env` 和 `.env.local` 已放入加密备份。
- [ ] SSH 私钥、公钥和 `known_hosts` 已放入加密备份。
- [ ] GitHub、服务器、Cloudflare、域名、Google、Bing 的账号与 2FA 恢复方式已确认。
- [ ] GeoSub 后台密码已保存。
- [ ] 如需保留，本地 PostgreSQL dump 已生成并校验文件大小。
- [ ] Codex memories 已备份；即使不恢复，使用第 14 节提示词也可继续。
- [ ] 确认生产健康接口仍为 `ok` 后再开始重装。

未完成以上私密资料备份前，不要重装系统。

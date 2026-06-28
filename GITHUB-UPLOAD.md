# GitHub 上传步骤

当前 Windows 环境没有检测到 Git，所以这个目录已经整理成可上传版本，但还没有本地提交。

## 方式一：到 Mac 上上传

1. 解压 `geosub-github-ready.zip`。
2. 打开终端，进入目录：

```bash
cd geosub-github-ready
```

3. 初始化 Git：

```bash
git init
git add .
git commit -m "Initial GeoSub project"
```

4. 在 GitHub 新建一个 Private repository，例如 `geosub`。

5. 连接远程仓库并推送：

```bash
git remote add origin https://github.com/YOUR_NAME/geosub.git
git branch -M main
git push -u origin main
```

## 方式二：GitHub 网页上传

1. 在 GitHub 新建 Private repository。
2. 解压 `geosub-github-ready.zip`。
3. 在 GitHub 网页选择 Upload files。
4. 上传解压后的文件夹内容。

网页上传适合第一次备份，但后续开发建议安装 Git，用 `git pull` 和 `git push` 同步。

## 不要上传的内容

这个准备目录已经排除了：

- `.env`
- `.env.local`
- 数据库 dump
- `node_modules`
- `.next`
- 本地 PostgreSQL 数据目录
- logs / backups / uploads

数据库请继续用单独备份文件保存，不要放进 GitHub。

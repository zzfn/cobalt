# 自动更新快速开始

## 5 分钟配置自动更新

### 1️⃣ 运行配置脚本

```bash
./scripts/setup-updater.sh
```

脚本会自动：
- ✅ 生成签名密钥对
- ✅ 配置公钥到 `tauri.conf.json`
- ✅ 显示私钥内容（用于 GitHub Secrets）
- ✅ 配置 GitHub 仓库信息

### 2️⃣ 配置 GitHub Secrets

1. 访问 GitHub 仓库设置页面
2. 进入 `Settings` → `Secrets and variables` → `Actions`
3. 点击 `New repository secret`
4. 添加以下 Secret：
   - **名称**: `TAURI_PRIVATE_KEY`
   - **值**: 脚本输出的私钥内容

### 3️⃣ 安装依赖

```bash
pnpm install
```

### 4️⃣ 发布新版本

```bash
# 更新版本号并推送 tag
make tag-release VERSION=0.3.0
```

GitHub Actions 会自动：
- 构建应用
- 签名更新包
- 创建 GitHub Release
- 生成 `latest.json`

### 5️⃣ 测试更新

1. 下载并安装旧版本应用
2. 启动应用
3. 应用会自动检测到新版本
4. 点击"立即更新"测试更新流程

## 🎉 完成！

现在你的应用已支持自动更新功能。每次发布新版本时，用户都会自动收到更新通知。

## 📚 更多信息

- [完整配置指南](AUTO_UPDATE.md)
- [Tauri Updater 文档](https://tauri.app/v1/guides/distribution/updater)

## ❓ 常见问题

### Q: 如何手动检查更新？

A: 应用启动时会自动检查。未来可以添加"检查更新"菜单项。

### Q: 更新失败怎么办？

A: 检查以下几点：
- GitHub Release 是否正确创建
- `latest.json` 格式是否正确
- 签名文件是否上传
- 公钥和私钥是否匹配

### Q: 如何禁用自动更新？

A: 在 `src-tauri/tauri.conf.json` 中设置：
```json
{
  "plugins": {
    "updater": {
      "active": false
    }
  }
}
```

### Q: 支持哪些平台？

A: 目前支持：
- macOS (Intel + Apple Silicon)
- Windows (即将支持)
- Linux (即将支持)

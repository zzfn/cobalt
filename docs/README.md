# 文档索引

## 📚 自动更新相关文档

### 快速开始
- **[快速开始指南](QUICK_START_UPDATE.md)** - 5 分钟配置自动更新
- **[配置检查清单](UPDATE_CHECKLIST.md)** - 发布前的完整检查清单

### 详细文档
- **[完整配置指南](AUTO_UPDATE.md)** - 详细的配置步骤和故障排查
- **[实现总结](IMPLEMENTATION_SUMMARY.md)** - 技术实现细节和架构说明
- **[更新流程图](update-flow.txt)** - 可视化的更新流程

## 🚀 推荐阅读顺序

### 首次配置
1. 阅读 [快速开始指南](QUICK_START_UPDATE.md)
2. 运行配置脚本: `./scripts/setup-updater.sh`
3. 参考 [配置检查清单](UPDATE_CHECKLIST.md) 逐项完成
4. 如遇问题，查看 [完整配置指南](AUTO_UPDATE.md)

### 深入了解
1. 阅读 [实现总结](IMPLEMENTATION_SUMMARY.md) 了解技术细节
2. 查看 [更新流程图](update-flow.txt) 理解整体流程
3. 参考 [完整配置指南](AUTO_UPDATE.md) 的高级配置

### 日常使用
1. 发布新版本: `make tag-release VERSION=x.x.x`
2. 如遇问题，查看 [完整配置指南](AUTO_UPDATE.md) 的故障排查部分

## 📖 文档说明

| 文档 | 用途 | 适合人群 |
|------|------|----------|
| [快速开始指南](QUICK_START_UPDATE.md) | 5 分钟快速配置 | 所有人 |
| [配置检查清单](UPDATE_CHECKLIST.md) | 发布前检查 | 开发者 |
| [完整配置指南](AUTO_UPDATE.md) | 详细配置和故障排查 | 开发者 |
| [实现总结](IMPLEMENTATION_SUMMARY.md) | 技术实现细节 | 开发者/维护者 |
| [更新流程图](update-flow.txt) | 可视化流程 | 所有人 |

## 🛠 相关工具

- **配置脚本**: `scripts/setup-updater.sh`
- **Makefile 命令**:
  - `make generate-keys` - 生成签名密钥
  - `make sign-update` - 签名更新包
  - `make tag-release` - 发布新版本

## 🔗 外部资源

- [Tauri Updater 官方文档](https://tauri.app/v1/guides/distribution/updater)
- [Tauri Action GitHub](https://github.com/tauri-apps/tauri-action)
- [语义化版本规范](https://semver.org/lang/zh-CN/)

## 💡 提示

- 首次配置建议预留 15-30 分钟
- 配置完成后，每次发布只需 1 分钟
- 遇到问题先查看文档的"故障排查"部分
- 保持私钥安全，定期备份

## 📝 反馈

如有问题或建议，请在 GitHub Issues 中反馈。

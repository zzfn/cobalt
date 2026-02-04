# Cobalt - Claude 配置管理工具

一个基于 Tauri + React + TypeScript 构建的 Claude 配置管理桌面应用。

## ✨ 功能特性

- 📝 Claude 配置文件管理
- 🔑 API 密钥配置
- 🎨 技能（Skills）管理
- 🔄 **应用内自动更新**
- 🌙 深色模式支持

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm tauri dev
# 或使用 Makefile
make dev
```

### 构建应用

```bash
# 构建当前架构
pnpm tauri build

# 构建 macOS Universal Binary (Intel + Apple Silicon)
make build-universal
```

## 📦 自动更新

Cobalt 支持应用内自动更新功能，用户无需手动下载新版本。

### 用户使用

- 应用启动时会自动检查更新
- 发现新版本时会弹窗提示
- 点击"立即更新"即可自动下载并安装
- 更新完成后自动重启应用

### 开发者配置

详细配置步骤请参考 [自动更新配置指南](docs/AUTO_UPDATE.md)

快速配置：

1. 生成签名密钥：`make generate-keys`
2. 配置公钥到 `src-tauri/tauri.conf.json`
3. 配置 GitHub Secrets：`TAURI_PRIVATE_KEY`
4. 发布新版本：`make tag-release VERSION=x.x.x`

## 🛠 开发

### 可用命令

```bash
make help              # 查看所有可用命令
make install           # 安装依赖
make dev               # 启动开发服务器
make build-macos       # 构建 macOS 应用
make build-universal   # 构建 Universal Binary
make clean             # 清理构建产物
make version           # 更新版本号
make tag-release       # 创建并推送 release tag
make generate-keys     # 生成更新签名密钥
make sign-update       # 签名更新包
```

### 版本发布流程

```bash
# 1. 更新版本号并创建 tag
make tag-release VERSION=0.3.0

# 2. GitHub Actions 会自动构建并发布
# 3. 用户会自动收到更新通知
```

## 📚 文档

- [自动更新配置指南](docs/AUTO_UPDATE.md)

## 🔧 技术栈

- **前端**: React 19 + TypeScript + Vite
- **UI**: Tailwind CSS + Radix UI
- **状态管理**: Jotai
- **桌面框架**: Tauri 2
- **后端**: Rust

## 💡 推荐 IDE 配置

- [VS Code](https://code.visualstudio.com/)
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## 📄 许可证

MIT

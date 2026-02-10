# Cobalt - Claude 配置管理工具

<div align="center">

![Cobalt Logo](https://img.shields.io/badge/Cobalt-v0.3.4-blue)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)
![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)

一个现代化的 Claude 配置管理桌面应用，基于 Tauri + React + TypeScript 构建。

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [文档](#-文档) • [贡献指南](#-贡献指南)

</div>

---

## 📖 简介

Cobalt 是一款专为 Claude 用户设计的桌面配置管理工具，提供简洁直观的界面来管理 API 密钥、技能配置、工作空间和 Token 使用情况。

## 🎸 应用预览

<!--
请在此处添加应用截图
建议尺寸: 1200x800
格式: ![主界面](screenshots/main-interface.png)
-->

| 主界面 | 设置面板 |
|--------|----------|
| *[添加主界面截图]* | *[添加设置面板截图]* |

## ✨ 功能特性

### 配置管理
- 🔐 **API 密钥管理** - 安全存储和管理 Claude API 密钥
- 📝 **配置文件编辑** - 直观编辑 CLAUDE.md 和 AGENTS.md 文件
- 🌍 **环境变量** - 管理自定义环境变量配置

### 技能系统
- 🎨 **技能管理** - 管理和组织自定义 Skills
- 📦 **远程安装** - 支持从 Git 仓库一键安装 Skills
- 🔄 **版本追踪** - 自动记录 commit hash 和仓库信息
- 🎯 **多源支持** - 支持 GitHub、GitLab、Gitee 等平台
- 🛠 **工具配置** - 配置技能可用的目标工具

### 工作空间与统计
- 📊 **仪表盘** - 直观的项目概览和活动统计
- 📈 **Token 使用分析** - 每日/每小时 Token 使用图表
- 🗂 **工作空间切换** - 快速切换不同的工作空间

### 应用特性
- 🔄 **自动更新** - 应用内自动检查和安装更新，无需手动操作
- 🌙 **深色模式** - 完整的深色/浅色主题支持，跟随系统
- ⚡ **高性能** - 基于 Tauri 的轻量级桌面应用，占用资源少
- 🎯 **跨平台** - 支持 macOS Universal Binary（Intel + Apple Silicon）

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

### 项目结构

```
cobalt/
├── src/                           # 前端源码（React + TypeScript）
│   ├── components/                # React 组件
│   │   ├── ui/                   # 基础 UI 组件
│   │   ├── common/               # 通用组件
│   │   ├── dashboard/            # 仪表盘组件
│   │   ├── layout/               # 布局组件
│   │   └── workspace/            # 工作空间组件
│   ├── pages/                    # 页面组件
│   │   ├── Dashboard.tsx         # 仪表盘
│   │   ├── Settings/             # 设置页面
│   │   ├── Skills/               # 技能管理页面
│   │   └── TokenUsage/           # Token 统计页面
│   ├── router/                   # 路由配置
│   └── main.tsx                  # 应用入口
├── src-tauri/                    # Tauri 后端（Rust）
│   ├── src/                      # Rust 源码
│   └── tauri.conf.json           # Tauri 配置
├── docs/                         # 项目文档
│   └── AUTO_UPDATE.md            # 自动更新配置指南
└── Makefile                      # 构建脚本
```

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

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出改进建议！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范

- 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范
- 使用 TypeScript 编写类型安全的代码
- 保持代码简洁，避免过度工程化

## 📚 文档

- [自动更新配置指南](docs/AUTO_UPDATE.md) - 详细的自动更新功能配置说明

## 🐛 问题反馈

如遇到问题或有功能建议，请在 [Issues](https://github.com/zzfn/cobalt/issues) 中提出。

## 🔧 技术栈

| 领域 | 技术 |
|------|------|
| **前端** | React 19 + TypeScript + Vite |
| **UI 库** | Tailwind CSS 4 + Radix UI + shadcn/ui |
| **状态管理** | Jotai |
| **路由** | React Router v7 |
| **代码编辑** | Monaco Editor |
| **图表** | Recharts |
| **主题** | next-themes |
| **桌面框架** | Tauri 2 |
| **后端** | Rust |

## 💡 推荐 IDE 配置

- [VS Code](https://code.visualstudio.com/)
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证开源。

---

<div align="center">

**用 ⚡ 和 ❤️ 构建**

</div>

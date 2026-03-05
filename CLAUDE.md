# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Cobalt 是一款基于 **Tauri 2 + React 19** 的跨平台桌面应用，为 Claude Code 用户提供配置管理、技能系统、Token 统计等功能。

## 常用命令

```bash
# 开发
make dev              # 启动 Tauri 开发环境（推荐）
pnpm tauri dev        # 同上

# 构建
make build-macos      # 构建当前架构的 macOS 应用
make build-universal  # 构建 Universal Binary（Intel + Apple Silicon）

# 版本与发布
make release-patch    # 升级补丁版本并发布（最常用）
make release-minor    # 升级次版本并发布
make bump-patch       # 仅升级版本号，不发布

# 清理
make clean
```

无测试框架，无 lint 配置。

## 架构

### 技术栈

- **前端**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **UI 组件**: Radix UI + shadcn/ui（配置在 `components.json`）
- **状态管理**: Jotai（原子化，无 Provider 包装）
- **路由**: React Router v7
- **后端**: Tauri 2 + Rust

### 目录结构

```
src/
├── components/         # UI 组件
│   ├── ui/             # shadcn/ui 基础组件
│   ├── common/         # 通用业务组件
│   ├── layout/         # Layout + Sidebar
│   ├── dashboard/      # 仪表盘子组件
│   ├── skills/         # 技能管理对话框
│   └── settings/       # 设置子组件
├── pages/              # 路由页面组件
│   ├── Dashboard.tsx
│   ├── Settings/       # 含 General、Instructions、ClaudeCode 等子页面
│   ├── Skills/         # 含 List、Detail、Marketplace/
│   └── TokenUsage/
├── store/              # Jotai atoms（按功能拆分）
├── services/           # Tauri IPC 调用封装
├── types/              # 全局类型定义
├── hooks/              # 自定义 Hooks
└── router/index.tsx    # 路由配置（除 Dashboard 外均为 lazy 加载）
src-tauri/
└── src/commands/       # Rust IPC 命令（config、skills、workspace、stats、cache）
```

### 数据流

```
React 组件
  → store (Jotai atom)
    → services (invoke Tauri IPC)
      → src-tauri/commands (Rust)
        → 读写本地文件系统 (~/.claude/)
```

### 关键状态模式

所有 atoms 在 `store/` 目录，派生 atom（`atom(get => ...)`）用于计算值，无需手动更新。持久化使用 `atomWithStorage`。

主要 atom 文件：
- `uiAtoms.ts` — 主题、侧边栏折叠
- `workspaceAtoms.ts` — 当前工作区、路径派生
- `skillsAtoms.ts` — 技能列表、过滤器、排序
- `dashboardAtoms.ts` — 统计数据、健康检查

### 技能系统核心类型

```typescript
// src/types/skills.ts
type AiToolType = 'claude-code' | 'cursor' | 'codex' | 'opencode' | 'antigravity' | 'droid'

interface SkillRegistryEntry {
  id: string; name: string; description: string; enabled: boolean
  installedBy?: AiToolType[]
  metadata: SkillMetadata  // 含 targetTools、version、repository、sourceId
}
```

### 路由结构

```
/dashboard
/settings/{general,instructions,claude-code,settings-json,cache}
/token-usage
/skills/list
/skills/marketplace/{list,:sourceId}
/skills/:skillName
```

## Tauri IPC 命令约定

服务层（`src/services/*.ts`）负责封装所有 `invoke()` 调用，页面/组件不直接调用 `invoke`。Rust 命令定义在 `src-tauri/src/commands/`，通过 `mod.rs` 统一注册。

## 版本管理

版本号需同步更新三处：
- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

`make bump-*` / `make release-*` 命令会自动处理这三处同步。

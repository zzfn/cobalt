# Marketplace 数据源 - 最终方案

## 🎯 设计理念

**极简、离线、独立**

- ✅ 内置默认数据源（硬编码在 Rust 代码中）
- ✅ 首次启动自动初始化
- ✅ 完全离线工作
- ✅ 无任何外部依赖
- ✅ 用户可手动添加自定义数据源

## 📦 内置数据源

应用内置了 2 个默认数据源：

```rust
fn get_builtin_sources() -> Vec<(String, String, String, Vec<String>)> {
    vec![
        (
            "https://github.com/anthropics/anthropic-skills".to_string(),
            "Anthropic 官方技能".to_string(),
            "Anthropic 官方维护的 Claude Code 技能集合".to_string(),
            vec!["official".to_string(), "verified".to_string(), "anthropic".to_string()],
        ),
        (
            "https://github.com/vercel-labs/agent-browser".to_string(),
            "Agent Browser".to_string(),
            "Vercel Labs 的浏览器自动化工具，支持 AI Agent 进行网页交互".to_string(),
            vec!["community".to_string(), "browser".to_string(), "automation".to_string(), "vercel".to_string()],
        ),
    ]
}
```

## 🚀 工作流程

### 首次启动

```
应用启动
  ↓
调用 init_default_sources()
  ↓
检查 ~/.cobalt/marketplace.json
  ↓
如果为空，写入内置数据源
  ↓
完成（2 个数据源可用）
```

### 后续启动

```
应用启动
  ↓
调用 init_default_sources()
  ↓
检查 ~/.cobalt/marketplace.json
  ↓
已有数据源，跳过初始化
  ↓
完成
```

## 🛠️ 用户操作

### 1. 查看内置数据源

打开应用 → Skill 市场 → 自动显示 2 个内置数据源

### 2. 手动添加数据源

点击"添加市场源"按钮：
- 输入名称
- 输入 GitHub URL
- 输入描述（可选）
- 输入标签（可选）

### 3. 刷新数据源

点击"刷新全部"按钮，扫描所有数据源的 Skills

### 4. 管理数据源

- 启用/禁用数据源
- 编辑数据源信息
- 删除数据源

## 💾 数据存储

### 配置文件

```
~/.cobalt/marketplace.json
```

### 配置格式

```json
{
  "version": "1.0.0",
  "sources": [
    {
      "id": "uuid",
      "name": "Anthropic 官方技能",
      "url": "https://github.com/anthropics/anthropic-skills",
      "enabled": true,
      "tags": ["official", "verified", "anthropic"],
      "description": "Anthropic 官方维护的 Claude Code 技能集合",
      "priority": 0,
      "lastRefreshed": null,
      "skillCount": 0,
      "autoUpdate": true,
      "isCustom": false
    }
  ],
  "settings": {
    "autoRefreshInterval": 86400,
    "enableAutoUpdate": true
  }
}
```

## 🔧 开发者指南

### 修改内置数据源

编辑 `src-tauri/src/commands/marketplace.rs`：

```rust
fn get_builtin_sources() -> Vec<(String, String, String, Vec<String>)> {
    vec![
        (
            "https://github.com/user/repo".to_string(),
            "数据源名称".to_string(),
            "描述".to_string(),
            vec!["tag1".to_string(), "tag2".to_string()],
        ),
        // 添加更多...
    ]
}
```

### 添加新的内置数据源

在 `get_builtin_sources()` 函数中添加新的元组。

## 📊 功能对比

| 功能 | 支持 |
|------|------|
| 内置数据源 | ✅ |
| 离线工作 | ✅ |
| 手动添加数据源 | ✅ |
| 编辑数据源 | ✅ |
| 删除数据源 | ✅ |
| 刷新数据源 | ✅ |
| 从 URL 导入 | ❌ 已移除 |
| 自动同步 | ❌ 已移除 |
| 远程配置 | ❌ 已移除 |

## 🎉 优势

1. **极简设计** - 只保留核心功能
2. **完全离线** - 无任何网络依赖
3. **隐私友好** - 不请求任何外部 URL
4. **即时可用** - 首次启动立即可用
5. **稳定可靠** - 不依赖外部服务
6. **易于维护** - 代码简洁清晰

## 📝 代码统计

- **Rust 代码**: ~670 行
- **内置数据源**: 2 个
- **外部依赖**: 0 个（网络相关）
- **配置文件**: 0 个（不需要）

## 🚀 使用体验

### 开发者
```bash
# 无需任何配置
pnpm run tauri build
```

### 用户
```
1. 安装应用
2. 打开应用
3. 自动看到 2 个内置数据源
4. 立即可用，无需等待
5. 可手动添加更多数据源
```

## 📚 相关文档

- [快速开始](./MARKETPLACE_QUICKSTART.md)
- [完整文档](./marketplace-sources.md)

---

**这是最终方案，简洁、独立、可靠！** 🎊

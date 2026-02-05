# Marketplace 数据源 - 完全离线方案

## 🎯 设计理念

**完全独立，不依赖外部服务**

- ✅ 内置默认数据源（打包到应用中）
- ✅ 首次启动自动初始化
- ✅ 无需网络连接
- ✅ 无隐私问题
- ✅ 可选的 URL 导入功能

## 📦 内置数据源

应用内置了以下数据源：

1. **Anthropic 官方技能**
   - URL: `https://github.com/anthropics/anthropic-skills`
   - 标签: official, verified, anthropic

2. **Agent Browser**
   - URL: `https://github.com/vercel-labs/agent-browser`
   - 标签: community, browser, automation, vercel

## 🚀 工作流程

### 首次启动

```
应用启动
  ↓
检查是否有数据源
  ↓
如果为空，初始化内置数据源
  ↓
写入 ~/.cobalt/marketplace.json
  ↓
完成
```

### 后续启动

```
应用启动
  ↓
读取 ~/.cobalt/marketplace.json
  ↓
显示已有数据源
  ↓
完成
```

## 🛠️ 用户操作

### 1. 手动添加数据源

点击"添加市场源"按钮，输入：
- 名称
- GitHub URL
- 描述（可选）
- 标签（可选）

### 2. 从 URL 导入（可选）

点击"从 URL 导入"按钮，输入 YAML 配置文件 URL：

```yaml
# 配置文件格式
marketplace:
  sources:
    - name: 数据源名称
      url: https://github.com/user/repo
      description: 描述
      tags: [tag1, tag2]
```

### 3. 刷新数据源

点击"刷新全部"按钮，扫描所有数据源的 Skills。

## 💾 数据存储

### 配置文件位置

```
~/.cobalt/marketplace.json
```

### 配置文件格式

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

在 `get_builtin_sources()` 函数中添加新的元组：

```rust
(
    "https://github.com/new/repo".to_string(),
    "新数据源".to_string(),
    "新数据源的描述".to_string(),
    vec!["new".to_string(), "awesome".to_string()],
),
```

## 📊 对比方案

| 特性 | 远程配置方案 | 内置方案（当前） |
|------|-------------|-----------------|
| 网络依赖 | ❌ 需要 | ✅ 不需要 |
| 隐私 | ❌ 启动请求外部 | ✅ 完全本地 |
| 可靠性 | ❌ 依赖外部服务 | ✅ 完全独立 |
| 首次启动 | ❌ 需要等待网络 | ✅ 即时可用 |
| 更新数据源 | ✅ 自动同步 | ✅ 手动导入 |
| 自定义 | ✅ 支持 | ✅ 支持 |

## 🎉 优势

1. **完全离线** - 无需任何网络连接
2. **隐私友好** - 不请求任何外部 URL
3. **即时可用** - 首次启动立即可用
4. **可靠稳定** - 不依赖外部服务
5. **灵活扩展** - 支持手动添加和 URL 导入

## 📚 相关文档

- [配置文件格式](./SOURCES_CONFIG_FORMAT.md)
- [快速开始](./MARKETPLACE_QUICKSTART.md)

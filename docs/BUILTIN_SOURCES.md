# 内置数据源说明

## 📦 当前内置数据源

应用内置了 **1 个**默认数据源：

### 1. Agent Browser
- **URL**: `https://github.com/vercel-labs/agent-browser`
- **描述**: Vercel Labs 的浏览器自动化工具，支持 AI Agent 进行网页交互
- **标签**: community, browser, automation, vercel
- **状态**: ✅ 公开仓库，可正常访问

## ❌ 移除的数据源

### Anthropic 官方技能
- **原因**: 仓库不存在（404）
- **URL**: ~~`https://github.com/anthropics/anthropic-skills`~~
- **说明**: 该仓库可能尚未创建或已被删除

## 🔍 如何验证仓库

在添加新的内置数据源前，请先验证：

```bash
# 检查仓库是否存在
curl -I https://github.com/user/repo

# 测试克隆
git clone --depth 1 https://github.com/user/repo /tmp/test
```

## ➕ 添加新的内置数据源

编辑 `src-tauri/src/commands/marketplace.rs`：

```rust
fn get_builtin_sources() -> Vec<(String, String, String, Vec<String>)> {
    vec![
        (
            "https://github.com/vercel-labs/agent-browser".to_string(),
            "Agent Browser".to_string(),
            "Vercel Labs 的浏览器自动化工具".to_string(),
            vec!["community".to_string(), "browser".to_string()],
        ),
        // 添加新的数据源
        (
            "https://github.com/user/repo".to_string(),
            "数据源名称".to_string(),
            "描述".to_string(),
            vec!["tag1".to_string(), "tag2".to_string()],
        ),
    ]
}
```

## 📋 推荐的数据源

以下是一些可能有用的公开仓库（需要验证）：

### Claude Code Skills
- 搜索关键词: "claude code skills", "anthropic skills", "claude agent skills"
- GitHub Topics: `claude-code`, `claude-skills`, `ai-agent`

### 社区技能库
- 用户可以通过"添加市场源"手动添加
- 支持任何包含 `SKILL.md` 的 GitHub 仓库

## 🎯 最佳实践

1. **只添加公开仓库**
   - 确保仓库可以无需认证访问
   - 测试 `git clone` 是否成功

2. **验证仓库结构**
   - 包含 `SKILL.md` 文件
   - 或包含 `skills/` 目录

3. **提供清晰的描述**
   - 说明数据源的用途
   - 添加相关标签

## 🚀 用户体验

用户首次启动应用时：
```
✅ 自动初始化 1 个内置数据源
✅ Agent Browser 立即可用
✅ 用户可手动添加更多数据源
```

## 📝 更新日志

- **2026-02-06**: 移除不存在的 Anthropic 仓库
- **2026-02-06**: 保留 Agent Browser 作为唯一内置数据源

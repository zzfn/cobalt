# Cobalt 配置文件格式说明

## 📋 文件结构

`sources.yaml` 是一个通用的配置文件，支持多种配置项。

### 当前支持的配置

#### 1. Marketplace 数据源

```yaml
# Cobalt 配置文件
marketplace:
  sources:
    - name: Anthropic 官方技能
      url: https://github.com/anthropics/anthropic-skills
      description: Anthropic 官方维护的 Claude Code 技能集合
      tags: [official, verified, anthropic]

    - name: Agent Browser
      url: https://github.com/vercel-labs/agent-browser
      description: 浏览器自动化工具
      tags: [community, browser, automation]
```

### 未来可扩展的配置

```yaml
# Cobalt 配置文件

# Marketplace 数据源
marketplace:
  sources:
    - name: ...
      url: ...

# 插件市场（未来支持）
plugins:
  sources:
    - name: ...
      url: ...

# 主题市场（未来支持）
themes:
  sources:
    - name: ...
      url: ...

# 模板市场（未来支持）
templates:
  sources:
    - name: ...
      url: ...

# 其他配置（未来支持）
settings:
  autoUpdate: true
  checkInterval: 86400
```

## 🎯 设计理念

### 1. 可扩展性
- 顶层使用不同的 key 区分不同类型的配置
- 每个配置项都有独立的命名空间
- 添加新配置不影响现有配置

### 2. 向后兼容
- 支持旧的扁平结构（`sources:` 直接在顶层）
- 自动检测并适配新旧格式
- 平滑迁移，无需破坏性更改

### 3. 简洁性
- 每个数据源只需 4 个字段
- 使用 YAML 的简洁语法
- 注释清晰，易于理解

## 📝 字段说明

### Marketplace Sources

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 显示名称 |
| `url` | string | ✅ | GitHub 仓库 URL |
| `description` | string | ❌ | 详细描述 |
| `tags` | array | ❌ | 标签列表 |

## 🔄 格式兼容性

### 新格式（推荐）
```yaml
marketplace:
  sources:
    - name: ...
      url: ...
```

### 旧格式（兼容）
```yaml
sources:
  - name: ...
    url: ...
```

两种格式都能正常工作，应用会自动检测。

## 🚀 使用示例

### 最小配置
```yaml
marketplace:
  sources:
    - name: My Skills
      url: https://github.com/user/skills
```

### 完整配置
```yaml
marketplace:
  sources:
    - name: Anthropic 官方技能
      url: https://github.com/anthropics/anthropic-skills
      description: Anthropic 官方维护的 Claude Code 技能集合
      tags: [official, verified, anthropic]
```

### 多个数据源
```yaml
marketplace:
  sources:
    - name: 官方技能
      url: https://github.com/anthropics/anthropic-skills
      tags: [official]

    - name: 社区工具
      url: https://github.com/community/tools
      tags: [community]

    - name: 个人收藏
      url: https://github.com/user/favorites
      tags: [personal]
```

## 🎨 最佳实践

### 1. 使用注释分组
```yaml
marketplace:
  sources:
    # 官方数据源
    - name: ...

    # 社区数据源
    - name: ...

    # 实验性数据源
    - name: ...
```

### 2. 合理使用标签
```yaml
tags: [official, verified]  # 官方认证
tags: [community, popular]  # 社区热门
tags: [experimental]        # 实验性
```

### 3. 提供清晰的描述
```yaml
description: Vercel Labs 的浏览器自动化工具，支持 AI Agent 进行网页交互
```

## 📚 相关文档

- [快速开始](./MARKETPLACE_QUICKSTART.md)
- [格式指南](./marketplace-sources-format.md)
- [完整文档](./marketplace-sources.md)

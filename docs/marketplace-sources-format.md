# Marketplace 数据源格式指南

## 🎨 支持的格式

Cobalt 支持两种数据源格式，会自动检测并解析：

### 1. YAML 格式 ⭐ 推荐

```yaml
# Cobalt Skill Marketplace 数据源列表

sources:
  # 官方数据源
  - name: Anthropic 官方技能
    url: https://github.com/anthropics/anthropic-skills
    description: Anthropic 官方维护的 Claude Code 技能集合
    tags: [official, verified, anthropic]

  # 社区数据源
  - name: Agent Browser
    url: https://github.com/vercel-labs/agent-browser
    description: Vercel Labs 的浏览器自动化工具
    tags: [community, browser, automation]
```

**优点**：
- ✅ 可读性极好
- ✅ 支持注释
- ✅ 层次结构清晰
- ✅ 简洁明了

**字段说明**：
- `name` (必填): 显示名称
- `url` (必填): GitHub 仓库 URL
- `description` (可选): 详细描述
- `tags` (可选): 标签列表

### 2. TXT 格式（向后兼容）

```txt
# 注释行
URL | 名称 | 描述 | 标签(逗号分隔)

https://github.com/user/repo | 仓库名称 | 简短描述 | tag1,tag2,tag3
```

## 📝 YAML 完整示例

```yaml
# Cobalt Skill Marketplace 数据源列表

sources:
  # 官方数据源
  - name: Anthropic 官方技能
    url: https://github.com/anthropics/anthropic-skills
    description: Anthropic 官方维护的 Claude Code 技能集合
    tags: [official, verified, anthropic]

  # 浏览器自动化
  - name: Agent Browser
    url: https://github.com/vercel-labs/agent-browser
    description: Vercel Labs 的浏览器自动化工具
    tags: [community, browser, automation, vercel]

  # 开发工具
  - name: 开发者工具集
    url: https://github.com/example/dev-tools
    description: 常用的开发工具和实用程序
    tags: [tools, development, productivity]

  # 最简格式（只有必填字段）
  - name: 简单示例
    url: https://github.com/user/simple-repo
```

## 🔄 格式迁移

### 从 TXT 迁移到 YAML

**旧格式 (TXT)**：
```txt
https://github.com/user/repo | 仓库名称 | 简短描述 | tag1,tag2
```

**新格式 (YAML)**：
```yaml
- name: 仓库名称
  url: https://github.com/user/repo
  description: 简短描述
  tags: [tag1, tag2]
```

## 🎯 最佳实践

### 1. 使用清晰的名称
```yaml
# ✅ 好
- name: Agent Browser

# ❌ 不好
- name: repo-1
```

### 2. 提供有用的描述
```yaml
# ✅ 好
description: Vercel Labs 的浏览器自动化工具，支持 AI Agent 进行网页交互

# ❌ 不好
description: 工具
```

### 3. 合理使用标签
```yaml
# ✅ 好
tags: [community, browser, automation]

# ❌ 不好
tags: [tag1, tag2]
```

### 4. 添加注释分组
```yaml
# 官方数据源
- name: ...

# 社区数据源
- name: ...

# 实验性数据源
- name: ...
```

## 🔧 自动检测

应用会自动检测文件格式：

1. **尝试解析为 YAML** - 如果成功，使用 YAML 解析结果
2. **回退到 TXT 格式** - 如果 YAML 解析失败，使用简单的行解析

这意味着你可以：
- 无缝从 TXT 迁移到 YAML
- 同时支持两种格式
- 不会破坏现有配置

## 📚 更多资源

- [YAML 语法指南](https://yaml.org/spec/1.2/spec.html)
- [YAML 在线验证器](https://www.yamllint.com/)
- [完整文档](./marketplace-sources.md)


### 2. TXT 格式（向后兼容）

```txt
# 注释行
URL | 名称 | 描述 | 标签(逗号分隔)

https://github.com/user/repo | 仓库名称 | 简短描述 | tag1,tag2,tag3
```

**优点**：
- ✅ 简单直接
- ✅ 易于快速编辑
- ❌ 功能有限

## 🚀 推荐使用 YAML

### 为什么选择 YAML？

1. **更丰富的元数据**
   - 支持作者信息
   - 支持优先级排序
   - 支持分类和许可证信息
   - 支持自定义元数据

2. **更好的可维护性**
   - 清晰的层次结构
   - 支持多行描述
   - 注释更灵活

3. **更专业的外观**
   - 现代化的配置格式
   - 符合行业标准
   - 易于工具处理

## 📝 YAML 完整示例

```yaml
# Cobalt Skill Marketplace 数据源配置
version: "1.0"
lastUpdated: "2026-02-06"

# 数据源列表
sources:
  # ==================== 官方数据源 ====================

  - id: anthropic-official
    name: Anthropic 官方技能
    url: https://github.com/anthropics/anthropic-skills
    description: |
      Anthropic 官方维护的 Claude Code 技能集合。
      包含各种实用工具和最佳实践示例。
    tags:
      - official
      - verified
      - anthropic
    priority: 100
    enabled: true
    author:
      name: Anthropic
      url: https://www.anthropic.com
      email: support@anthropic.com
    metadata:
      category: official
      language: en
      license: MIT
      stars: 5000+
      lastUpdate: "2026-02-01"

  # ==================== 社区数据源 ====================

  - id: agent-browser
    name: Agent Browser
    url: https://github.com/vercel-labs/agent-browser
    description: |
      Vercel Labs 的浏览器自动化工具。
      支持 AI Agent 进行网页交互、填表、点击等操作。
    tags:
      - community
      - browser
      - automation
      - vercel
      - web
    priority: 50
    enabled: true
    author:
      name: Vercel Labs
      url: https://vercel.com/labs
    metadata:
      category: automation
      language: en
      license: MIT
      stars: 1000+
      featured: true

  # ==================== 开发工具 ====================

  - id: dev-tools
    name: 开发者工具集
    url: https://github.com/example/dev-tools
    description: 常用的开发工具和实用程序
    tags:
      - tools
      - development
      - productivity
    priority: 30
    enabled: true
    author:
      name: Community
    metadata:
      category: tools
      language: zh-CN
      license: Apache-2.0
```

## 🔄 格式迁移

### 从 TXT 迁移到 YAML

**旧格式 (TXT)**：
```txt
https://github.com/user/repo | 仓库名称 | 简短描述 | tag1,tag2
```

**新格式 (YAML)**：
```yaml
- id: repo-name
  name: 仓库名称
  url: https://github.com/user/repo
  description: 简短描述
  tags:
    - tag1
    - tag2
  priority: 50
  enabled: true
```

## 🎯 最佳实践

### 1. 使用有意义的 ID
```yaml
# ✅ 好
- id: anthropic-official

# ❌ 不好
- id: source-1
```

### 2. 提供详细的描述
```yaml
# ✅ 好
description: |
  Anthropic 官方维护的 Claude Code 技能集合。
  包含各种实用工具和最佳实践示例。

# ❌ 不好
description: 技能集合
```

### 3. 合理使用标签
```yaml
# ✅ 好
tags:
  - official
  - verified
  - productivity

# ❌ 不好
tags:
  - tag1
  - tag2
```

### 4. 设置优先级
```yaml
# 官方数据源：高优先级
priority: 100

# 社区数据源：中优先级
priority: 50

# 实验性数据源：低优先级
priority: 10
```

## 🔧 自动检测

应用会自动检测文件格式：

1. **尝试解析为 YAML**
   - 如果成功，使用 YAML 解析结果
   - 支持所有 YAML 特性

2. **回退到 TXT 格式**
   - 如果 YAML 解析失败
   - 使用简单的行解析

这意味着你可以：
- 无缝从 TXT 迁移到 YAML
- 同时支持两种格式
- 不会破坏现有配置

## 📚 更多资源

- [YAML 语法指南](https://yaml.org/spec/1.2/spec.html)
- [YAML 在线验证器](https://www.yamllint.com/)
- [完整文档](./marketplace-sources.md)

# Marketplace 数据源示例

## 快速开始

### 1. 准备数据源文件

创建 `marketplace-sources.txt`：

```txt
# 官方数据源
https://github.com/anthropics/anthropic-skills | Anthropic 官方技能 | Anthropic 官方维护的 Claude Code 技能集合 | official,verified

# 你的数据源
https://github.com/yourusername/my-skills | 我的技能库 | 个人技能集合 | custom,personal
```

### 2. 部署到 GitHub

```bash
# 提交到 GitHub
git add public/marketplace-sources.txt
git commit -m "feat: add marketplace sources"
git push origin main
```

### 3. 配置 CDN URL

编辑 `src/hooks/useMarketplaceInit.ts`：

```typescript
const DEFAULT_SOURCES_URL = 'https://raw.githubusercontent.com/yourusername/cobalt/main/public/marketplace-sources.txt';
```

### 4. 测试

```bash
# 构建应用
pnpm run build

# 运行应用
pnpm run tauri dev
```

应用启动时会自动同步数据源列表。

## 高级用法

### 使用 jsDelivr CDN 加速

```typescript
const DEFAULT_SOURCES_URL = 'https://cdn.jsdelivr.net/gh/yourusername/cobalt@main/public/marketplace-sources.txt';
```

### 手动触发同步

在 Skill 市场页面点击"同步远程数据源"按钮。

### 添加自定义数据源

1. 点击"添加市场源"按钮
2. 填写名称、URL、描述和标签
3. 点击"添加"

自定义数据源会被标记为 `isCustom: true`，同步时不会被删除。

## 数据源格式详解

### 基本格式

```
URL | 名称 | 描述 | 标签
```

### 示例

```txt
https://github.com/user/repo | 仓库名称 | 简短描述 | tag1,tag2,tag3
```

### 字段说明

- **URL**（必填）：GitHub 仓库 URL，支持 HTTPS 和 SSH 格式
- **名称**（必填）：数据源显示名称
- **描述**（可选）：简短描述，留空则不显示
- **标签**（可选）：逗号分隔的标签列表，用于分类和筛选

### 注释

```txt
# 这是注释，会被忽略

# 可以用来分组
# 官方数据源
https://github.com/official/repo | 官方仓库 | 官方维护 | official

# 社区数据源
https://github.com/community/repo | 社区仓库 | 社区贡献 | community
```

## 常见问题

### Q: 如何更新数据源列表？

A: 修改 `marketplace-sources.txt` 并提交到 GitHub，用户会在下次同步时自动获取更新。

### Q: 同步频率是多少？

A: 默认 24 小时同步一次，可以手动点击"同步远程数据源"按钮立即同步。

### Q: 用户自定义的数据源会被删除吗？

A: 不会。用户手动添加的数据源会被标记为 `isCustom: true`，同步时会被保留。

### Q: 如何禁用自动同步？

A: 修改 `src/hooks/useMarketplaceInit.ts`，注释掉同步逻辑。

### Q: 支持私有仓库吗？

A: 支持。用户需要配置 Git 凭据，应用会使用 `git clone` 命令克隆仓库。

## 贡献数据源

欢迎通过 PR 添加新的数据源到 `marketplace-sources.txt`！

### 贡献指南

1. Fork 仓库
2. 编辑 `public/marketplace-sources.txt`
3. 添加你的数据源（遵循格式规范）
4. 提交 PR
5. 等待审核和合并

### 数据源要求

- 必须是公开的 GitHub 仓库
- 包含有效的 SKILL.md 文件
- 遵循 Claude Code Skill 规范
- 提供清晰的描述和标签

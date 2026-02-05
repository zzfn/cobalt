# Marketplace 数据源快速开始

## 🚀 5 分钟快速配置

### 步骤 1: 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑 .env.local，替换为你的 GitHub 用户名
# VITE_MARKETPLACE_SOURCES_URL=https://raw.githubusercontent.com/YOUR_USERNAME/cobalt/main/public/marketplace-sources.txt
```

### 步骤 2: 编辑数据源列表

编辑 `public/marketplace-sources.yaml`，添加你想要的 Skill 仓库：

```yaml
# Cobalt Skill Marketplace 数据源列表

sources:
  # 官方数据源
  - name: Anthropic 官方技能
    url: https://github.com/anthropics/anthropic-skills
    description: Anthropic 官方维护的 Claude Code 技能集合
    tags: [official, verified, anthropic]

  # 你的数据源
  - name: 我的技能库
    url: https://github.com/yourusername/my-skills
    description: 个人技能集合
    tags: [custom, personal]
```

### 步骤 3: 提交到 GitHub

```bash
git add public/marketplace-sources.yaml
git commit -m "feat: add marketplace sources"
git push origin main
```

### 步骤 4: 运行应用

```bash
# 开发模式
pnpm run tauri dev

# 或构建生产版本
pnpm run build
pnpm run tauri build
```

应用启动时会自动从远程同步数据源列表！

## 📝 数据源格式

```yaml
sources:
  - name: 名称
    url: GitHub URL
    description: 描述（可选）
    tags: [标签1, 标签2]
```

## 🔄 同步机制

- **自动同步**：应用启动时自动同步，24 小时缓存
- **手动同步**：在 Skill 市场页面点击"同步远程数据源"按钮
- **智能合并**：保留用户自定义的数据源，更新官方数据源

## 🎯 使用场景

### 场景 1: 个人使用

1. Fork 这个仓库
2. 编辑 `marketplace-sources.txt` 添加你喜欢的 Skill 仓库
3. 配置 `.env.local` 指向你的 Fork
4. 享受自动同步！

### 场景 2: 团队使用

1. 团队维护一个共享的 `marketplace-sources.txt`
2. 所有成员配置相同的 URL
3. 团队成员会自动获取最新的数据源列表

### 场景 3: 企业部署

1. 企业维护内部的数据源列表
2. 部署到内部 CDN
3. 配置应用使用内部 URL

## 🛠️ 开发调试

### 跳过自动同步

开发环境默认跳过自动同步，避免频繁请求。

### 使用本地文件测试

在浏览器控制台中：

```javascript
// 导入服务
const { syncMarketplaceSourcesFromLocal } = await import('@/services/marketplace');

// 同步本地文件
await syncMarketplaceSourcesFromLocal('/path/to/marketplace-sources.txt');
```

## ❓ 常见问题

### Q: 如何禁用自动同步？

A: 在 `src/hooks/useMarketplaceInit.ts` 中注释掉同步逻辑。

### Q: 如何更改同步频率？

A: 修改 `useMarketplaceInit.ts` 中的 `ONE_DAY` 常量。

### Q: 用户自定义的数据源会被删除吗？

A: 不会。用户手动添加的数据源会被标记为 `isCustom: true`，同步时会被保留。

## 📚 更多文档

- [完整文档](./marketplace-sources.md)
- [使用示例](./marketplace-sources-example.md)

# Marketplace 数据源管理

## 概述

Cobalt 支持从远程 CDN 同步 Skill 市场数据源列表，实现集中管理和自动更新。

## 工作原理

### 方案 A：本地文件 + 远程同步

1. **数据源文件**：`public/marketplace-sources.txt`
   - 一行一个数据源
   - 支持注释（以 `#` 开头）
   - 格式：`URL | 名称 | 描述 | 标签(逗号分隔)`

2. **自动同步**：
   - 应用启动时自动从远程 URL 同步数据源列表
   - 每 24 小时自动同步一次
   - 保留用户自定义的数据源

3. **手动同步**：
   - 在 Skill 市场页面点击"同步远程数据源"按钮
   - 立即从远程获取最新的数据源列表

## 文件格式

### marketplace-sources.txt

```txt
# Cobalt Skill Marketplace 数据源列表
#
# 格式: URL | 名称 | 描述 | 标签(逗号分隔)
# 以 # 开头的行为注释，空行会被忽略

# 官方数据源
https://github.com/anthropics/anthropic-skills | Anthropic 官方技能 | Anthropic 官方维护的 Claude Code 技能集合 | official,verified,anthropic

# 社区数据源
https://github.com/community/awesome-skills | 社区精选 | 社区贡献的优质技能 | community,popular
```

## 部署到 CDN

### 方法 1：GitHub Raw + jsDelivr

1. 将 `marketplace-sources.txt` 提交到 GitHub 仓库
2. 使用 jsDelivr CDN 加速：
   ```
   https://cdn.jsdelivr.net/gh/username/repo@main/public/marketplace-sources.txt
   ```

### 方法 2：GitHub Raw 直接访问

```
https://raw.githubusercontent.com/username/repo/main/public/marketplace-sources.txt
```

### 方法 3：自定义 CDN

将文件上传到任何支持 HTTPS 的 CDN 服务。

## 配置远程 URL

修改 `src/hooks/useMarketplaceInit.ts` 中的 `DEFAULT_SOURCES_URL`：

```typescript
const DEFAULT_SOURCES_URL = 'https://your-cdn-url/marketplace-sources.txt';
```

或在 `src/pages/Skills/Marketplace/List.tsx` 中修改：

```typescript
const DEFAULT_SOURCES_URL = 'https://your-cdn-url/marketplace-sources.txt';
```

## 数据源类型

### 官方数据源（非自定义）
- 从远程 URL 同步的数据源
- `isCustom: false`
- 每次同步时会被更新

### 用户自定义数据源
- 用户手动添加的数据源
- `isCustom: true`
- 同步时会被保留，不会被删除

## API

### Rust 命令

```rust
// 从远程 URL 同步数据源列表
sync_marketplace_sources(remote_url: String) -> Result<Vec<MarketplaceSource>, String>

// 从本地文件同步（开发环境）
sync_marketplace_sources_from_local(file_path: String) -> Result<Vec<MarketplaceSource>, String>
```

### TypeScript 服务

```typescript
// 从远程 URL 同步数据源列表
syncMarketplaceSources(remoteUrl: string): Promise<MarketplaceSource[]>

// 从本地文件同步（开发环境）
syncMarketplaceSourcesFromLocal(filePath: string): Promise<MarketplaceSource[]>
```

## 使用场景

### 场景 1：官方维护的数据源列表

1. 在 GitHub 仓库中维护 `marketplace-sources.txt`
2. 用户安装应用后自动同步官方数据源
3. 定期更新文件，用户会自动获取最新列表

### 场景 2：社区贡献

1. 社区成员通过 PR 添加新的数据源
2. 合并后，所有用户会在下次同步时获取更新
3. 支持版本控制和审核流程

### 场景 3：企业内部部署

1. 企业维护内部的数据源列表
2. 部署到内部 CDN
3. 配置应用使用内部 URL

## 开发调试

### 本地测试

在开发环境中，可以使用本地文件进行测试：

```typescript
// 在浏览器控制台中执行
import { syncMarketplaceSourcesFromLocal } from '@/services/marketplace';
await syncMarketplaceSourcesFromLocal('/path/to/marketplace-sources.txt');
```

### 跳过自动同步

在 `useMarketplaceInit.ts` 中设置：

```typescript
const isDev = import.meta.env.DEV;

if (isDev) {
  console.log('🛠️ 开发环境：跳过远程同步');
  return;
}
```

## 注意事项

1. **URL 格式**：数据源 URL 必须以 `https://` 或 `git@` 开头
2. **去重**：同步时会自动跳过已存在的 URL
3. **保留自定义**：用户手动添加的数据源不会被删除
4. **缓存策略**：24 小时内只同步一次，避免频繁请求
5. **错误处理**：同步失败不会阻塞应用启动

## 未来改进

- [ ] 支持数据源优先级排序
- [ ] 支持数据源分类和筛选
- [ ] 支持数据源版本管理
- [ ] 支持多个远程 URL（主备切换）
- [ ] 支持增量更新（只同步变更）

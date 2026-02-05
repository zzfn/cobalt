# 从 TXT 迁移到 YAML 格式

## 🎯 为什么要迁移？

YAML 格式提供了：
- ✅ 更好的可读性
- ✅ 更丰富的元数据
- ✅ 更灵活的注释
- ✅ 更专业的外观

## 🔄 迁移步骤

### 步骤 1: 创建 YAML 文件

创建 `public/marketplace-sources.yaml`：

```yaml
version: "1.0"
lastUpdated: "2026-02-06"

sources: []
```

### 步骤 2: 转换现有数据

**旧格式 (marketplace-sources.txt)**：
```txt
https://github.com/anthropics/anthropic-skills | Anthropic 官方技能 | Anthropic 官方维护的 Claude Code 技能集合 | official,verified,anthropic
https://github.com/vercel-labs/agent-browser | Agent Browser | Vercel Labs 的浏览器自动化工具 | community,browser,automation
```

**新格式 (marketplace-sources.yaml)**：
```yaml
version: "1.0"
lastUpdated: "2026-02-06"

sources:
  - id: anthropic-official
    name: Anthropic 官方技能
    url: https://github.com/anthropics/anthropic-skills
    description: Anthropic 官方维护的 Claude Code 技能集合
    tags:
      - official
      - verified
      - anthropic
    priority: 100
    enabled: true

  - id: agent-browser
    name: Agent Browser
    url: https://github.com/vercel-labs/agent-browser
    description: Vercel Labs 的浏览器自动化工具
    tags:
      - community
      - browser
      - automation
    priority: 50
    enabled: true
```

### 步骤 3: 更新环境变量

编辑 `.env.local`：

```bash
# 从
VITE_MARKETPLACE_SOURCES_URL=https://raw.githubusercontent.com/YOUR_USERNAME/cobalt/main/public/marketplace-sources.txt

# 改为
VITE_MARKETPLACE_SOURCES_URL=https://raw.githubusercontent.com/YOUR_USERNAME/cobalt/main/public/marketplace-sources.yaml
```

### 步骤 4: 提交更改

```bash
git add public/marketplace-sources.yaml .env.local
git commit -m "feat: migrate to YAML format"
git push origin main
```

### 步骤 5: 测试

```bash
pnpm run tauri dev
```

应用会自动检测并使用 YAML 格式。

## 🛠️ 自动转换工具

你可以使用以下 Node.js 脚本自动转换：

```javascript
// convert-to-yaml.js
const fs = require('fs');
const yaml = require('js-yaml');

// 读取 TXT 文件
const txtContent = fs.readFileSync('public/marketplace-sources.txt', 'utf8');

// 解析 TXT
const sources = [];
for (const line of txtContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;

  const parts = trimmed.split('|').map(s => s.trim());
  if (parts.length >= 2) {
    const [url, name, description = '', tagsStr = ''] = parts;
    const tags = tagsStr.split(',').map(s => s.trim()).filter(Boolean);

    // 生成 ID
    const id = url.split('/').pop().replace('.git', '');

    sources.push({
      id,
      name,
      url,
      description,
      tags,
      priority: tags.includes('official') ? 100 : 50,
      enabled: true
    });
  }
}

// 生成 YAML
const yamlConfig = {
  version: '1.0',
  lastUpdated: new Date().toISOString().split('T')[0],
  sources
};

const yamlContent = yaml.dump(yamlConfig, {
  indent: 2,
  lineWidth: -1
});

// 写入 YAML 文件
fs.writeFileSync('public/marketplace-sources.yaml', yamlContent);

console.log('✅ 转换完成！');
console.log(`📝 转换了 ${sources.length} 个数据源`);
```

运行：
```bash
npm install js-yaml
node convert-to-yaml.js
```

## 📋 转换检查清单

- [ ] 创建 YAML 文件
- [ ] 转换所有数据源
- [ ] 添加 ID 字段
- [ ] 设置优先级
- [ ] 添加作者信息（可选）
- [ ] 添加元数据（可选）
- [ ] 更新环境变量
- [ ] 测试同步功能
- [ ] 提交到 Git

## 🔍 验证 YAML

使用在线工具验证 YAML 语法：
- [YAML Lint](https://www.yamllint.com/)
- [YAML Validator](https://codebeautify.org/yaml-validator)

## ⚠️ 注意事项

1. **保留 TXT 文件**
   - 迁移完成后可以删除
   - 或保留作为备份

2. **测试同步**
   - 确保 YAML 格式正确
   - 测试自动检测功能

3. **更新文档**
   - 更新 README
   - 通知团队成员

## 🎉 迁移完成

迁移完成后，你将享受到：
- 更清晰的数据源配置
- 更丰富的元数据支持
- 更好的维护体验
- 更专业的外观

## 📚 相关文档

- [格式指南](./marketplace-sources-format.md)
- [完整文档](./marketplace-sources.md)
- [快速开始](./MARKETPLACE_QUICKSTART.md)

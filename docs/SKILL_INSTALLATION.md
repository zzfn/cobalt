# Skill 远程安装功能

## 功能概述

Cobalt 现在支持从远程 Git 仓库直接安装 Skills，无需手动克隆和配置。

## 使用方法

### 1. 打开 Skills 管理页面

在 Cobalt 应用中导航到 Skills 管理页面。

### 2. 点击"安装 Skill"按钮

在页面右上角找到"安装 Skill"按钮（带 ➕ 图标）。

### 3. 输入仓库 URL

在弹出的对话框中输入 Git 仓库的完整 URL，例如：

```
https://github.com/username/skill-name
https://gitlab.com/username/skill-name
https://gitee.com/username/skill-name
```

### 4. 安装

- 点击"安装"按钮，或直接按回车键
- 等待安装完成（会显示"安装中..."状态）
- 安装成功后会自动刷新 Skills 列表

## 技术细节

### 安装过程

1. **克隆仓库**：使用 `git clone` 将仓库克隆到 `~/.claude/skills/` 目录
2. **提取信息**：
   - 从 URL 自动提取仓库名称作为 Skill ID
   - 读取 `metadata.json`（如果存在）
   - 获取当前 commit hash
3. **注册 Skill**：
   - 添加到 `skill-registry.json`
   - 标记来源为 `remote`
   - 记录安装时间、仓库 URL 和 commit hash
4. **启用 Skill**：默认启用新安装的 Skill

### Skill 仓库结构

一个标准的 Skill 仓库应该包含：

```
skill-name/
├── SKILL.md          # Skill 主文件（必需）
├── metadata.json     # 元数据（推荐）
└── README.md         # 说明文档（可选）
```

#### metadata.json 示例

```json
{
  "name": "skill-name",
  "version": "1.0.0",
  "description": "Skill 的简短描述",
  "tags": ["tag1", "tag2"],
  "targetTools": ["claude-code", "cursor"]
}
```

## 错误处理

### 常见错误

1. **"Skill 已存在"**
   - 原因：该 Skill 已经安装
   - 解决：先卸载现有 Skill，或使用不同的仓库

2. **"克隆仓库失败"**
   - 原因：
     - 仓库 URL 无效
     - 网络连接问题
     - 需要认证的私有仓库
   - 解决：检查 URL 是否正确，确保网络连接正常

3. **"无效的仓库 URL"**
   - 原因：URL 格式不正确
   - 解决：确保使用完整的 Git 仓库 URL

## 后续功能

计划中的功能：

- [ ] 支持私有仓库（SSH 密钥认证）
- [ ] Skill 更新检查
- [ ] 一键更新到最新版本
- [ ] Skill 市场/目录
- [ ] 批量安装
- [ ] 依赖管理

## API 参考

### 前端服务

```typescript
import { installSkillFromRepo } from '@/services/skills';

// 安装 Skill
const skillName = await installSkillFromRepo('https://github.com/user/skill');
console.log(`已安装: ${skillName}`);
```

### Tauri 命令

```rust
#[tauri::command]
pub fn install_skill_from_repo(repo_url: String) -> Result<String, String>
```

**参数**：
- `repo_url`: Git 仓库的完整 URL

**返回**：
- 成功：返回安装的 Skill 名称
- 失败：返回错误信息

## 示例

### 安装公开仓库

```typescript
// 从 GitHub 安装
await installSkillFromRepo('https://github.com/anthropics/skill-example');

// 从 GitLab 安装
await installSkillFromRepo('https://gitlab.com/user/my-skill');

// 从 Gitee 安装
await installSkillFromRepo('https://gitee.com/user/my-skill');
```

### 创建可安装的 Skill

1. 创建 Git 仓库
2. 添加 `SKILL.md` 文件
3. 添加 `metadata.json`（推荐）
4. 推送到远程仓库
5. 分享仓库 URL 给其他用户

## 安全注意事项

⚠️ **重要提示**：

- 只安装来自可信来源的 Skills
- Skills 可以访问 Claude 的配置和数据
- 安装前建议查看仓库内容
- 定期检查已安装 Skills 的更新

## 贡献

欢迎创建和分享你的 Skills！

如果你创建了有用的 Skill，可以：
1. 在 GitHub 上开源
2. 添加清晰的文档
3. 在社区分享

---

**相关文档**：
- [Skills 开发指南](./SKILLS_DEVELOPMENT.md)
- [配置管理](./CONFIGURATION.md)

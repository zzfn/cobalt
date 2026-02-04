# 项目路线图

## 概述

Cobalt 是一个基于 Tauri 的桌面应用，用于可视化管理 Claude Code 的配置文件和 Skills。

**核心价值：**
- 简化 Claude Code 配置管理，降低使用门槛
- 提供友好的图形界面，替代命令行操作
- 统一管理配置文件、Skills、插件等资源

## 当前状态

- ✅ 项目初始化完成（Tauri 2 + React 19 + TypeScript）
- ✅ 完成需求调研和架构设计
- ✅ 前端基础架构完成（路由、状态管理、组件库）
- ✅ 前端页面 UI 完成（Dashboard、Settings、Skills）
- ✅ **Rust 后端命令已实现**（配置读写、Skills 管理）
- ✅ **前后端已连接**（通过 Tauri invoke 调用）
- 📋 下一步：测试和完善功能

## 短期目标（第一阶段）

### 1.1 Rust 后端基础架构
- [x] 创建命令模块结构（`commands/mod.rs`, `config.rs`, `skills.rs`）
- [x] 实现配置文件读写命令
  - [x] `get_claude_config_dir()` - 获取配置目录路径
  - [x] `read_settings()` / `write_settings()` - settings.json 管理
  - [x] `read_claude_md()` / `write_claude_md()` - CLAUDE.md 管理
  - [x] `backup_config()` - 配置备份功能
- [x] 实现 Skills 管理命令
  - [x] `read_skill_registry()` / `write_skill_registry()` - 注册表管理
  - [x] `read_skill_md()` - 读取 SKILL.md
  - [x] `toggle_skill()` - 启用/禁用 skill
  - [x] `uninstall_skill()` - 卸载 skill
  - [x] `list_skill_files()` - 列出 skill 文件
  - [x] `list_installed_skills()` - 列出已安装 skills
- [x] 在 `lib.rs` 中注册所有命令
- [x] 更新 `Cargo.toml` 依赖（serde, serde_json, chrono, dirs, thiserror）

### 1.2 前端基础架构
- [x] 安装核心依赖
  - [x] react-router-dom（路由管理）
  - [x] jotai（状态管理）
  - [x] @monaco-editor/react（代码编辑器）
  - [x] react-markdown（Markdown 渲染）
  - [x] lucide-react（图标库）
  - [x] shadcn/ui（UI 组件库）
- [x] 初始化 shadcn/ui
  - [x] 运行 `npx shadcn@latest init` 配置项目
  - [x] 安装常用组件（Button, Card, Dialog, Input, Switch, Tabs 等）
- [x] 创建 TypeScript 类型定义
  - [x] `types/settings.ts` - Settings 类型
  - [x] `types/skills.ts` - Skills 类型
- [x] 创建 Jotai Atoms
  - [x] `store/settingsAtoms.ts` - 设置状态原子
  - [x] `store/skillsAtoms.ts` - Skills 状态原子
  - [x] `store/uiAtoms.ts` - UI 状态原子
- [x] 配置路由系统（`router/index.tsx`）

### 1.3 核心组件开发
- [x] 布局组件
  - [x] `Layout.tsx` - 主布局（侧边栏 + 内容区）
  - [x] `Sidebar.tsx` - 导航侧边栏
- [x] 通用组件
  - [x] `MarkdownEditor.tsx` - Monaco Editor 封装
  - [x] `SkillCard.tsx` - Skill 卡片组件

## 中期目标（第二阶段）

### 2.1 配置管理功能
- [x] 仪表板页面（`pages/Dashboard.tsx`）
  - [ ] 显示配置概览（插件数量、skills 数量）⚠️ 使用静态数据
  - [ ] 显示最近更新的 skills
  - [ ] 快速操作按钮
- [x] 通用设置页面（`pages/Settings/General.tsx`）
  - [x] 表单展示 settings.json 各字段
  - [ ] 输入验证和错误提示
  - [ ] 保存和备份功能 ⚠️ 未连接后端
- [x] 全局指令编辑页面（`pages/Settings/Instructions.tsx`）
  - [x] Monaco Editor 集成
  - [x] 分屏布局（编辑器 + 预览）
  - [ ] Ctrl+S 快捷键保存
  - [x] 语法高亮和自动补全

### 2.2 Skills 管理功能
- [x] Skills 列表页面（`pages/Skills/List.tsx`）
  - [x] 卡片式展示所有 skills ⚠️ 使用 Mock 数据
  - [x] 搜索和过滤功能
  - [x] 启用/禁用开关
  - [x] 卸载按钮（带确认对话框）
- [x] Skill 详情页面（`pages/Skills/Detail.tsx`）
  - [x] 显示 SKILL.md 内容（Markdown 渲染）⚠️ 使用写死数据
  - [ ] 显示元数据（安装时间、仓库地址、commit hash）
  - [ ] 列出包含的文件（scripts、references）
  - [ ] "在文件管理器中打开"功能

### 2.3 UI/UX 优化
- [ ] 加载状态提示（Skeleton 组件）
- [ ] 错误处理和 Toast 通知
- [ ] 响应式设计（支持不同屏幕尺寸）
- [ ] 亮色/暗色主题支持

## 长期目标（第三阶段）

### 3.1 高级功能
- [ ] Skill 安装功能
  - [ ] 从 Git 仓库安装
  - [ ] 安装进度显示
  - [ ] 自动更新 skill-registry.json
- [ ] Keybindings 可视化编辑
  - [ ] 读取 `~/.claude/keybindings.json`
  - [ ] 可视化编辑快捷键
  - [ ] 冲突检测
- [ ] MCP Servers 管理
  - [ ] 读取 MCP 配置
  - [ ] 启用/禁用 MCP 服务器
  - [ ] 配置 MCP 参数

### 3.2 配置同步和备份
- [ ] 配置导出/导入功能
- [ ] 自动备份机制（定期备份）
- [ ] 备份历史管理
- [ ] Git 同步支持（可选）

### 3.3 用户体验增强
- [ ] 配置模板系统
  - [ ] 预设常用配置模板
  - [ ] 一键应用模板
  - [ ] 自定义模板
- [ ] 搜索和过滤增强
  - [ ] 全局搜索（跨配置和 skills）
  - [ ] 高级过滤选项
- [ ] 键盘快捷键自定义
- [ ] 多语言支持（i18n）

### 3.4 测试和打包
- [ ] 单元测试（Rust 命令）
- [ ] 集成测试（前后端交互）
- [ ] macOS 平台测试
- [ ] 打包配置优化
- [ ] 生成 macOS 安装包（.dmg）

## 技术栈

### 后端
- **Tauri 2** - 跨平台桌面应用框架
- **Rust** - 系统编程语言
- **serde / serde_json** - JSON 序列化/反序列化
- **chrono** - 时间处理

### 前端
- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **shadcn/ui** - UI 组件库
- **React Router** - 路由管理
- **Jotai** - 状态管理（原子化）
- **Monaco Editor** - 代码编辑器
- **react-markdown** - Markdown 渲染
- **lucide-react** - 图标库

### 开发工具
- **ESLint / Prettier** - 代码格式化
- **Clippy / rustfmt** - Rust 代码检查
- **Vitest** - 前端测试
- **cargo test** - Rust 测试

## 依赖项

### Rust 依赖（Cargo.toml）
```toml
[dependencies]
tauri = { version = "2", features = ["macos-private-api"] }
tauri-plugin-opener = "2"
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
chrono = "0.4"
```

### 前端依赖（package.json）
```json
{
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^6.x",
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-opener": "^2",
    "@tauri-apps/plugin-dialog": "^2",
    "@tauri-apps/plugin-fs": "^2",
    "jotai": "^2.x",
    "react-markdown": "^9.x",
    "@monaco-editor/react": "^4.x",
    "lucide-react": "^0.x",
    "tailwindcss": "^3.x",
    "class-variance-authority": "^0.7.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x"
  }
}
```

## 风险与挑战

### 技术风险
1. **文件系统权限**
   - 风险：macOS 沙盒和权限限制
   - 缓解：正确配置 Tauri 权限，使用 macOS 原生 API

2. **配置文件兼容性**
   - 风险：Claude Code 配置格式可能变化
   - 缓解：版本检测机制，向后兼容处理

3. **大文件编辑性能**
   - 风险：编辑大型 CLAUDE.md 文件可能卡顿
   - 缓解：使用虚拟滚动，优化 Monaco Editor 配置

### 用户体验风险
1. **学习曲线**
   - 风险：用户不熟悉图形界面操作
   - 缓解：提供详细的使用文档和工具提示

2. **数据安全**
   - 风险：误操作导致配置丢失
   - 缓解：自动备份机制，危险操作二次确认

### 项目管理风险
1. **功能蔓延**
   - 风险：功能需求不断增加，延迟交付
   - 缓解：严格按阶段开发，MVP 优先

2. **macOS 系统兼容性**
   - 风险：不同 macOS 版本的 API 差异
   - 缓解：明确支持的最低 macOS 版本，充分测试

## 成功指标

### 功能完整性
- ✅ 支持所有核心配置文件的读写
- ✅ 支持 Skills 的完整生命周期管理
- ✅ 提供友好的错误处理和用户反馈

### 性能指标
- 应用启动时间 < 2 秒
- 配置加载时间 < 500ms
- Skills 列表渲染（20+ skills）< 1 秒
- 大文件编辑（1000+ 行）流畅无卡顿

### 用户体验
- 界面响应时间 < 100ms
- 所有操作提供即时反馈
- 错误信息清晰易懂
- 支持键盘快捷键操作

### 质量指标
- 代码测试覆盖率 > 70%
- 无严重 Bug（P0/P1）
- macOS 兼容性 100%（支持 macOS 12.0+）

## 功能建议池（Feature Ideas）

以下是社区和团队提出的功能建议，按优先级和类别组织。这些功能将在后续版本中逐步评估和实现。

### 🔥 高优先级功能

#### 1. Skills 市场/商店
**价值：** 提升 Skills 生态，降低用户获取成本

- [ ] 浏览和搜索社区 Skills
- [ ] 一键安装远程 Skills
- [ ] Skills 评分和评论系统
- [ ] 自动更新已安装的 Skills
- [ ] Skills 依赖管理
- [ ] Skills 分类和标签系统

**技术考虑：**
- 需要设计 Skills 仓库索引格式
- 考虑使用 GitHub API 或自建索引服务
- 需要实现 Skills 版本管理机制

#### 2. 配置模板系统
**价值：** 降低新用户门槛，提供最佳实践

- [ ] 预设的配置模板（开发、写作、数据分析等场景）
- [ ] 一键应用模板
- [ ] 自定义模板保存和分享
- [ ] 模板导入/导出
- [ ] 模板市场（社区分享）

**技术考虑：**
- 模板格式设计（JSON Schema）
- 模板冲突检测和合并策略
- 模板变量替换机制

#### 3. 快捷操作面板（Command Palette）
**价值：** 提升操作效率，改善用户体验

- [ ] 全局快捷键（Cmd+K）唤起命令面板
- [ ] 快速切换配置档案
- [ ] 快速启用/禁用 Skills
- [ ] 快速搜索和执行操作
- [ ] 最近使用的命令历史
- [ ] 模糊搜索支持

**技术考虑：**
- 使用 cmdk 或 kbar 库
- 全局快捷键注册（Tauri globalShortcut）
- 命令注册和扩展机制

#### 4. 历史记录增强
**价值：** 增强数据价值，提供洞察

- [ ] 对话历史的可视化时间线
- [ ] 按项目/标签分类对话
- [ ] 对话搜索和过滤（全文搜索）
- [ ] 对话导出（Markdown/PDF/JSON）
- [ ] 对话统计分析（使用频率、Token 消耗等）
- [ ] 对话收藏和标注

**技术考虑：**
- 解析 `history.jsonl` 格式
- 实现高效的全文搜索（可能需要索引）
- PDF 导出需要额外的库支持

#### 5. 性能监控和成本管理
**价值：** 帮助用户控制成本，优化使用

- [ ] Token 使用统计和可视化
- [ ] API 调用次数和成本估算
- [ ] 响应时间监控
- [ ] 使用趋势分析（日/周/月）
- [ ] 预算提醒和限额设置
- [ ] 成本报告导出

**技术考虑：**
- 需要解析 Claude Code 日志
- 实现 Token 计数算法
- 数据可视化（使用 recharts 或 visx）

### ⭐ 中优先级功能

#### 6. Prompt 库管理
**价值：** 提升复用性，积累知识资产

- [ ] 保存常用的 Prompt 模板
- [ ] Prompt 分类和标签
- [ ] 快速插入 Prompt
- [ ] Prompt 变量替换（模板引擎）
- [ ] 社区 Prompt 分享
- [ ] Prompt 版本管理

#### 7. Skills 开发工具
**价值：** 降低 Skills 开发门槛

- [ ] Skills 脚手架生成器（CLI 工具）
- [ ] Skills 调试模式（日志查看）
- [ ] Skills 测试工具（单元测试框架）
- [ ] Skills 文档生成器（从代码生成）
- [ ] Skills 打包和发布工具
- [ ] Skills 示例和模板

#### 8. 配置健康检查
**价值：** 预防问题，提升稳定性

- [ ] 检测配置冲突
- [ ] 检测无效的 Skills
- [ ] 检测过期的配置
- [ ] 配置优化建议
- [ ] 一键修复常见问题
- [ ] 健康评分系统

#### 9. 配置同步
**价值：** 多设备协作，团队共享

- [ ] 多设备配置同步（通过 GitHub Gist 或自建服务）
- [ ] 配置版本控制（Git 集成）
- [ ] 冲突解决机制
- [ ] 团队配置共享
- [ ] 选择性同步（排除敏感信息）

#### 10. 集成功能
**价值：** 与现有工作流集成

- [ ] 与 VS Code 集成（快速打开项目）
- [ ] 与 GitHub 集成（管理 Skills 仓库）
- [ ] 与 Notion/Obsidian 集成（导出对话）
- [ ] Webhook 支持（配置变更通知）
- [ ] Slack/Discord 通知集成

### 💡 低优先级功能

#### 11. 主题和外观定制
- [ ] 更多内置主题（Dracula、Nord、Solarized 等）
- [ ] 自定义主题编辑器
- [ ] 字体大小和样式调整
- [ ] 布局自定义（侧边栏位置、宽度等）
- [ ] 导入/导出主题
- [ ] 主题市场

#### 12. 高级编辑器功能
- [ ] Monaco Editor 的代码补全（基于 Schema）
- [ ] 配置文件的 Schema 验证
- [ ] 实时错误提示
- [ ] 格式化和美化
- [ ] Diff 视图（对比配置变更）
- [ ] 多文件编辑（标签页）

#### 13. 多语言支持
- [ ] 国际化（i18n）框架搭建
- [ ] 支持英文、中文等多语言
- [ ] 语言切换功能
- [ ] 社区翻译贡献机制

#### 14. 导入/导出功能增强
- [ ] 完整配置包导出（包含 Skills）
- [ ] 从其他工具导入配置
- [ ] 批量操作支持
- [ ] 配置迁移向导

#### 15. 通知中心
- [ ] Skills 更新通知
- [ ] 配置变更历史
- [ ] 系统消息和公告
- [ ] 错误日志查看
- [ ] 通知偏好设置

### 🔮 未来探索

以下功能需要进一步调研和评估：

- **AI 辅助配置**：使用 AI 分析用户使用习惯，推荐配置优化
- **协作功能**：多人实时编辑配置（类似 Google Docs）
- **插件系统**：允许第三方开发者扩展 Cobalt 功能
- **云端备份**：自动备份到云端（加密存储）
- **移动端伴侣应用**：iOS/Android 应用，查看统计和历史
- **CLI 工具**：提供命令行接口，支持自动化脚本

### 📊 功能评估标准

在决定实现哪些功能时，我们会考虑以下因素：

1. **用户价值**：功能对用户的实际帮助程度
2. **开发成本**：实现难度和所需时间
3. **维护成本**：长期维护的复杂度
4. **生态影响**：对 Claude Code 生态的贡献
5. **技术可行性**：当前技术栈的支持程度
6. **用户需求度**：社区反馈和需求强度

### 💬 反馈渠道

如果你有新的功能建议或对现有建议的反馈，欢迎通过以下方式联系：

- GitHub Issues：提交功能请求
- GitHub Discussions：参与功能讨论
- 社区投票：对功能进行优先级投票

---

## 更新日志

- 2026-02-04: 创建路线图文档
- 2026-02-04: 完成项目规划和架构设计，明确三个阶段的开发目标
- 2026-02-04: 更新完成状态 - 前端基础架构和 UI 页面已完成，使用 Mock 数据
- 2026-02-04: **完成 1.1 阶段** - 实现 Rust 后端命令，前后端连接完成
- 2026-02-04: **添加功能建议池** - 整理 15+ 个功能建议，按优先级分类

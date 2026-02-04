# 快速发布指南

## 🚀 最简单的发布方式

### 发布补丁版本（Bug 修复）

```bash
make release-patch
```

这会：
1. 自动将版本号从 `0.2.2` 递增到 `0.2.3`
2. 显示新版本号并要求确认
3. 提交版本更新
4. 创建并推送 Git tag
5. 触发 GitHub Actions 自动构建

### 发布次版本（新功能）

```bash
make release-minor
```

版本号从 `0.2.2` 递增到 `0.3.0`

### 发布主版本（重大更新）

```bash
make release-major
```

版本号从 `0.2.2` 递增到 `1.0.0`

## 📋 完整流程示例

```bash
# 1. 查看当前版本
make get-version
# 输出: 0.2.2

# 2. 修复了一些 Bug，准备发布补丁版本
make release-patch

# 输出:
# 当前版本: 0.2.2
# 新版本: 0.2.3
# ✓ 版本号已更新到 0.2.3
#   - package.json
#   - src-tauri/Cargo.toml
#   - src-tauri/tauri.conf.json
#   - src-tauri/Cargo.lock
#
# 📦 准备发布补丁版本 v0.2.3
#
# 确认发布? (y/N): y
#
# 提交版本更新...
# 创建 tag v0.2.3...
# 推送到远程仓库...
# ✓ 版本 0.2.3 已发布
# GitHub Action 将自动开始构建发布版本
```

## 🎯 版本号规则

遵循语义化版本规范 (Semantic Versioning)：

- **主版本号 (Major)**: 不兼容的 API 修改
  - 例: `0.2.2` → `1.0.0`
  - 使用: `make release-major`

- **次版本号 (Minor)**: 向下兼容的功能性新增
  - 例: `0.2.2` → `0.3.0`
  - 使用: `make release-minor`

- **修订号 (Patch)**: 向下兼容的问题修正
  - 例: `0.2.2` → `0.2.3`
  - 使用: `make release-patch` ⭐ 最常用

## 💡 其他有用命令

### 只更新版本号（不发布）

```bash
# 自动递增
make bump-patch   # 0.2.2 -> 0.2.3
make bump-minor   # 0.2.2 -> 0.3.0
make bump-major   # 0.2.2 -> 1.0.0

# 手动指定
make version VERSION=0.5.0
```

### 手动发布指定版本

```bash
make tag-release VERSION=0.5.0
```

## ⚠️ 注意事项

1. **确保代码已提交**: 发布前确保所有改动已提交
2. **测试通过**: 确保应用可以正常构建和运行
3. **更新日志**: 建议在 GitHub Release 中添加更新说明
4. **网络连接**: 需要能够推送到 GitHub

## 🔄 取消发布

如果在确认提示时选择 `N`，版本号会自动回滚，不会有任何改动。

## 📊 发布后

1. 访问 GitHub Actions 查看构建进度
2. 构建完成后，检查 Releases 页面
3. 用户会在下次启动应用时收到更新通知

## 🎉 总结

**最常用的命令就一个：**

```bash
make release-patch
```

简单、快速、自动化！

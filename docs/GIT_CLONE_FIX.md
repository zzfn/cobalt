# Git Clone 问题修复

## 🐛 问题

刷新市场源时，`git clone` 会提示输入用户名：

```
Username for 'https://github.com':
```

这是因为 Git 在某些情况下会尝试进行身份验证，即使是公开仓库。

## ✅ 解决方案

通过设置环境变量禁用交互式提示：

```rust
Command::new("git")
    .args(&["clone", "--depth", "1", &source.url, temp_dir.to_str().unwrap()])
    .env("GIT_TERMINAL_PROMPT", "0")  // 禁用交互式提示
    .env("GIT_ASKPASS", "echo")       // 避免弹出密码提示
    .output()
```

### 环境变量说明

1. **`GIT_TERMINAL_PROMPT=0`**
   - 禁用终端交互式提示
   - 如果需要认证，直接失败而不是提示用户输入

2. **`GIT_ASKPASS=echo`**
   - 设置密码提示程序为 `echo`
   - 避免弹出 GUI 密码输入框

## 🎯 效果

- ✅ 公开仓库：正常克隆，无需认证
- ✅ 私有仓库：直接失败，不会卡住等待输入
- ✅ 网络问题：快速失败，给出明确错误信息

## 🔍 其他可能的原因

### 1. URL 格式问题

确保使用 HTTPS URL：
```
✅ https://github.com/user/repo
❌ git@github.com:user/repo.git
```

### 2. 网络问题

如果 GitHub 被墙，可能需要：
- 配置代理
- 使用镜像站
- 使用 SSH URL（需要配置 SSH 密钥）

### 3. Git 配置

检查全局 Git 配置：
```bash
git config --global credential.helper
```

如果设置了 credential helper，可能会尝试使用缓存的凭据。

## 📝 错误处理

现在的错误信息更友好：

```
克隆仓库失败: [错误详情]。提示：请确保仓库 URL 正确且可公开访问
```

## 🚀 测试

测试克隆公开仓库：

```bash
# 应该成功
git clone --depth 1 https://github.com/anthropics/anthropic-skills

# 应该失败（私有仓库）
git clone --depth 1 https://github.com/private/repo
```

## 💡 最佳实践

1. **只添加公开仓库**
   - 内置数据源都是公开的
   - 用户添加的数据源也应该是公开的

2. **提供清晰的错误信息**
   - 告诉用户为什么失败
   - 提供解决建议

3. **快速失败**
   - 不要卡住等待用户输入
   - 超时后自动失败

## 🔧 进一步优化（可选）

如果仍有问题，可以考虑：

### 方案 1: 添加超时
```rust
use std::time::Duration;
use std::process::Stdio;

let mut child = Command::new("git")
    .args(&["clone", "--depth", "1", &source.url, temp_dir.to_str().unwrap()])
    .env("GIT_TERMINAL_PROMPT", "0")
    .env("GIT_ASKPASS", "echo")
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()?;

// 等待最多 30 秒
let timeout = Duration::from_secs(30);
// ... 实现超时逻辑
```

### 方案 2: 使用 libgit2
```toml
[dependencies]
git2 = "0.18"
```

使用 Rust 的 Git 库，完全控制克隆过程。

### 方案 3: 下载 ZIP
```rust
// 使用 GitHub API 下载 ZIP
let zip_url = format!("{}/archive/refs/heads/main.zip", source.url);
// 下载并解压
```

## 📚 相关资源

- [Git Environment Variables](https://git-scm.com/book/en/v2/Git-Internals-Environment-Variables)
- [Git Credential Storage](https://git-scm.com/book/en/v2/Git-Tools-Credential-Storage)

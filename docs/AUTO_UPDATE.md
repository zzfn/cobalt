# 自动更新配置指南

## 概述

Cobalt 现已支持应用内自动更新检测和安装功能。用户无需手动访问 GitHub 下载新版本。

## 功能特性

- ✅ 启动时自动检查更新
- ✅ 发现新版本时弹窗提示
- ✅ 显示版本更新日志
- ✅ 一键下载并安装更新
- ✅ 更新完成后自动重启应用

## 配置步骤

### 1. 安装依赖

```bash
pnpm install
```

### 2. 生成签名密钥（重要）

为了安全起见，更新包需要使用私钥签名。运行以下命令生成密钥对：

```bash
pnpm tauri signer generate -w ~/.tauri/cobalt.key
```

这将生成：
- 私钥：`~/.tauri/cobalt.key`（保密，用于签名）
- 公钥：输出到终端（需要添加到配置文件）

### 3. 配置公钥

将生成的公钥添加到 `src-tauri/tauri.conf.json`：

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/{{owner}}/{{repo}}/releases/latest/download/latest.json"
      ],
      "dialog": true,
      "pubkey": "你的公钥内容"
    }
  }
}
```

### 4. 配置 GitHub 仓库信息

在 `tauri.conf.json` 的 `endpoints` 中，将 `{{owner}}` 和 `{{repo}}` 替换为你的 GitHub 用户名和仓库名：

```json
"endpoints": [
  "https://github.com/your-username/cobalt/releases/latest/download/latest.json"
]
```

### 5. 构建和发布

#### 构建应用

```bash
pnpm tauri build
```

#### 签名更新包

构建完成后，需要对更新包进行签名：

```bash
pnpm tauri signer sign ~/.tauri/cobalt.key \
  src-tauri/target/release/bundle/macos/cobalt.app.tar.gz
```

对于 Windows：
```bash
pnpm tauri signer sign ~/.tauri/cobalt.key \
  src-tauri/target/release/bundle/msi/cobalt_0.2.2_x64_en-US.msi
```

#### 创建 GitHub Release

1. 在 GitHub 上创建新的 Release
2. 上传以下文件：
   - 应用安装包（.dmg, .msi, .AppImage 等）
   - 签名文件（.sig）
   - `latest.json` 文件（见下方格式）

#### latest.json 格式

创建 `latest.json` 文件，内容如下：

```json
{
  "version": "0.2.2",
  "notes": "更新内容：\n- 新增自动更新功能\n- 修复已知问题",
  "pub_date": "2024-02-04T12:00:00Z",
  "platforms": {
    "darwin-x86_64": {
      "signature": "签名内容",
      "url": "https://github.com/your-username/cobalt/releases/download/v0.2.2/cobalt.app.tar.gz"
    },
    "darwin-aarch64": {
      "signature": "签名内容",
      "url": "https://github.com/your-username/cobalt/releases/download/v0.2.2/cobalt.app.tar.gz"
    },
    "windows-x86_64": {
      "signature": "签名内容",
      "url": "https://github.com/your-username/cobalt/releases/download/v0.2.2/cobalt_0.2.2_x64_en-US.msi"
    }
  }
}
```

## 使用体验

### 用户视角

1. **启动应用**：应用启动时会自动检查更新
2. **发现更新**：如果有新版本，会显示通知和弹窗
3. **查看更新日志**：弹窗中显示版本号和更新内容
4. **一键更新**：点击"立即更新"按钮
5. **自动安装**：下载完成后自动重启应用

### 开发者视角

每次发布新版本时：

1. 更新版本号（`tauri.conf.json` 和 `package.json`）
2. 构建应用：`pnpm tauri build`
3. 签名更新包
4. 创建 GitHub Release 并上传文件
5. 用户会自动收到更新通知

## 自动化发布（推荐）

可以使用 GitHub Actions 自动化发布流程。创建 `.github/workflows/release.yml`：

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    strategy:
      matrix:
        platform: [macos-latest, ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Install dependencies
        run: pnpm install

      - name: Build and release
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
        with:
          tagName: v__VERSION__
          releaseName: 'Cobalt v__VERSION__'
          releaseBody: 'See the assets to download and install this version.'
          releaseDraft: false
          prerelease: false
```

将私钥添加到 GitHub Secrets：
- 名称：`TAURI_PRIVATE_KEY`
- 值：`~/.tauri/cobalt.key` 的内容

## 测试更新功能

在开发环境测试：

```bash
# 1. 构建当前版本
pnpm tauri build

# 2. 修改版本号为更高版本（如 0.2.3）
# 3. 再次构建并创建测试 Release
# 4. 运行旧版本应用，应该会检测到更新
```

## 故障排查

### 更新检测失败

- 检查网络连接
- 确认 GitHub Release 已正确创建
- 验证 `latest.json` 格式正确

### 签名验证失败

- 确保公钥和私钥匹配
- 重新生成签名文件
- 检查 `tauri.conf.json` 中的公钥配置

### 下载失败

- 检查 Release 文件的 URL 是否正确
- 确认文件可公开访问
- 验证文件大小和格式

## 参考资料

- [Tauri Updater 官方文档](https://tauri.app/v1/guides/distribution/updater)
- [Tauri Action GitHub](https://github.com/tauri-apps/tauri-action)

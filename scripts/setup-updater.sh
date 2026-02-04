#!/bin/bash

# Cobalt 自动更新配置脚本

set -e

echo "🚀 Cobalt 自动更新配置向导"
echo "================================"
echo ""

# 检查是否已有密钥
if [ -f ~/.tauri/cobalt.key ]; then
    echo "⚠️  检测到已存在的密钥文件: ~/.tauri/cobalt.key"
    read -p "是否要重新生成密钥？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "跳过密钥生成步骤"
        SKIP_KEYGEN=true
    fi
fi

# 生成密钥
if [ "$SKIP_KEYGEN" != "true" ]; then
    echo ""
    echo "📝 步骤 1: 生成签名密钥对"
    echo "--------------------------------"
    mkdir -p ~/.tauri
    pnpm tauri signer generate -w ~/.tauri/cobalt.key

    echo ""
    echo "✅ 密钥已生成"
    echo "   私钥位置: ~/.tauri/cobalt.key"
    echo ""
fi

# 读取公钥
echo "📋 步骤 2: 配置公钥"
echo "--------------------------------"

if [ -f ~/.tauri/cobalt.key.pub ]; then
    PUBKEY=$(cat ~/.tauri/cobalt.key.pub)
    echo "公钥内容:"
    echo "$PUBKEY"
    echo ""

    # 更新 tauri.conf.json
    if command -v jq &> /dev/null; then
        echo "正在更新 src-tauri/tauri.conf.json..."
        jq --arg pubkey "$PUBKEY" '.plugins.updater.pubkey = $pubkey' src-tauri/tauri.conf.json > src-tauri/tauri.conf.json.tmp
        mv src-tauri/tauri.conf.json.tmp src-tauri/tauri.conf.json
        echo "✅ 公钥已自动配置到 tauri.conf.json"
    else
        echo "⚠️  未安装 jq，请手动将上述公钥复制到 src-tauri/tauri.conf.json 的 plugins.updater.pubkey 字段"
    fi
else
    echo "⚠️  未找到公钥文件，请手动运行: pnpm tauri signer generate -w ~/.tauri/cobalt.key"
fi

echo ""
echo "🔐 步骤 3: 配置 GitHub Secrets"
echo "--------------------------------"
echo "请在 GitHub 仓库设置中添加以下 Secret:"
echo ""
echo "名称: TAURI_PRIVATE_KEY"
echo "值: (私钥内容)"
echo ""

if [ -f ~/.tauri/cobalt.key ]; then
    echo "私钥内容:"
    echo "--------------------------------"
    cat ~/.tauri/cobalt.key
    echo "--------------------------------"
    echo ""
    echo "💡 提示: 可以使用以下命令复制私钥到剪贴板:"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "   cat ~/.tauri/cobalt.key | pbcopy"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "   cat ~/.tauri/cobalt.key | xclip -selection clipboard"
    fi
fi

echo ""
echo "🌐 步骤 4: 配置 GitHub 仓库信息"
echo "--------------------------------"
read -p "请输入 GitHub 用户名: " GITHUB_USER
read -p "请输入仓库名称 (默认: cobalt): " GITHUB_REPO
GITHUB_REPO=${GITHUB_REPO:-cobalt}

echo ""
echo "正在更新 tauri.conf.json 中的更新端点..."

# 更新 endpoints
ENDPOINT="https://github.com/$GITHUB_USER/$GITHUB_REPO/releases/latest/download/latest.json"

if command -v jq &> /dev/null; then
    jq --arg endpoint "$ENDPOINT" '.plugins.updater.endpoints = [$endpoint]' src-tauri/tauri.conf.json > src-tauri/tauri.conf.json.tmp
    mv src-tauri/tauri.conf.json.tmp src-tauri/tauri.conf.json
    echo "✅ 更新端点已配置: $ENDPOINT"
else
    echo "⚠️  请手动更新 src-tauri/tauri.conf.json 中的 plugins.updater.endpoints"
    echo "   设置为: [\"$ENDPOINT\"]"
fi

echo ""
echo "✅ 配置完成！"
echo "================================"
echo ""
echo "📝 后续步骤:"
echo "1. 安装依赖: pnpm install"
echo "2. 发布新版本: make tag-release VERSION=x.x.x"
echo "3. GitHub Actions 会自动构建并发布"
echo "4. 用户会自动收到更新通知"
echo ""
echo "📚 详细文档: docs/AUTO_UPDATE.md"
echo ""

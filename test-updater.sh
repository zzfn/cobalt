#!/bin/bash

# 本地自动更新测试脚本

echo "🚀 启动本地更新服务器..."
echo ""
echo "服务器地址: http://localhost:8000"
echo "latest.json: http://localhost:8000/latest.json"
echo "更新包: http://localhost:8000/cobalt.app.tar.gz"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

cd /Users/c.chen/dev/cobalt/src-tauri/target/universal-apple-darwin/release/bundle/macos

# 使用 Python 启动简单的 HTTP 服务器
python3 -m http.server 8000

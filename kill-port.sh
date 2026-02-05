#!/bin/bash

# 查找并杀掉占用指定端口的进程
# 用法: ./kill-port.sh [端口号]

PORT=${1:-1420}

echo "正在查找占用端口 $PORT 的进程..."

# 在 macOS 上使用 lsof 查找端口
if [[ "$OSTYPE" == "darwin"* ]]; then
    PID=$(lsof -ti:$PORT)
else
    # Linux 上使用 netstat 或 ss
    PID=$(ss -tlnp | grep ":$PORT " | awk '{print $7}' | cut -d',' -f2 | cut -d'=' -f2)
fi

if [ -z "$PID" ]; then
    echo "未找到占用端口 $PORT 的进程"
    exit 0
fi

echo "找到进程 PID: $PID"

# 显示进程信息
ps -p $PID -o pid,comm,args

# 杀掉进程
echo "正在终止进程 $PID..."
kill $PID

# 等待一下，检查是否成功终止
sleep 1

if ps -p $PID > /dev/null; then
    echo "进程未能终止，尝试强制终止..."
    kill -9 $PID
    sleep 1
fi

if ps -p $PID > /dev/null 2>&1; then
    echo "错误: 无法终止进程 $PID"
    exit 1
else
    echo "成功终止进程 $PID"
fi

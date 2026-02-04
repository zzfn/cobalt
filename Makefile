.PHONY: help install dev build clean release tag-release build-macos build-universal

# 默认目标
help:
	@echo "可用命令："
	@echo "  make install          - 安装依赖"
	@echo "  make dev              - 启动开发服务器"
	@echo "  make build            - 构建应用"
	@echo "  make build-macos      - 构建 macOS 应用（当前架构）"
	@echo "  make build-universal  - 构建 macOS Universal Binary"
	@echo "  make clean            - 清理构建产物"
	@echo "  make tag-release      - 创建并推送 release tag (VERSION=x.x.x)"
	@echo "  make release          - 本地完整发布流程"

# 安装依赖
install:
	@echo "安装依赖..."
	pnpm install

# 开发模式
dev:
	@echo "启动开发服务器..."
	pnpm tauri dev

# 构建前端
build-frontend:
	@echo "构建前端..."
	pnpm build

# 构建 macOS 应用（当前架构）
build-macos: build-frontend
	@echo "构建 macOS 应用..."
	pnpm tauri build

# 构建 Universal Binary（Intel + Apple Silicon）
build-universal: build-frontend
	@echo "构建 Universal Binary..."
	rustup target add aarch64-apple-darwin
	rustup target add x86_64-apple-darwin
	pnpm tauri build --target universal-apple-darwin

# 清理构建产物
clean:
	@echo "清理构建产物..."
	rm -rf dist
	rm -rf src-tauri/target
	rm -rf node_modules/.vite

# 创建并推送 release tag
tag-release:
	@if [ -z "$(VERSION)" ]; then \
		echo "错误: 请指定版本号，例如: make tag-release VERSION=0.1.0"; \
		exit 1; \
	fi
	@echo "创建 tag v$(VERSION)..."
	git tag -a v$(VERSION) -m "Release v$(VERSION)"
	@echo "推送 tag 到远程仓库..."
	git push origin v$(VERSION)
	@echo "✓ Tag v$(VERSION) 已创建并推送"
	@echo "GitHub Action 将自动开始构建发布版本"

# 本地完整发布流程
release: clean install build-universal
	@echo "✓ 本地构建完成"
	@echo "构建产物位置: src-tauri/target/universal-apple-darwin/release/bundle/"

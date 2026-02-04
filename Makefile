.PHONY: help install dev build clean release tag-release build-macos build-universal version

# 默认目标
help:
	@echo "可用命令："
	@echo "  make install          - 安装依赖"
	@echo "  make dev              - 启动开发服务器"
	@echo "  make build            - 构建应用"
	@echo "  make build-macos      - 构建 macOS 应用（当前架构）"
	@echo "  make build-universal  - 构建 macOS Universal Binary"
	@echo "  make clean            - 清理构建产物"
	@echo "  make version          - 更新所有配置文件版本号 (VERSION=x.x.x)"
	@echo "  make tag-release      - 更新版本号、创建并推送 release tag (VERSION=x.x.x)"
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

# 更新所有配置文件的版本号
version:
	@if [ -z "$(VERSION)" ]; then \
		echo "错误: 请指定版本号，例如: make version VERSION=0.2.0"; \
		exit 1; \
	fi
	@echo "更新版本号到 $(VERSION)..."
	@# 更新 package.json
	@sed -i '' 's/"version": "[^"]*"/"version": "$(VERSION)"/' package.json
	@# 更新 Cargo.toml
	@sed -i '' 's/^version = "[^"]*"/version = "$(VERSION)"/' src-tauri/Cargo.toml
	@# 更新 tauri.conf.json
	@sed -i '' 's/"version": "[^"]*"/"version": "$(VERSION)"/' src-tauri/tauri.conf.json
	@echo "✓ 版本号已更新到 $(VERSION)"
	@echo "  - package.json"
	@echo "  - src-tauri/Cargo.toml"
	@echo "  - src-tauri/tauri.conf.json"

# 创建并推送 release tag
tag-release: version
	@echo "提交版本更新..."
	git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
	git commit -m "chore: bump version to $(VERSION)"
	@echo "创建 tag v$(VERSION)..."
	git tag -a v$(VERSION) -m "Release v$(VERSION)"
	@echo "推送到远程仓库..."
	git push origin main
	git push origin v$(VERSION)
	@echo "✓ 版本 $(VERSION) 已发布"
	@echo "GitHub Action 将自动开始构建发布版本"

# 本地完整发布流程
release: clean install build-universal
	@echo "✓ 本地构建完成"
	@echo "构建产物位置: src-tauri/target/universal-apple-darwin/release/bundle/"

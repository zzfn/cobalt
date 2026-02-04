.PHONY: help install dev build clean release tag-release build-macos build-universal version sign-update generate-keys bump-patch bump-minor bump-major release-patch release-minor release-major get-version

# 默认目标
help:
	@echo "可用命令："
	@echo ""
	@echo "开发命令："
	@echo "  make install          - 安装依赖"
	@echo "  make dev              - 启动开发服务器"
	@echo "  make build            - 构建应用"
	@echo "  make build-macos      - 构建 macOS 应用（当前架构）"
	@echo "  make build-universal  - 构建 macOS Universal Binary"
	@echo "  make clean            - 清理构建产物"
	@echo ""
	@echo "版本管理："
	@echo "  make get-version      - 查看当前版本号"
	@echo "  make bump-patch       - 自动递增补丁版本号 (0.2.2 -> 0.2.3)"
	@echo "  make bump-minor       - 自动递增次版本号 (0.2.2 -> 0.3.0)"
	@echo "  make bump-major       - 自动递增主版本号 (0.2.2 -> 1.0.0)"
	@echo "  make version          - 手动指定版本号 (VERSION=x.x.x)"
	@echo ""
	@echo "发布命令（推荐）："
	@echo "  make release-patch    - 🚀 自动递增补丁版本并发布 (最常用)"
	@echo "  make release-minor    - 🚀 自动递增次版本并发布"
	@echo "  make release-major    - 🚀 自动递增主版本并发布"
	@echo ""
	@echo "其他命令："
	@echo "  make tag-release      - 手动发布指定版本 (VERSION=x.x.x)"
	@echo "  make release          - 本地完整发布流程"
	@echo "  make generate-keys    - 生成更新签名密钥对"
	@echo "  make sign-update      - 签名更新包 (VERSION=x.x.x)"

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
	@# 更新 Cargo.lock
	@cd src-tauri && cargo update -p cobalt
	@echo "✓ 版本号已更新到 $(VERSION)"
	@echo "  - package.json"
	@echo "  - src-tauri/Cargo.toml"
	@echo "  - src-tauri/tauri.conf.json"
	@echo "  - src-tauri/Cargo.lock"

# 获取当前版本号
get-version:
	@grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/'

# 自动递增补丁版本号 (0.2.2 -> 0.2.3)
bump-patch:
	@CURRENT=$$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/'); \
	MAJOR=$$(echo $$CURRENT | cut -d. -f1); \
	MINOR=$$(echo $$CURRENT | cut -d. -f2); \
	PATCH=$$(echo $$CURRENT | cut -d. -f3); \
	NEW_PATCH=$$((PATCH + 1)); \
	NEW_VERSION="$$MAJOR.$$MINOR.$$NEW_PATCH"; \
	echo "当前版本: $$CURRENT"; \
	echo "新版本: $$NEW_VERSION"; \
	$(MAKE) version VERSION=$$NEW_VERSION

# 自动递增次版本号 (0.2.2 -> 0.3.0)
bump-minor:
	@CURRENT=$$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/'); \
	MAJOR=$$(echo $$CURRENT | cut -d. -f1); \
	MINOR=$$(echo $$CURRENT | cut -d. -f2); \
	NEW_MINOR=$$((MINOR + 1)); \
	NEW_VERSION="$$MAJOR.$$NEW_MINOR.0"; \
	echo "当前版本: $$CURRENT"; \
	echo "新版本: $$NEW_VERSION"; \
	$(MAKE) version VERSION=$$NEW_VERSION

# 自动递增主版本号 (0.2.2 -> 1.0.0)
bump-major:
	@CURRENT=$$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/'); \
	MAJOR=$$(echo $$CURRENT | cut -d. -f1); \
	NEW_MAJOR=$$((MAJOR + 1)); \
	NEW_VERSION="$$NEW_MAJOR.0.0"; \
	echo "当前版本: $$CURRENT"; \
	echo "新版本: $$NEW_VERSION"; \
	$(MAKE) version VERSION=$$NEW_VERSION

# 创建并推送 release tag
tag-release: version
	@echo "提交版本更新..."
	git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json src-tauri/Cargo.lock
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

# 快速发布补丁版本 (最常用)
release-patch: bump-patch
	@NEW_VERSION=$$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/'); \
	echo ""; \
	echo "📦 准备发布补丁版本 v$$NEW_VERSION"; \
	echo ""; \
	read -p "确认发布? (y/N): " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "提交版本更新..."; \
		git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json src-tauri/Cargo.lock; \
		git commit -m "chore: bump version to $$NEW_VERSION"; \
		echo "创建 tag v$$NEW_VERSION..."; \
		git tag -a v$$NEW_VERSION -m "Release v$$NEW_VERSION"; \
		echo "推送到远程仓库..."; \
		git push origin main; \
		git push origin v$$NEW_VERSION; \
		echo ""; \
		echo "✓ 版本 $$NEW_VERSION 已发布"; \
		echo "GitHub Action 将自动开始构建发布版本"; \
	else \
		echo "已取消发布"; \
		git checkout -- package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json src-tauri/Cargo.lock; \
	fi

# 快速发布次版本
release-minor: bump-minor
	@NEW_VERSION=$$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/'); \
	echo ""; \
	echo "📦 准备发布次版本 v$$NEW_VERSION"; \
	echo ""; \
	read -p "确认发布? (y/N): " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "提交版本更新..."; \
		git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json src-tauri/Cargo.lock; \
		git commit -m "chore: bump version to $$NEW_VERSION"; \
		echo "创建 tag v$$NEW_VERSION..."; \
		git tag -a v$$NEW_VERSION -m "Release v$$NEW_VERSION"; \
		echo "推送到远程仓库..."; \
		git push origin main; \
		git push origin v$$NEW_VERSION; \
		echo ""; \
		echo "✓ 版本 $$NEW_VERSION 已发布"; \
		echo "GitHub Action 将自动开始构建发布版本"; \
	else \
		echo "已取消发布"; \
		git checkout -- package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json src-tauri/Cargo.lock; \
	fi

# 快速发布主版本
release-major: bump-major
	@NEW_VERSION=$$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/'); \
	echo ""; \
	echo "📦 准备发布主版本 v$$NEW_VERSION"; \
	echo ""; \
	read -p "确认发布? (y/N): " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "提交版本更新..."; \
		git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json src-tauri/Cargo.lock; \
		git commit -m "chore: bump version to $$NEW_VERSION"; \
		echo "创建 tag v$$NEW_VERSION..."; \
		git tag -a v$$NEW_VERSION -m "Release v$$NEW_VERSION"; \
		echo "推送到远程仓库..."; \
		git push origin main; \
		git push origin v$$NEW_VERSION; \
		echo ""; \
		echo "✓ 版本 $$NEW_VERSION 已发布"; \
		echo "GitHub Action 将自动开始构建发布版本"; \
	else \
		echo "已取消发布"; \
		git checkout -- package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json src-tauri/Cargo.lock; \
	fi

# 生成更新签名密钥对
generate-keys:
	@echo "生成更新签名密钥对..."
	@mkdir -p ~/.tauri
	pnpm tauri signer generate -w ~/.tauri/cobalt.key --force
	@echo "✓ 密钥已生成"
	@echo "  私钥: ~/.tauri/cobalt.key (请妥善保管)"
	@echo "  公钥: 已输出到终端，请复制到 src-tauri/tauri.conf.json"

# 签名更新包
sign-update:
	@if [ -z "$(VERSION)" ]; then \
		echo "错误: 请指定版本号，例如: make sign-update VERSION=0.2.2"; \
		exit 1; \
	fi
	@if [ ! -f ~/.tauri/cobalt.key ]; then \
		echo "错误: 未找到私钥文件，请先运行 make generate-keys"; \
		exit 1; \
	fi
	@echo "签名 macOS 更新包..."
	@if [ -f "src-tauri/target/universal-apple-darwin/release/bundle/macos/cobalt.app.tar.gz" ]; then \
		pnpm tauri signer sign ~/.tauri/cobalt.key \
			src-tauri/target/universal-apple-darwin/release/bundle/macos/cobalt.app.tar.gz; \
		echo "✓ macOS 包已签名"; \
	else \
		echo "警告: 未找到 macOS 构建产物"; \
	fi
	@echo "签名 DMG 文件..."
	@if [ -f "src-tauri/target/universal-apple-darwin/release/bundle/dmg/cobalt_$(VERSION)_universal.dmg" ]; then \
		pnpm tauri signer sign ~/.tauri/cobalt.key \
			src-tauri/target/universal-apple-darwin/release/bundle/dmg/cobalt_$(VERSION)_universal.dmg; \
		echo "✓ DMG 已签名"; \
	else \
		echo "警告: 未找到 DMG 文件"; \
	fi
	@echo "✓ 签名完成"
	@echo "请将 .sig 文件和安装包一起上传到 GitHub Release"


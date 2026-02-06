// Skill 市场管理命令
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

/// 获取 Cobalt 配置目录路径
fn get_cobalt_dir() -> Result<PathBuf, String> {
    dirs::home_dir()
        .map(|home| home.join(".cobalt"))
        .ok_or_else(|| "无法获取用户主目录".to_string())
}

/// 获取 Claude 配置目录路径（用于访问 Skills）
fn get_claude_dir() -> Result<PathBuf, String> {
    dirs::home_dir()
        .map(|home| home.join(".claude"))
        .ok_or_else(|| "无法获取用户主目录".to_string())
}

/// 获取 Skills 目录路径
fn get_skills_dir() -> Result<PathBuf, String> {
    Ok(get_claude_dir()?.join("skills"))
}

/// 获取市场配置文件路径
fn get_marketplace_config_path() -> Result<PathBuf, String> {
    Ok(get_cobalt_dir()?.join("marketplace.json"))
}

/// 获取市场缓存目录路径
fn get_marketplace_cache_dir() -> Result<PathBuf, String> {
    Ok(get_cobalt_dir()?.join(".cache").join("marketplace"))
}

/// 获取指定市场源的缓存文件路径
fn get_marketplace_cache_path(source_id: &str) -> Result<PathBuf, String> {
    Ok(get_marketplace_cache_dir()?.join(format!("{}.json", source_id)))
}

/// 市场源配置
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceSource {
    pub id: String,
    pub name: String,
    pub url: String,
    pub enabled: bool,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default = "default_priority")]
    pub priority: i32,
    #[serde(default)]
    pub last_refreshed: Option<String>,
    #[serde(default)]
    pub skill_count: usize,
    #[serde(default = "default_auto_update")]
    pub auto_update: bool,
    #[serde(default)]
    pub is_custom: bool, // 标记是否为用户自定义的数据源
}

fn default_priority() -> i32 {
    0
}

fn default_auto_update() -> bool {
    true
}

/// 市场设置
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceSettings {
    #[serde(default = "default_auto_refresh_interval")]
    pub auto_refresh_interval: u64,
    #[serde(default = "default_enable_auto_update")]
    pub enable_auto_update: bool,
}

fn default_auto_refresh_interval() -> u64 {
    86400 // 24 小时
}

fn default_enable_auto_update() -> bool {
    true
}

impl Default for MarketplaceSettings {
    fn default() -> Self {
        Self {
            auto_refresh_interval: default_auto_refresh_interval(),
            enable_auto_update: default_enable_auto_update(),
        }
    }
}

/// 市场配置文件
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceConfig {
    #[serde(default = "default_version")]
    pub version: String,
    #[serde(default)]
    pub sources: Vec<MarketplaceSource>,
    #[serde(default)]
    pub settings: MarketplaceSettings,
}

fn default_version() -> String {
    "1.0.0".to_string()
}

impl Default for MarketplaceConfig {
    fn default() -> Self {
        Self {
            version: default_version(),
            sources: Vec::new(),
            settings: MarketplaceSettings::default(),
        }
    }
}

/// 缓存的 Skill 信息
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CachedSkillInfo {
    pub name: String,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub target_tools: Vec<String>,
    #[serde(default)]
    pub installed: bool,
    #[serde(default)]
    pub installed_version: Option<String>,
    #[serde(default)]
    pub has_update: bool,
}

/// 市场缓存
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceCache {
    pub source_id: String,
    pub url: String,
    pub scanned_at: String,
    #[serde(default)]
    pub skills: Vec<CachedSkillInfo>,
}

/// 读取市场配置文件
pub fn read_marketplace_config() -> Result<MarketplaceConfig, String> {
    let config_path = get_marketplace_config_path()?;

    if !config_path.exists() {
        return Ok(MarketplaceConfig::default());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("读取 marketplace.json 失败: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("解析 marketplace.json 失败: {}", e))
}

/// 写入市场配置文件
pub fn write_marketplace_config(config: &MarketplaceConfig) -> Result<(), String> {
    let cobalt_dir = get_cobalt_dir()?;

    // 确保 Cobalt 目录存在
    fs::create_dir_all(&cobalt_dir).map_err(|e| format!("创建 .cobalt 目录失败: {}", e))?;

    let config_path = get_marketplace_config_path()?;

    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("序列化配置失败: {}", e))?;

    fs::write(&config_path, content).map_err(|e| format!("写入 marketplace.json 失败: {}", e))
}

/// 读取市场缓存文件
pub fn read_marketplace_cache(source_id: &str) -> Result<MarketplaceCache, String> {
    let cache_path = get_marketplace_cache_path(source_id)?;

    if !cache_path.exists() {
        return Err(format!("市场源 {} 的缓存不存在", source_id));
    }

    let content = fs::read_to_string(&cache_path)
        .map_err(|e| format!("读取缓存文件失败: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("解析缓存文件失败: {}", e))
}

/// 写入市场缓存文件
pub fn write_marketplace_cache(cache: &MarketplaceCache) -> Result<(), String> {
    let cache_dir = get_marketplace_cache_dir()?;

    // 确保缓存目录存在
    fs::create_dir_all(&cache_dir).map_err(|e| format!("创建缓存目录失败: {}", e))?;

    let cache_path = get_marketplace_cache_path(&cache.source_id)?;

    let content = serde_json::to_string_pretty(&cache)
        .map_err(|e| format!("序列化缓存失败: {}", e))?;

    fs::write(&cache_path, content).map_err(|e| format!("写入缓存文件失败: {}", e))
}

/// 验证 URL 格式
fn validate_url(url: &str) -> Result<(), String> {
    // 支持 HTTPS 和 SSH 格式
    if url.starts_with("https://") || url.starts_with("git@") {
        Ok(())
    } else {
        Err("URL 必须以 https:// 或 git@ 开头".to_string())
    }
}

/// 列出所有市场源
#[tauri::command]
pub fn list_marketplace() -> Result<Vec<MarketplaceSource>, String> {
    let config = read_marketplace_config()?;
    Ok(config.sources)
}

/// 添加市场源
#[tauri::command]
pub async fn add_marketplace(
    name: String,
    url: String,
    tags: Option<Vec<String>>,
    description: Option<String>,
) -> Result<MarketplaceSource, String> {
    // 验证 URL 格式
    validate_url(&url)?;

    let mut config = read_marketplace_config()?;

    // 检查 URL 是否已存在
    if config.sources.iter().any(|s| s.url == url) {
        return Err("该 URL 已存在".to_string());
    }

    // 创建新市场源
    let source = MarketplaceSource {
        id: Uuid::new_v4().to_string(),
        name,
        url,
        enabled: true,
        tags: tags.unwrap_or_default(),
        description,
        priority: 0,
        last_refreshed: None,
        skill_count: 0,
        auto_update: true,
        is_custom: true, // 用户手动添加的标记为自定义
    };

    config.sources.push(source.clone());
    write_marketplace_config(&config)?;

    Ok(source)
}

/// 删除市场源
#[tauri::command]
pub fn remove_marketplace(source_id: String) -> Result<(), String> {
    let mut config = read_marketplace_config()?;

    let original_len = config.sources.len();
    config.sources.retain(|s| s.id != source_id);

    if config.sources.len() == original_len {
        return Err(format!("市场源 {} 不存在", source_id));
    }

    write_marketplace_config(&config)?;

    // 删除缓存文件
    let cache_path = get_marketplace_cache_path(&source_id)?;
    if cache_path.exists() {
        fs::remove_file(&cache_path).map_err(|e| format!("删除缓存文件失败: {}", e))?;
    }

    Ok(())
}

/// 启用/禁用市场源
#[tauri::command]
pub fn toggle_marketplace(source_id: String, enabled: bool) -> Result<(), String> {
    let mut config = read_marketplace_config()?;

    let source = config
        .sources
        .iter_mut()
        .find(|s| s.id == source_id)
        .ok_or_else(|| format!("市场源 {} 不存在", source_id))?;

    source.enabled = enabled;
    write_marketplace_config(&config)?;

    Ok(())
}

/// 更新市场源信息
#[tauri::command]
pub fn update_marketplace(
    source_id: String,
    name: Option<String>,
    tags: Option<Vec<String>>,
    description: Option<String>,
    priority: Option<i32>,
) -> Result<MarketplaceSource, String> {
    let mut config = read_marketplace_config()?;

    let source = config
        .sources
        .iter_mut()
        .find(|s| s.id == source_id)
        .ok_or_else(|| format!("市场源 {} 不存在", source_id))?;

    if let Some(n) = name {
        source.name = n;
    }
    if let Some(t) = tags {
        source.tags = t;
    }
    if let Some(d) = description {
        source.description = Some(d);
    }
    if let Some(p) = priority {
        source.priority = p;
    }

    let updated_source = source.clone();
    write_marketplace_config(&config)?;

    Ok(updated_source)
}

/// 刷新市场源（扫描并缓存 Skills）
#[tauri::command]
pub async fn refresh_marketplace(source_id: String) -> Result<MarketplaceCache, String> {
    use std::process::Command;
    use chrono::Utc;

    let mut config = read_marketplace_config()?;
    let source = config
        .sources
        .iter()
        .find(|s| s.id == source_id)
        .ok_or_else(|| format!("市场源 {} 不存在", source_id))?
        .clone();

    println!("🔍 开始刷新市场源: {}", source.name);
    println!("📍 仓库地址: {}", source.url);

    // 从 URL 提取仓库名称
    let repo_name = source
        .url
        .trim_end_matches('/')
        .split('/')
        .last()
        .ok_or_else(|| "无效的仓库 URL".to_string())?
        .trim_end_matches(".git");

    println!("📦 仓库名称: {}", repo_name);

    // 创建临时目录用于克隆
    let temp_dir = std::env::temp_dir().join(format!("cobalt-source-scan-{}", repo_name));
    println!("📂 临时目录: {}", temp_dir.display());

    if temp_dir.exists() {
        println!("🧹 清理旧的临时目录...");
        fs::remove_dir_all(&temp_dir).map_err(|e| format!("删除临时目录失败: {}", e))?;
    }

    // 克隆仓库到临时目录（浅克隆）
    println!("⏳ 开始克隆仓库...");
    println!("🔧 执行命令: git clone --depth 1 {} {}", source.url, temp_dir.display());

    let output = Command::new("git")
        .args(&["clone", "--depth", "1", &source.url, temp_dir.to_str().unwrap()])
        .env("GIT_TERMINAL_PROMPT", "0")  // 禁用交互式提示
        .env("GIT_ASKPASS", "echo")       // 避免弹出密码提示
        .output()
        .map_err(|e| format!("执行 git clone 失败: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        println!("❌ 克隆失败: {}", error);
        return Err(format!("克隆仓库失败: {}。提示：请确保仓库 URL 正确且可公开访问", error));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    if !stdout.is_empty() {
        println!("📝 Git 输出:\n{}", stdout);
    }

    println!("✅ 仓库克隆成功");

    // 检查是否有 skills 子目录
    let skills_subdir = temp_dir.join("skills");
    let source_dir = if skills_subdir.exists() && skills_subdir.is_dir() {
        println!("✅ 发现 skills/ 子目录: {}", skills_subdir.display());
        skills_subdir
    } else {
        println!("📝 未找到 skills/ 子目录，将整个仓库作为单个 skill");
        temp_dir.clone()
    };

    // 扫描 skills
    println!("🔍 开始扫描 skills...");
    let skills = scan_marketplace_skills(&source_dir)?;

    // 清理临时目录
    println!("🧹 清理临时目录...");
    if temp_dir.exists() {
        let _ = fs::remove_dir_all(&temp_dir);
    }

    // 创建缓存
    let cache = MarketplaceCache {
        source_id: source.id.clone(),
        url: source.url.clone(),
        scanned_at: Utc::now().to_rfc3339(),
        skills: skills.clone(),
    };

    println!("💾 写入缓存文件...");
    // 写入缓存
    write_marketplace_cache(&cache)?;

    println!("📝 更新市场源配置...");
    // 更新市场源的 lastRefreshed 和 skillCount
    let source_mut = config
        .sources
        .iter_mut()
        .find(|s| s.id == source_id)
        .unwrap();
    source_mut.last_refreshed = Some(cache.scanned_at.clone());
    source_mut.skill_count = skills.len();
    write_marketplace_config(&config)?;

    println!("🎉 刷新完成！扫描到 {} 个 skill(s)", skills.len());
    Ok(cache)
}

/// 扫描市场源目录中的 Skills
fn scan_marketplace_skills(source_dir: &PathBuf) -> Result<Vec<CachedSkillInfo>, String> {
    use super::skills::{read_skill_registry, parse_skill_frontmatter};

    let mut skills = Vec::new();
    let skills_dir = get_skills_dir()?;
    let disabled_skills_dir = get_claude_dir()?.join(".disabled_skills");

    // 读取已安装的 skills 注册表
    let registry = read_skill_registry().unwrap_or_default();

    // 检查是否是单个 skill（包含 SKILL.md）
    let skill_md = source_dir.join("SKILL.md");
    if skill_md.exists() {
        println!("📖 发现 SKILL.md，作为单个 skill");
        let skill_name = source_dir
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("skill");

        // 读取 metadata
        let content = fs::read_to_string(&skill_md).ok();
        let metadata = content.as_ref().and_then(|c| parse_skill_frontmatter(&c, skill_name));

        // 检查是否已安装
        let installed = skills_dir.join(skill_name).exists()
            || disabled_skills_dir.join(skill_name).exists();

        let installed_version = if installed {
            registry
                .skills
                .iter()
                .find(|s| s.name == skill_name)
                .and_then(|s| s.metadata.as_ref())
                .and_then(|m| m.version.clone())
        } else {
            None
        };

        let current_version = metadata.as_ref().and_then(|m| m.version.clone());
        let has_update = if let (Some(installed_v), Some(current_v)) = (&installed_version, &current_version) {
            installed_v != current_v
        } else {
            false
        };

        skills.push(CachedSkillInfo {
            name: skill_name.to_string(),
            description: metadata.as_ref().and_then(|m| m.description.clone()),
            version: current_version,
            tags: metadata.as_ref().map(|m| m.tags.clone()).unwrap_or_default(),
            target_tools: metadata.as_ref().map(|m| m.target_tools.clone()).unwrap_or_default(),
            installed,
            installed_version,
            has_update,
        });
        return Ok(skills);
    }

    // 否则扫描子目录
    println!("🔍 扫描子目录中的 skills...");
    let entries = fs::read_dir(source_dir)
        .map_err(|e| format!("读取目录失败: {}", e))?;

    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.is_dir() {
                let skill_md = path.join("SKILL.md");
                if skill_md.exists() {
                    let skill_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("skill");

                    // 读取 metadata
                    let content = fs::read_to_string(&skill_md).ok();
                    let metadata = content.as_ref().and_then(|c| parse_skill_frontmatter(&c, skill_name));

                    // 检查是否已安装
                    let installed = skills_dir.join(skill_name).exists()
                        || disabled_skills_dir.join(skill_name).exists();

                    let installed_version = if installed {
                        registry
                            .skills
                            .iter()
                            .find(|s| s.name == skill_name)
                            .and_then(|s| s.metadata.as_ref())
                            .and_then(|m| m.version.clone())
                    } else {
                        None
                    };

                    let current_version = metadata.as_ref().and_then(|m| m.version.clone());
                    let has_update = if let (Some(installed_v), Some(current_v)) = (&installed_version, &current_version) {
                        installed_v != current_v
                    } else {
                        false
                    };

                    skills.push(CachedSkillInfo {
                        name: skill_name.to_string(),
                        description: metadata.as_ref().and_then(|m| m.description.clone()),
                        version: current_version,
                        tags: metadata.as_ref().map(|m| m.tags.clone()).unwrap_or_default(),
                        target_tools: metadata.as_ref().map(|m| m.target_tools.clone()).unwrap_or_default(),
                        installed,
                        installed_version,
                        has_update,
                    });

                    println!("  ✓ {}", skill_name);
                }
            }
        }
    }

    Ok(skills)
}

/// 刷新所有启用的市场源
#[tauri::command]
pub async fn refresh_all_marketplace() -> Result<Vec<MarketplaceCache>, String> {
    let config = read_marketplace_config()?;
    let mut caches = Vec::new();

    for source in config.sources.iter().filter(|s| s.enabled) {
        match refresh_marketplace(source.id.clone()).await {
            Ok(cache) => caches.push(cache),
            Err(e) => {
                eprintln!("刷新市场源 {} 失败: {}", source.name, e);
            }
        }
    }

    Ok(caches)
}

/// 获取市场源的 Skills（从缓存）
#[tauri::command]
pub fn get_marketplace_skills(source_id: String) -> Result<MarketplaceCache, String> {
    read_marketplace_cache(&source_id)
}

/// 从市场源安装 Skills
#[tauri::command]
pub async fn install_skill_from_marketplace(
    source_id: String,
    skill_names: Vec<String>,
    target_tools: Option<Vec<String>>,
) -> Result<String, String> {
    use super::skills::{install_skill_from_repo, read_skill_registry, write_skill_registry};

    let config = read_marketplace_config()?;
    let source = config
        .sources
        .iter()
        .find(|s| s.id == source_id)
        .ok_or_else(|| format!("市场源 {} 不存在", source_id))?;

    // 调用现有的安装函数
    let result = install_skill_from_repo(source.url.clone(), Some(skill_names.clone()), target_tools).await?;

    // 安装完成后，更新 metadata 中的 sourceId
    let mut registry = read_skill_registry().map_err(|e| format!("读取注册表失败: {}", e))?;

    for skill_name in &skill_names {
        if let Some(entry) = registry.skills.iter_mut().find(|s| s.name == *skill_name) {
            if let Some(ref mut metadata) = entry.metadata {
                metadata.source_id = Some(source_id.clone());
            }
        }
    }

    write_skill_registry(registry).map_err(|e| format!("写入注册表失败: {}", e))?;

    Ok(result)
}

/// 获取内置的默认数据源
fn get_builtin_sources() -> Vec<(String, String, String, Vec<String>)> {
    vec![
        (
            "https://github.com/anthropics/skills".to_string(),
            "Anthropic 官方技能".to_string(),
            "Anthropic 官方维护的 Claude Code 技能集合".to_string(),
            vec!["official".to_string(), "verified".to_string(), "anthropic".to_string()],
        ),
        (
            "https://github.com/vercel-labs/agent-browser".to_string(),
            "Agent Browser".to_string(),
            "Vercel Labs 的浏览器自动化工具，支持 AI Agent 进行网页交互".to_string(),
            vec!["community".to_string(), "browser".to_string(), "automation".to_string(), "vercel".to_string()],
        ),
        (
            "https://github.com/softaworks/agent-toolkit".to_string(),
            "Agent Toolkit".to_string(),
            "Softaworks 的 Agent 工具集，提供丰富的 AI Agent 技能".to_string(),
            vec!["community".to_string(), "toolkit".to_string(), "softaworks".to_string()],
        ),
    ]
}

/// 初始化默认数据源（首次启动时或添加新的内置源）
#[tauri::command]
pub async fn init_default_sources() -> Result<Vec<MarketplaceSource>, String> {
    let mut config = read_marketplace_config()?;

    println!("🔍 检查内置数据源...");

    let builtin_sources = get_builtin_sources();
    let mut added_sources = Vec::new();

    for (url, name, description, tags) in builtin_sources {
        // 检查该 URL 是否已存在
        if config.sources.iter().any(|s| s.url == url) {
            println!("⏭️  跳过已存在的数据源: {}", name);
            continue;
        }

        let source = MarketplaceSource {
            id: Uuid::new_v4().to_string(),
            name: name.clone(),
            url,
            enabled: true,
            tags,
            description: if description.is_empty() { None } else { Some(description) },
            priority: 0,
            last_refreshed: None,
            skill_count: 0,
            auto_update: true,
            is_custom: false,
        };

        config.sources.push(source.clone());
        added_sources.push(source);
        println!("✅ 添加内置数据源: {}", name);
    }

    if !added_sources.is_empty() {
        write_marketplace_config(&config)?;
        println!("🎉 初始化完成，添加了 {} 个新数据源", added_sources.len());
    } else {
        println!("✅ 所有内置数据源已存在，无需添加");
    }

    Ok(added_sources)
}


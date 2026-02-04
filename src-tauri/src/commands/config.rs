// 配置文件管理命令
use chrono::Local;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Claude 配置目录路径
fn get_claude_dir() -> Result<PathBuf, String> {
    dirs::home_dir()
        .map(|home| home.join(".claude"))
        .ok_or_else(|| "无法获取用户主目录".to_string())
}

/// 获取 Claude 配置目录路径
#[tauri::command]
pub fn get_claude_config_dir() -> Result<String, String> {
    get_claude_dir().map(|p| p.to_string_lossy().to_string())
}

/// Claude settings.json 结构
#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeSettings {
    #[serde(default)]
    pub permissions: Permissions,
    #[serde(default)]
    pub api_key_helper: Option<String>,
    #[serde(default)]
    pub env: std::collections::HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Permissions {
    #[serde(default)]
    pub allow: Vec<String>,
    #[serde(default)]
    pub deny: Vec<String>,
}

/// 读取 settings.json
#[tauri::command]
pub fn read_settings() -> Result<ClaudeSettings, String> {
    let settings_path = get_claude_dir()?.join("settings.json");

    if !settings_path.exists() {
        return Ok(ClaudeSettings::default());
    }

    let content = fs::read_to_string(&settings_path)
        .map_err(|e| format!("读取 settings.json 失败: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("解析 settings.json 失败: {}", e))
}

/// 写入 settings.json
#[tauri::command]
pub fn write_settings(settings: ClaudeSettings) -> Result<(), String> {
    let settings_path = get_claude_dir()?.join("settings.json");

    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("序列化 settings 失败: {}", e))?;

    fs::write(&settings_path, content).map_err(|e| format!("写入 settings.json 失败: {}", e))
}

/// 读取 CLAUDE.md（全局指令）
#[tauri::command]
pub fn read_claude_md() -> Result<String, String> {
    let claude_md_path = get_claude_dir()?.join("CLAUDE.md");

    if !claude_md_path.exists() {
        return Ok(String::new());
    }

    fs::read_to_string(&claude_md_path).map_err(|e| format!("读取 CLAUDE.md 失败: {}", e))
}

/// 写入 CLAUDE.md（全局指令）
#[tauri::command]
pub fn write_claude_md(content: String) -> Result<(), String> {
    let claude_md_path = get_claude_dir()?.join("CLAUDE.md");

    fs::write(&claude_md_path, content).map_err(|e| format!("写入 CLAUDE.md 失败: {}", e))
}

/// 备份配置信息
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupInfo {
    pub path: String,
    pub timestamp: String,
}

/// 备份配置文件
#[tauri::command]
pub fn backup_config() -> Result<BackupInfo, String> {
    let claude_dir = get_claude_dir()?;
    let backup_dir = claude_dir.join("backups");

    // 创建备份目录
    fs::create_dir_all(&backup_dir).map_err(|e| format!("创建备份目录失败: {}", e))?;

    let timestamp = Local::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_path = backup_dir.join(format!("backup_{}", timestamp));

    fs::create_dir_all(&backup_path).map_err(|e| format!("创建备份子目录失败: {}", e))?;

    // 备份 settings.json
    let settings_src = claude_dir.join("settings.json");
    if settings_src.exists() {
        fs::copy(&settings_src, backup_path.join("settings.json"))
            .map_err(|e| format!("备份 settings.json 失败: {}", e))?;
    }

    // 备份 CLAUDE.md
    let claude_md_src = claude_dir.join("CLAUDE.md");
    if claude_md_src.exists() {
        fs::copy(&claude_md_src, backup_path.join("CLAUDE.md"))
            .map_err(|e| format!("备份 CLAUDE.md 失败: {}", e))?;
    }

    Ok(BackupInfo {
        path: backup_path.to_string_lossy().to_string(),
        timestamp,
    })
}

/// API Key 配置档案
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApiKeyProfile {
    pub id: String,
    pub name: String,
    pub api_key: String,
    pub base_url: String,
    pub created_at: String,
}

/// API Key 配置档案列表
#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ApiKeyProfiles {
    pub profiles: Vec<ApiKeyProfile>,
    pub active_profile_id: Option<String>,
}

/// 读取 API Key 配置档案
#[tauri::command]
pub fn read_api_profiles() -> Result<ApiKeyProfiles, String> {
    let profiles_path = get_claude_dir()?.join("api-profiles.json");

    if !profiles_path.exists() {
        return Ok(ApiKeyProfiles::default());
    }

    let content = fs::read_to_string(&profiles_path)
        .map_err(|e| format!("读取 api-profiles.json 失败: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("解析 api-profiles.json 失败: {}", e))
}

/// 写入 API Key 配置档案
#[tauri::command]
pub fn write_api_profiles(profiles: ApiKeyProfiles) -> Result<(), String> {
    let profiles_path = get_claude_dir()?.join("api-profiles.json");

    let content = serde_json::to_string_pretty(&profiles)
        .map_err(|e| format!("序列化 profiles 失败: {}", e))?;

    fs::write(&profiles_path, content).map_err(|e| format!("写入 api-profiles.json 失败: {}", e))
}

/// 更新 settings.json 中的环境变量（部分更新）
#[tauri::command]
pub fn update_env_vars(updates: std::collections::HashMap<String, String>) -> Result<(), String> {
    let settings_path = get_claude_dir()?.join("settings.json");

    // 读取现有配置
    let mut settings = if settings_path.exists() {
        let content = fs::read_to_string(&settings_path)
            .map_err(|e| format!("读取 settings.json 失败: {}", e))?;
        serde_json::from_str::<ClaudeSettings>(&content)
            .map_err(|e| format!("解析 settings.json 失败: {}", e))?
    } else {
        ClaudeSettings::default()
    };

    // 只更新指定的环境变量
    for (key, value) in updates {
        settings.env.insert(key, value);
    }

    // 写回配置
    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("序列化 settings 失败: {}", e))?;

    fs::write(&settings_path, content).map_err(|e| format!("写入 settings.json 失败: {}", e))
}

/// 切换 API Key 配置档案
#[tauri::command]
pub fn switch_api_profile(profile_id: String) -> Result<(), String> {
    // 读取 profiles
    let mut profiles = read_api_profiles()?;

    // 查找目标 profile
    let profile = profiles
        .profiles
        .iter()
        .find(|p| p.id == profile_id)
        .ok_or_else(|| format!("未找到配置档案: {}", profile_id))?
        .clone();

    // 只更新 settings.json 中的 API 相关环境变量
    let mut updates = std::collections::HashMap::new();
    updates.insert("ANTHROPIC_AUTH_TOKEN".to_string(), profile.api_key);
    updates.insert("ANTHROPIC_BASE_URL".to_string(), profile.base_url);
    update_env_vars(updates)?;

    // 更新 active profile
    profiles.active_profile_id = Some(profile_id);
    write_api_profiles(profiles)?;

    Ok(())
}

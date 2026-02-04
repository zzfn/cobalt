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

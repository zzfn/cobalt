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

/// 读取 settings.json（保留所有字段）
#[tauri::command]
pub fn read_settings() -> Result<serde_json::Value, String> {
    let settings_path = get_claude_dir()?.join("settings.json");

    if !settings_path.exists() {
        return Ok(serde_json::json!({
            "permissions": {
                "allow": [],
                "deny": []
            },
            "env": {}
        }));
    }

    let content = fs::read_to_string(&settings_path)
        .map_err(|e| format!("读取 settings.json 失败: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("解析 settings.json 失败: {}", e))
}

/// 写入 settings.json（保留所有字段）
#[tauri::command]
pub fn write_settings(settings: serde_json::Value) -> Result<(), String> {
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

    // 读取现有配置为 Value，保留所有字段
    let mut settings_value: serde_json::Value = if settings_path.exists() {
        let content = fs::read_to_string(&settings_path)
            .map_err(|e| format!("读取 settings.json 失败: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("解析 settings.json 失败: {}", e))?
    } else {
        serde_json::json!({
            "permissions": {
                "allow": [],
                "deny": []
            },
            "env": {}
        })
    };

    // 确保 env 对象存在
    if settings_value.get("env").is_none() {
        settings_value["env"] = serde_json::json!({});
    }

    // 只更新指定的环境变量
    if let Some(env) = settings_value.get_mut("env").and_then(|v| v.as_object_mut()) {
        for (key, value) in updates {
            env.insert(key, serde_json::Value::String(value));
        }
    }

    // 写回配置
    let content = serde_json::to_string_pretty(&settings_value)
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

/// 清除 API 配置（使用官方默认）
#[tauri::command]
pub fn clear_api_config() -> Result<(), String> {
    let settings_path = get_claude_dir()?.join("settings.json");

    // 读取现有配置为 Value，保留所有字段
    let mut settings_value: serde_json::Value = if settings_path.exists() {
        let content = fs::read_to_string(&settings_path)
            .map_err(|e| format!("读取 settings.json 失败: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("解析 settings.json 失败: {}", e))?
    } else {
        return Ok(());
    };

    // 从 env 中移除 API 相关环境变量
    if let Some(env) = settings_value.get_mut("env").and_then(|v| v.as_object_mut()) {
        env.remove("ANTHROPIC_AUTH_TOKEN");
        env.remove("ANTHROPIC_BASE_URL");
    }

    // 写回配置
    let content = serde_json::to_string_pretty(&settings_value)
        .map_err(|e| format!("序列化 settings 失败: {}", e))?;

    fs::write(&settings_path, content).map_err(|e| format!("写入 settings.json 失败: {}", e))?;

    // 清除 active profile
    let mut profiles = read_api_profiles()?;
    profiles.active_profile_id = None;
    write_api_profiles(profiles)?;

    Ok(())
}

/// 对话记录
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationRecord {
    pub id: String,
    pub display: String,
    pub timestamp: i64,
    pub project: Option<String>,
}

/// 读取对话历史记录
#[tauri::command]
pub fn read_conversation_history(limit: Option<usize>) -> Result<Vec<ConversationRecord>, String> {
    let history_path = get_claude_dir()?.join("history.jsonl");

    if !history_path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&history_path)
        .map_err(|e| format!("读取 history.jsonl 失败: {}", e))?;

    let limit = limit.unwrap_or(50);
    let mut records = Vec::new();

    for (index, line) in content.lines().rev().enumerate() {
        if index >= limit {
            break;
        }

        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let json_value: serde_json::Value = serde_json::from_str(line)
            .map_err(|e| format!("解析 history.jsonl 行失败: {}", e))?;

        let record = ConversationRecord {
            id: format!("conv_{}", index),
            display: json_value["display"].as_str().unwrap_or("").to_string(),
            timestamp: json_value["timestamp"].as_i64().unwrap_or(0),
            project: json_value["project"].as_str().map(|s| s.to_string()),
        };

        records.push(record);
    }

    Ok(records)
}

/// 环境变量冲突信息
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EnvConflict {
    pub key: String,
    pub shell_file: String,
    pub line_number: usize,
    pub line_content: String,
}

/// 获取 shell 配置文件路径列表
fn get_shell_config_files() -> Vec<PathBuf> {
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return Vec::new(),
    };

    let mut files = Vec::new();

    // 常见的 shell 配置文件
    let config_files = [
        ".zshrc",
        ".bashrc",
        ".bash_profile",
        ".profile",
        ".zprofile",
        ".zshenv",
    ];

    for filename in config_files {
        let path = home.join(filename);
        if path.exists() {
            files.push(path);
        }
    }

    files
}

/// 检测 shell 配置文件中的环境变量冲突
#[tauri::command]
pub fn detect_env_conflicts() -> Result<Vec<EnvConflict>, String> {
    let conflict_keys = [
        "ANTHROPIC_AUTH_TOKEN",
        "ANTHROPIC_BASE_URL",
        "ANTHROPIC_API_KEY",
    ];

    let mut conflicts = Vec::new();

    for config_file in get_shell_config_files() {
        let content = match fs::read_to_string(&config_file) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let filename = config_file
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| config_file.to_string_lossy().to_string());

        for (line_number, line) in content.lines().enumerate() {
            let trimmed = line.trim();

            // 跳过注释行
            if trimmed.starts_with('#') {
                continue;
            }

            // 检测 export 语句
            for key in &conflict_keys {
                // 匹配 export KEY= 或 export KEY ="value" 等格式
                let patterns = [
                    format!("export {}=", key),
                    format!("export {} =", key),
                    format!("export\t{}=", key),
                ];

                if patterns.iter().any(|p| trimmed.starts_with(p)) {
                    conflicts.push(EnvConflict {
                        key: key.to_string(),
                        shell_file: filename.clone(),
                        line_number: line_number + 1,
                        line_content: trimmed.to_string(),
                    });
                }
            }
        }
    }

    Ok(conflicts)
}

/// 删除 shell 配置文件中的环境变量
#[tauri::command]
pub fn remove_env_from_shell(conflicts: Vec<EnvConflict>) -> Result<Vec<String>, String> {
    let home = dirs::home_dir().ok_or_else(|| "无法获取用户主目录".to_string())?;
    let mut modified_files: Vec<String> = Vec::new();

    // 按文件分组冲突
    let mut file_conflicts: std::collections::HashMap<String, Vec<&EnvConflict>> =
        std::collections::HashMap::new();

    for conflict in &conflicts {
        file_conflicts
            .entry(conflict.shell_file.clone())
            .or_default()
            .push(conflict);
    }

    for (shell_file, file_conflict_list) in file_conflicts {
        let file_path = home.join(&shell_file);

        if !file_path.exists() {
            continue;
        }

        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("读取 {} 失败: {}", shell_file, e))?;

        // 收集需要删除的行号（转换为 0-indexed）
        let lines_to_remove: std::collections::HashSet<usize> = file_conflict_list
            .iter()
            .map(|c| c.line_number - 1)
            .collect();

        // 过滤掉需要删除的行
        let new_content: String = content
            .lines()
            .enumerate()
            .filter(|(i, _)| !lines_to_remove.contains(i))
            .map(|(_, line)| line)
            .collect::<Vec<_>>()
            .join("\n");

        // 确保文件末尾有换行符
        let final_content = if new_content.is_empty() || new_content.ends_with('\n') {
            new_content
        } else {
            format!("{}\n", new_content)
        };

        fs::write(&file_path, final_content)
            .map_err(|e| format!("写入 {} 失败: {}", shell_file, e))?;

        modified_files.push(shell_file);
    }

    Ok(modified_files)
}

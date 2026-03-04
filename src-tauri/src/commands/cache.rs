// 缓存管理命令
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;

/// 单项缓存信息
#[derive(Serialize)]
pub struct CacheItem {
    pub size_bytes: u64,
    pub file_count: u64,
    pub path: String,
}

/// 全部缓存信息
#[derive(Serialize)]
pub struct CacheInfo {
    pub conversations: CacheItem,
    pub backups: CacheItem,
    pub marketplace: CacheItem,
}

/// 清理结果
#[derive(Serialize)]
pub struct ClearCacheResult {
    pub cleared_bytes: u64,
    pub cleared_files: u64,
}

/// 消息预览
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MessagePreview {
    pub role: String,
    pub content_preview: String,
    pub timestamp: String,
}

/// 对话文件信息
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationFile {
    pub session_id: String,
    pub file_name: String,
    pub file_size: u64,
    pub modified_time: String,
    pub message_preview: Vec<MessagePreview>,
}

/// 项目对话信息
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectConversationInfo {
    pub project_name: String,
    pub project_path: String,
    pub file_count: u64,
    pub total_size: u64,
    pub files: Vec<ConversationFile>,
}

/// 递归计算目录大小和文件数
fn calc_dir_size(path: &PathBuf) -> (u64, u64) {
    let mut total_size: u64 = 0;
    let mut file_count: u64 = 0;

    if !path.exists() || !path.is_dir() {
        return (0, 0);
    }

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if entry_path.is_dir() {
                let (size, count) = calc_dir_size(&entry_path);
                total_size += size;
                file_count += count;
            } else if let Ok(metadata) = entry_path.metadata() {
                total_size += metadata.len();
                file_count += 1;
            }
        }
    }

    (total_size, file_count)
}

/// 获取 Claude 配置目录
fn get_claude_dir() -> Result<PathBuf, String> {
    dirs::home_dir()
        .map(|home| home.join(".claude"))
        .ok_or_else(|| "无法获取用户主目录".to_string())
}

/// 获取 Cobalt 数据目录
fn get_cobalt_dir() -> Result<PathBuf, String> {
    dirs::home_dir()
        .map(|home| home.join(".cobalt"))
        .ok_or_else(|| "无法获取用户主目录".to_string())
}

/// 获取各类缓存信息
#[tauri::command]
pub fn get_cache_info() -> Result<CacheInfo, String> {
    let claude_dir = get_claude_dir()?;
    let cobalt_dir = get_cobalt_dir()?;

    let conversations_path = claude_dir.join("projects");
    let backups_path = claude_dir.join("backups");
    let marketplace_path = cobalt_dir.join(".cache").join("marketplace");

    let (conv_size, conv_count) = calc_dir_size(&conversations_path);
    let (backup_size, backup_count) = calc_dir_size(&backups_path);
    let (market_size, market_count) = calc_dir_size(&marketplace_path);

    Ok(CacheInfo {
        conversations: CacheItem {
            size_bytes: conv_size,
            file_count: conv_count,
            path: conversations_path.to_string_lossy().to_string(),
        },
        backups: CacheItem {
            size_bytes: backup_size,
            file_count: backup_count,
            path: backups_path.to_string_lossy().to_string(),
        },
        marketplace: CacheItem {
            size_bytes: market_size,
            file_count: market_count,
            path: marketplace_path.to_string_lossy().to_string(),
        },
    })
}

/// 递归删除目录内容（保留目录本身）
fn clear_dir_contents(path: &PathBuf) -> Result<(u64, u64), String> {
    let mut cleared_bytes: u64 = 0;
    let mut cleared_files: u64 = 0;

    if !path.exists() || !path.is_dir() {
        return Ok((0, 0));
    }

    let entries = fs::read_dir(path)
        .map_err(|e| format!("读取目录失败: {}", e))?;

    for entry in entries.flatten() {
        let entry_path = entry.path();
        if entry_path.is_dir() {
            let (size, count) = calc_dir_size(&entry_path);
            cleared_bytes += size;
            cleared_files += count;
            fs::remove_dir_all(&entry_path)
                .map_err(|e| format!("删除目录失败 {}: {}", entry_path.display(), e))?;
        } else {
            if let Ok(metadata) = entry_path.metadata() {
                cleared_bytes += metadata.len();
            }
            cleared_files += 1;
            fs::remove_file(&entry_path)
                .map_err(|e| format!("删除文件失败 {}: {}", entry_path.display(), e))?;
        }
    }

    Ok((cleared_bytes, cleared_files))
}

/// 按类型清理缓存
#[tauri::command]
pub fn clear_cache(cache_type: String) -> Result<ClearCacheResult, String> {
    let claude_dir = get_claude_dir()?;
    let cobalt_dir = get_cobalt_dir()?;

    let mut total_bytes: u64 = 0;
    let mut total_files: u64 = 0;

    let types: Vec<&str> = if cache_type == "all" {
        vec!["conversations", "backups", "marketplace"]
    } else {
        vec![cache_type.as_str()]
    };

    for t in types {
        let path = match t {
            "conversations" => claude_dir.join("projects"),
            "backups" => claude_dir.join("backups"),
            "marketplace" => cobalt_dir.join(".cache").join("marketplace"),
            _ => return Err(format!("未知的缓存类型: {}", t)),
        };

        let (bytes, files) = clear_dir_contents(&path)?;
        total_bytes += bytes;
        total_files += files;
    }

    Ok(ClearCacheResult {
        cleared_bytes: total_bytes,
        cleared_files: total_files,
    })
}

/// 格式化项目名称（从路径中提取）
fn format_project_name(path: &PathBuf) -> String {
    path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("未知项目")
        .to_string()
}

/// 校验路径段，防止路径穿越（仅允许单段名称）
fn validate_safe_path_segment(value: &str, field_name: &str) -> Result<(), String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(format!("{} 不能为空", field_name));
    }
    if trimmed.contains('/') || trimmed.contains('\\') || trimmed.contains('\0') || trimmed.contains("..") {
        return Err(format!("{} 包含非法路径字符", field_name));
    }
    Ok(())
}

/// 提取内容预览（从 JSON 中提取有用的文本）
fn extract_content_preview(json: &Value) -> String {
    // 尝试从 message.content 中提取文本
    if let Some(content) = json.get("content").and_then(|c| c.as_array()) {
        for item in content {
            if let Some(obj) = item.as_object() {
                // 处理 text 类型
                if let Some(text) = obj.get("text").and_then(|t| t.as_str()) {
                    return text.chars().take(200).collect();
                }
                // 处理 thinking 类型
                if let Some(thinking) = obj.get("thinking").and_then(|t| t.as_str()) {
                    return thinking.chars().take(200).collect();
                }
            }
        }
    }
    // 如果没有找到 content，尝试其他字段
    if let Some(display) = json.get("display").and_then(|d| d.as_str()) {
        return display.chars().take(200).collect();
    }
    "[无法提取内容]".to_string()
}

/// 获取对话详情
#[tauri::command]
pub fn get_conversation_details() -> Result<Vec<ProjectConversationInfo>, String> {
    let claude_dir = get_claude_dir()?;
    let projects_path = claude_dir.join("projects");

    if !projects_path.exists() {
        return Ok(Vec::new());
    }

    let mut result = Vec::new();

    // 遍历项目目录
    let entries = fs::read_dir(&projects_path)
        .map_err(|e| format!("读取项目目录失败: {}", e))?;

    for entry in entries.flatten() {
        let project_path = entry.path();
        if !project_path.is_dir() {
            continue;
        }

        let project_name = format_project_name(&project_path);
        let mut files = Vec::new();
        let mut total_size: u64 = 0;

        // 读取项目目录下的所有 .jsonl 文件
        let file_entries = fs::read_dir(&project_path)
            .map_err(|e| format!("读取项目 {} 失败: {}", project_name, e))?;

        for file_entry in file_entries.flatten() {
            let file_path = file_entry.path();
            if !file_path.is_file() || file_path.extension().and_then(|e| e.to_str()) != Some("jsonl") {
                continue;
            }

            // 获取文件元数据（单个文件失败不中断整体）
            let metadata = match file_path.metadata() {
                Ok(m) => m,
                Err(e) => {
                    eprintln!("跳过文件 {}: {}", file_path.display(), e);
                    continue;
                }
            };
            let file_size = metadata.len();
            let modified_time = match metadata.modified()
                .map_err(|e| format!("{}", e))
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).map_err(|e| format!("{}", e)))
            {
                Ok(d) => d.as_secs(),
                Err(e) => {
                    eprintln!("跳过文件 {} 时间戳异常: {}", file_path.display(), e);
                    continue;
                }
            };

            // 提取会话 ID（文件名去掉扩展名）
            let session_id = file_path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string();
            let file_name = file_path.file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string();

            // 解析 jsonl 文件获取消息预览
            let message_preview = parse_message_preview(&file_path);

            files.push(ConversationFile {
                session_id,
                file_name,
                file_size,
                modified_time: modified_time.to_string(),
                message_preview,
            });

            total_size += file_size;
        }

        // 按修改时间排序（最新的在前）
        files.sort_by(|a, b| b.modified_time.cmp(&a.modified_time));

        if !files.is_empty() {
            result.push(ProjectConversationInfo {
                project_name,
                project_path: project_path.to_string_lossy().to_string(),
                file_count: files.len() as u64,
                total_size,
                files,
            });
        }
    }

    // 按项目名称排序
    result.sort_by(|a, b| a.project_name.cmp(&b.project_name));

    Ok(result)
}

/// 解析 jsonl 文件获取消息预览（最多 3 条）
/// 使用 BufReader 逐行读取，避免将大文件全部读入内存
fn parse_message_preview(file_path: &PathBuf) -> Vec<MessagePreview> {
    let mut previews = Vec::new();

    let file = match fs::File::open(file_path) {
        Ok(f) => f,
        Err(_) => return previews,
    };
    let reader = BufReader::new(file);

    // 只解析前 100 行以避免性能问题
    for line in reader.lines().take(100) {
        let line = match line {
            Ok(l) => l,
            Err(_) => continue,
        };
        let line = line.trim().to_string();
        if line.is_empty() {
            continue;
        }

        if let Ok(json) = serde_json::from_str::<Value>(&line) {
            // 检查是否是消息类型
            let message_type = json.get("type").and_then(|t| t.as_str()).unwrap_or("");

            // 只处理 user 和 assistant 消息
            if message_type == "user" || message_type == "assistant" {
                let role = message_type.to_string();
                let content_preview = extract_content_preview(&json);
                let timestamp = json.get("timestamp")
                    .and_then(|t| t.as_str())
                    .unwrap_or("")
                    .to_string();

                if !content_preview.is_empty() && content_preview != "[无法提取内容]" {
                    previews.push(MessagePreview {
                        role,
                        content_preview,
                        timestamp,
                    });

                    if previews.len() >= 3 {
                        break;
                    }
                }
            } else if let Some(message) = json.get("message") {
                // 处理嵌套的 message 对象（某些 jsonl 格式）
                if let Some(role) = message.get("role").and_then(|r| r.as_str()) {
                    let content_preview = extract_content_preview(message);
                    let timestamp = json.get("timestamp")
                        .and_then(|t| t.as_str())
                        .unwrap_or("")
                        .to_string();

                    if !content_preview.is_empty() && content_preview != "[无法提取内容]" {
                        previews.push(MessagePreview {
                            role: role.to_string(),
                            content_preview,
                            timestamp,
                        });

                        if previews.len() >= 3 {
                            break;
                        }
                    }
                }
            }
        }
    }

    previews
}

/// 清理对话记录结果
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClearConversationResult {
    pub cleared_files: u64,
    pub cleared_bytes: u64,
    pub affected_projects: Vec<String>,
}

/// 清理特定项目的对话记录
#[tauri::command]
pub fn clear_conversation(project_name: Option<String>, session_id: Option<String>) -> Result<ClearConversationResult, String> {
    let claude_dir = get_claude_dir()?;
    let projects_path = claude_dir.join("projects");

    if !projects_path.exists() {
        return Ok(ClearConversationResult {
            cleared_files: 0,
            cleared_bytes: 0,
            affected_projects: Vec::new(),
        });
    }

    let mut cleared_files: u64 = 0;
    let mut cleared_bytes: u64 = 0;
    let mut affected_projects = Vec::new();

    match (&project_name, &session_id) {
        (None, None) => {
            // 清理所有对话记录
            let entries = fs::read_dir(&projects_path)
                .map_err(|e| format!("读取项目目录失败: {}", e))?;

            for entry in entries.flatten() {
                let project_path = entry.path();
                if project_path.is_dir() {
                    let pname = format_project_name(&project_path);
                    if let Ok((files, bytes)) = clear_project_conversations(&project_path) {
                        if files > 0 {
                            cleared_files += files;
                            cleared_bytes += bytes;
                            affected_projects.push(pname);
                        }
                    }
                }
            }
        }
        (Some(pname), None) => {
            // 清理指定项目的所有对话
            validate_safe_path_segment(pname, "项目名称")?;
            let project_path = projects_path.join(pname);
            if project_path.exists() {
                if let Ok((files, bytes)) = clear_project_conversations(&project_path) {
                    cleared_files = files;
                    cleared_bytes = bytes;
                    if files > 0 {
                        affected_projects.push(pname.clone());
                    }
                }
            }
        }
        (Some(pname), Some(sid)) => {
            // 清理指定项目的指定会话文件
            validate_safe_path_segment(pname, "项目名称")?;
            validate_safe_path_segment(sid, "会话 ID")?;
            let project_path = projects_path.join(pname);
            if project_path.exists() {
                let file_path = project_path.join(format!("{}.jsonl", sid));
                if file_path.exists() {
                    if let Ok(metadata) = file_path.metadata() {
                        let size = metadata.len();
                        fs::remove_file(&file_path)
                            .map_err(|e| format!("删除文件失败 {}: {}", file_path.display(), e))?;
                        cleared_files = 1;
                        cleared_bytes = size;
                        affected_projects.push(pname.clone());
                    }
                }
            }
        }
        (None, Some(_)) => {
            return Err("指定会话 ID 时必须同时指定项目名称".to_string());
        }
    }

    // 尝试删除空的项目目录
    for pname in &affected_projects {
        let project_path = projects_path.join(pname);
        if project_path.exists() {
            if let Ok(mut entries) = fs::read_dir(&project_path) {
                if entries.next().is_none() {
                    let _ = fs::remove_dir(&project_path);
                }
            }
        }
    }

    Ok(ClearConversationResult {
        cleared_files,
        cleared_bytes,
        affected_projects,
    })
}

/// 清理指定项目的所有对话文件
fn clear_project_conversations(project_path: &PathBuf) -> Result<(u64, u64), String> {
    let mut cleared_files: u64 = 0;
    let mut cleared_bytes: u64 = 0;

    let entries = fs::read_dir(project_path)
        .map_err(|e| format!("读取项目目录失败: {}", e))?;

    for entry in entries.flatten() {
        let file_path = entry.path();
        if file_path.is_file() && file_path.extension().and_then(|e| e.to_str()) == Some("jsonl") {
            if let Ok(metadata) = file_path.metadata() {
                let size = metadata.len();
                fs::remove_file(&file_path)
                    .map_err(|e| format!("删除文件失败 {}: {}", file_path.display(), e))?;
                cleared_files += 1;
                cleared_bytes += size;
            }
        }
    }

    Ok((cleared_files, cleared_bytes))
}
